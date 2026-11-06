/**
 * Capa de datos de Función (H3): creación, cartelera pública y butacas con su
 * estado calculado.
 *
 * La regla de solapamiento vive en `lib/cartelera.ts` como función pura. No se
 * puede validar con Zod porque depende de las funciones ya guardadas: acá se
 * consultan, se le pasan a la regla y su veredicto se traduce a un error.
 */
import type { Prisma } from "@prisma/client";

import { veredictoDeButacas } from "@/lib/butacas";
import {
  finConMargen,
  funcionesEnConflicto,
  MARGEN_ENTRE_FUNCIONES_MINUTOS,
  type Franja,
  type FuncionProgramada,
} from "@/lib/cartelera";
import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";
import type { CarteleraQuery, CrearFuncionInput } from "@/lib/schemas/funcion";
import { DURACION_MAXIMA_MINUTOS } from "@/lib/schemas/pelicula";
import { formatearFecha } from "@/lib/utils";

const UN_MINUTO_EN_MS = 60 * 1000;

/**
 * Tope de funciones que se revisan al buscar un solapamiento. La ventana que
 * se consulta cubre a lo sumo la duración máxima de una película más la nueva
 * función: en una sola sala no entran ni cerca de 100 funciones en ese rato.
 */
const MAXIMO_FUNCIONES_A_REVISAR = 100;

/** Tope de butacas de una sala: `crearSalaSchema` no admite más de 30x30. */
const MAXIMO_BUTACAS_POR_SALA = 900;

/**
 * Campos que devuelve `crearFuncion` al gestor que acaba de publicar la
 * función (POST /api/funciones, protegido con GESTOR_CARTELERA).
 *
 * A propósito NO es el mismo objeto que `camposDeFuncionPublicos`, aunque hoy
 * tengan los mismos campos: son dos audiencias distintas (un gestor
 * autenticado vs. cualquiera en internet) y dos decisiones distintas, aunque
 * coincidan por ahora. Si el día de mañana el gestor necesita ver acá un dato
 * más (por ejemplo algo interno de programación), agregarlo en este `select`
 * no tiene que implicar publicarlo también en la cartelera — y si compartieran
 * el mismo objeto, lo publicaría sin que nadie lo decidiera.
 */
const camposDeFuncionParaGestor = {
  id: true,
  inicio: true,
  pelicula: {
    select: {
      id: true,
      titulo: true,
      duracionMinutos: true,
      clasificacion: true,
      categoria: true,
      imagenUrl: true,
    },
  },
  sala: { select: { id: true, nombre: true } },
} as const;

/**
 * Campos públicos de una función: lo que ve cualquiera, sin sesión, en la
 * cartelera (`listarCartelera`) y en el detalle de butacas
 * (`listarButacasDeFuncion`). Es la respuesta a la pregunta "¿qué se puede
 * ver sin sesión?", campo por campo:
 * - `id`, `inicio`: hacen falta para armar el link a la función y para
 *   ordenar/mostrar el horario. Sin dato sensible.
 * - `pelicula.titulo`, `duracionMinutos`, `clasificacion`, `categoria`,
 *   `imagenUrl`: es la tarjeta de la película en la cartelera — exactamente
 *   lo que un cine publica en su vidriera. `pelicula.id` hace falta para
 *   pedir después el detalle de esa película si hiciera falta.
 * - `sala.id`, `sala.nombre`: para mostrar en qué sala es. Filas y columnas
 *   de la sala NO se incluyen: no aportan nada a alguien mirando la
 *   cartelera, y la capacidad ya se puede inferir de sobra por la cantidad de
 *   butacas que devuelve `listarButacasDeFuncion`.
 * No hay ningún dato de gestión (quién la creó, cuándo, notas internas) ni de
 * negocio (recaudación, etc.): esta entidad no los tiene, pero si algún día
 * los tuviera, tendrían que agregarse en `camposDeFuncionParaGestor`, nunca
 * acá, sin pasar antes por esta lista.
 */
const camposDeFuncionPublicos = {
  id: true,
  inicio: true,
  pelicula: {
    select: {
      id: true,
      titulo: true,
      duracionMinutos: true,
      clasificacion: true,
      categoria: true,
      imagenUrl: true,
    },
  },
  sala: { select: { id: true, nombre: true } },
} as const;

