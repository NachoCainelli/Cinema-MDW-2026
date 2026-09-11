/**
 * Capa de datos de Función (H3): creación, cartelera pública y butacas con su
 * estado calculado.
 *
 * La regla de solapamiento vive en `lib/cartelera.ts` como función pura. No se
 * puede validar con Zod porque depende de las funciones ya guardadas: acá se
 * consultan, se le pasan a la regla y su veredicto se traduce a un error.
 */
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

const UN_MINUTO_EN_MS = 60 * 1000;

/**
 * Tope de funciones que se revisan al buscar un solapamiento. La ventana que
 * se consulta cubre a lo sumo la duración máxima de una película más la nueva
 * función: en una sola sala no entran ni cerca de 100 funciones en ese rato.
 */
const MAXIMO_FUNCIONES_A_REVISAR = 100;

/** Tope de butacas de una sala: `crearSalaSchema` no admite más de 30x30. */
const MAXIMO_BUTACAS_POR_SALA = 900;

const camposDeFuncion = {
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

function horario(fecha: Date) {
  return fecha.toISOString();
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
      `La sala ${sala.nombre} ya tiene la función de "${enConflicto.titulo}" a las ` +
        `${horario(enConflicto.inicio)} (${enConflicto.duracionMinutos} min). Entre una función ` +
        `y la siguiente tienen que quedar al menos ${MARGEN_ENTRE_FUNCIONES_MINUTOS} minutos`,
    );
  }

  return prisma.funcion.create({
    data: { inicio: datos.inicio, peliculaId: pelicula.id, salaId: sala.id },
    select: camposDeFuncion,
  });
}

/**
 * Cartelera pública: solo lo que alguien puede ir a ver hoy. Quedan afuera las
 * funciones que ya empezaron, las de salas eliminadas y las de películas dadas
 * de baja —las tres siguen existiendo para el historial (H5 y H6), pero no se
 * publican.
 */
export async function listarCartelera({ limite }: CarteleraQuery) {
  return prisma.funcion.findMany({
    where: {
      inicio: { gte: new Date() },
      sala: { eliminadaEn: null },
      pelicula: { bajaEn: null },
    },
    select: camposDeFuncion,
    orderBy: { inicio: "asc" },
    take: limite,
  });
}

/**
 * Butacas de la sala de una función, con su estado para *esa* función.
 *
 * Libre u ocupada no es un atributo de Butaca (sección 3 del spec): se calcula
 * mirando si hay una Entrada de una Compra `PAGADA` para esa butaca en esa
 * función. La misma butaca puede estar ocupada en una función y libre en la
 * siguiente.
 */
export async function listarButacasDeFuncion(funcionId: string) {
  const funcion = await prisma.funcion.findUnique({
    where: { id: funcionId },
    select: camposDeFuncion,
  });
  if (!funcion) throw new ErrorNoEncontrado("No existe la función indicada");

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

  const ocupadas = new Set(vendidas.map((entrada) => entrada.butacaId));

  return {
    funcion,
    butacas: butacas.map((butaca) => ({ ...butaca, ocupada: ocupadas.has(butaca.id) })),
  };
}