/**
 * Funciones de la sala que podrían pisarse con `nueva`.
 *
 * La consulta acota por `inicio` porque es lo único que la base sabe comparar
 * —el fin de una función no es una columna, sale de la duración de su
 * película—. Hacia atrás se descarta todo lo que arrancó antes de que la
 * película más larga posible pudiera seguir en curso; el solapamiento real se
 * decide después, con la duración de cada una.
 */
async function funcionesQuePuedenSolapar(
  salaId: string,
  nueva: Franja,
): Promise<FuncionProgramada[]> {
  const desde = new Date(
    nueva.inicio.getTime() -
      (DURACION_MAXIMA_MINUTOS + MARGEN_ENTRE_FUNCIONES_MINUTOS) * UN_MINUTO_EN_MS,
  );
  const hasta = new Date(finConMargen(nueva));

  const funciones = await prisma.funcion.findMany({
    where: { salaId, inicio: { gte: desde, lte: hasta } },
    select: {
      id: true,
      inicio: true,
      pelicula: { select: { titulo: true, duracionMinutos: true } },
    },
    orderBy: { inicio: "asc" },
    take: MAXIMO_FUNCIONES_A_REVISAR,
  });

  return funciones.map((funcion) => ({
    id: funcion.id,
    inicio: funcion.inicio,
    titulo: funcion.pelicula.titulo,
    duracionMinutos: funcion.pelicula.duracionMinutos,
  }));
}

/**
 * Crea una función (H3). La fecha en el pasado ya la rechazó el schema; acá
 * quedan las reglas que necesitan mirar la base.
 *
 * El chequeo de solapamiento y el `create` no son atómicos: dos gestores
 * creando funciones pisadas en la misma sala en el mismo instante podrían
 * pasar los dos. Es una carrera muy poco probable (una sola persona programa
 * la cartelera) y la base no tiene cómo expresar esta restricción con un
 * `@unique`; si hiciera falta cerrarla, va con un bloqueo sobre la sala.
 */
export async function crearFuncion(datos: CrearFuncionInput) {
  const pelicula = await prisma.pelicula.findUnique({
    where: { id: datos.peliculaId },
    select: { id: true, titulo: true, duracionMinutos: true, bajaEn: true },
  });
  if (!pelicula) throw new ErrorNoEncontrado("No existe la película indicada");
  if (pelicula.bajaEn) {
    throw new ErrorDeConflicto(
      `La película "${pelicula.titulo}" está fuera de cartelera: no admite funciones nuevas`,
    );
  }

  const sala = await prisma.sala.findUnique({
    where: { id: datos.salaId },
    select: { id: true, nombre: true, eliminadaEn: true },
  });
  if (!sala) throw new ErrorNoEncontrado("No existe la sala indicada");
  if (sala.eliminadaEn) {
    throw new ErrorDeConflicto(
      `La sala ${sala.nombre} está eliminada: no admite funciones nuevas`,
    );
  }

  const nueva: Franja = { inicio: datos.inicio, duracionMinutos: pelicula.duracionMinutos };
  const candidatas = await funcionesQuePuedenSolapar(sala.id, nueva);
  // Las candidatas vienen ordenadas por inicio: el mensaje nombra la primera
  // que se pisa, igual que antes de que la regla devolviera todas.
  const [enConflicto] = funcionesEnConflicto(nueva, candidatas);

  if (enConflicto) {
    throw new ErrorDeConflicto(
      `La sala ${sala.nombre} ya tiene la función de "${enConflicto.titulo}" el ` +
        `${formatearFecha(enConflicto.inicio)} (${enConflicto.duracionMinutos} min). Entre una función ` +
        `y la siguiente tienen que quedar al menos ${MARGEN_ENTRE_FUNCIONES_MINUTOS} minutos`,
    );
  }

  return prisma.funcion.create({
    data: { inicio: datos.inicio, peliculaId: pelicula.id, salaId: sala.id },
    select: camposDeFuncionParaGestor,
  });
}

/**
 * Qué es una función publicada: una que todavía no empezó, de una sala
 * vigente y de una película en cartelera. Las otras siguen existiendo para el
 * historial (H5 y H6), pero no se publican. Es una función y no una constante
 * porque "todavía no empezó" se mide contra el momento de cada consulta.
 */
function funcionPublicada() {
  return {
    inicio: { gte: new Date() },
    sala: { eliminadaEn: null },
    pelicula: { bajaEn: null },
  } satisfies Prisma.FuncionWhereInput;
}

/**
 * Cartelera pública: solo lo que alguien puede ir a ver hoy (`funcionPublicada`).
 * Usa `camposDeFuncionPublicos`, no el que ve el gestor: ver el comentario de
 * esa constante.
 *
 * Filtra por título en la base (`q`, sin distinguir mayúsculas) y pagina de a
 * `limite`: la búsqueda tiene que llegar a cualquier función publicada, no
 * solo a las de la primera página. Pide una función de más para saber si hay
 * otra página sin contar todo el resultado; esa función extra no se devuelve.
 * El `id` desempata el orden: dos funciones a la misma hora en salas distintas
 * son lo normal, y sin un orden total podrían repetirse o perderse entre una
 * página y la siguiente.
 */
export async function listarCartelera({ q, pagina, limite }: CarteleraQuery) {
  const publicada = funcionPublicada();
  const where: Prisma.FuncionWhereInput = q
    ? {
        ...publicada,
        pelicula: { ...publicada.pelicula, titulo: { contains: q, mode: "insensitive" } },
      }
    : publicada;

  const funciones = await prisma.funcion.findMany({
    where,
    select: camposDeFuncionPublicos,
    orderBy: [{ inicio: "asc" }, { id: "asc" }],
    skip: (pagina - 1) * limite,
    take: limite + 1,
  });

  return { funciones: funciones.slice(0, limite), hayMas: funciones.length > limite };
}

/**
 * Butacas de la sala de una función, con su estado para *esa* función.
 *
 * Libre u ocupada no es un atributo de Butaca (sección 3 del spec): se calcula
 * mirando si hay una Entrada de una Compra `PAGADA` para esa butaca en esa
 * función. La misma butaca puede estar ocupada en una función y libre en la
 * siguiente. Endpoint público: la función que se devuelve acá usa
 * `camposDeFuncionPublicos`, igual que la cartelera.
 */
export async function listarButacasDeFuncion(funcionId: string) {
  const funcion = await prisma.funcion.findUnique({
    where: { id: funcionId },
    select: camposDeFuncionPublicos,
  });
  if (!funcion) throw new ErrorNoEncontrado("No existe la función indicada");

  return { funcion, butacas: await butacasConEstado(funcion) };
}

/**
 * Lo mismo que `listarButacasDeFuncion`, pero solo si la función está
 * publicada: es lo que muestra `/funciones/[id]`, la pantalla de compra. Una
 * función que ya empezó, o de una sala eliminada o una película dada de baja,
 * no está en la cartelera y tampoco se puede abrir por su dirección: responde
 * lo mismo que una que no existe.
 *
 * `GET /api/funciones/:id/butacas` sigue usando `listarButacasDeFuncion`, sin
 * este filtro: cambiarle el contrato no es parte de esta pantalla.
 */
export async function listarButacasDeFuncionPublicada(funcionId: string) {
  const funcion = await prisma.funcion.findFirst({
    where: { id: funcionId, ...funcionPublicada() },
    select: camposDeFuncionPublicos,
  });
  if (!funcion) throw new ErrorNoEncontrado("No existe la función indicada");

  return { funcion, butacas: await butacasConEstado(funcion) };
}

async function butacasConEstado(funcion: { id: string; sala: { id: string } }) {
  const [butacas, vendidas] = await Promise.all([
    prisma.butaca.findMany({
      where: { salaId: funcion.sala.id },
      select: { id: true, fila: true, columna: true },
      orderBy: [{ fila: "asc" }, { columna: "asc" }],
      take: MAXIMO_BUTACAS_POR_SALA,
    }),
    prisma.entrada.findMany({
      where: { funcionId: funcion.id, compra: { estado: "PAGADA" } },
      select: { butacaId: true },
      take: MAXIMO_BUTACAS_POR_SALA,
    }),
  ]);

  // Es la misma regla que usa la compra, con todas las butacas de la sala como
  // pedido: lo que el mapa pinta ocupado es lo que la compra rechazaría.
  const idsDeLaSala = butacas.map((butaca) => butaca.id);
  const { ocupadas } = veredictoDeButacas(
    idsDeLaSala,
    idsDeLaSala,
    vendidas.map((entrada) => entrada.butacaId),
  );
  const ocupadasPorId = new Set(ocupadas);

  return butacas.map((butaca) => ({ ...butaca, ocupada: ocupadasPorId.has(butaca.id) }));
}
