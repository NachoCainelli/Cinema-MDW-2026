/**
 * Capa de datos de Pelicula (H6): alta, listado, edicion y baja de cartelera.
 *
 * La baja es logica y no fisica, por la misma razon que la de Sala: una
 * pelicula con funciones pasadas esta referenciada por Entradas y Compras, y
 * borrarla de verdad se llevaria puesto el historial de ventas. `darDeBaja`
 * solo marca `bajaEn`, y a partir de ahi la pelicula deja de aparecer en el
 * listado y en la cartelera publica (`listarCartelera`) y no admite funciones
 * nuevas (`crearFuncion` la rechaza con 409), pero sus funciones pasadas y las
 * compras que las tienen siguen intactas.
 *
 * Dada de baja, una pelicula queda fuera de alcance tambien para el PATCH y
 * para otra baja: las dos responden 404, igual que si no existiera. No hay
 * endpoint para reponerla en cartelera —el spec no lo pide—; el dia que haga
 * falta es poner `bajaEn` en null.
 */
import { Prisma } from "@prisma/client";

import {
  detalleDeFuncionesQueImpiden,
  funcionesQueImpidenBaja,
  MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA,
  UN_MINUTO_EN_MS,
} from "@/lib/bajas";
import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";
import type {
  ActualizarPeliculaInput,
  CrearPeliculaInput,
  PeliculasQuery,
} from "@/lib/schemas/pelicula";

/** Codigo de Prisma para "no encontre la fila que pediste actualizar". */
const REGISTRO_NO_ENCONTRADO = "P2025";

/**
 * Lo unico que sale de esta capa hacia afuera. `bajaEn` no esta: todo lo que
 * devuelven estas funciones son peliculas en cartelera, asi que el campo seria
 * siempre null y no le diria nada a quien lee la respuesta.
 */
const camposPublicos = {
  id: true,
  titulo: true,
  sinopsis: true,
  duracionMinutos: true,
  clasificacion: true,
  categoria: true,
  imagenUrl: true,
  creadaEn: true,
} as const;

export async function crearPelicula(datos: CrearPeliculaInput) {
  return prisma.pelicula.create({ data: datos, select: camposPublicos });
}

/**
 * Listado de peliculas en cartelera. Las dadas de baja quedan afuera: siguen
 * en la base para el historial, pero no se listan.
 */
export async function listarPeliculas({ limite }: PeliculasQuery) {
  return prisma.pelicula.findMany({
    where: { bajaEn: null },
    select: camposPublicos,
    orderBy: { titulo: "asc" },
    take: limite,
  });
}

/**
 * Edita una pelicula. El `bajaEn: null` va dentro del `where` y no en un
 * `findUnique` previo a proposito: asi el "existe y esta en cartelera" y la
 * escritura son la misma operacion, y no hay ventana entre las dos para que
 * alguien la de de baja en el medio. Prisma responde P2025 cuando ninguna fila
 * matchea —no existe, o ya esta dada de baja— y las dos se traducen al mismo
 * 404: una pelicula fuera de cartelera no es editable.
 */
export async function actualizarPelicula(id: string, datos: ActualizarPeliculaInput) {
  try {
    return await prisma.pelicula.update({
      where: { id, bajaEn: null },
      data: datos,
      select: camposPublicos,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === REGISTRO_NO_ENCONTRADO
    ) {
      throw new ErrorNoEncontrado(`No se encontro la pelicula con id ${id}`);
    }

    throw error;
  }
}

/**
 * Saca una pelicula de cartelera (H6).
 *
 * No se puede dar de baja si tiene funciones que todavia no terminaron: la
 * gente ya compro entradas para verla. "Todavia no termino" no es una columna
 * —el fin de una funcion sale de `inicio` mas la duracion de la pelicula—,
 * y aca esa duracion se conoce de antemano (es la misma para todas las
 * funciones de esta pelicula), asi que el filtro `inicio: { gte: desde }` de
 * la consulta es mas ajustado que el de `eliminarSalaLogico` -no usa un
 * techo, usa la duracion real-, aunque sigue siendo una cota inferior nada
 * mas: la regla exacta la aplica `funcionesQueImpidenBaja`, en lib/bajas.ts.
 *
 * Hacia el futuro no hay cota superior (una funcion programada a meses vista
 * igual impide la baja), asi que sin `take` la consulta traeria toda la
 * cartelera futura de la pelicula. `orderBy: { inicio: "asc" }` + `take`
 * (mismo patron que `funcionesQuePuedenSolapar` en lib/db/funciones.ts) la
 * acota a las funciones mas proximas. Se pide una de mas (+1) para poder
 * avisar "mas de N" en el mensaje sin tener que contar aparte.
 */
export async function darDeBajaPelicula(id: string) {
  const pelicula = await prisma.pelicula.findUnique({
    where: { id },
    select: { id: true, titulo: true, duracionMinutos: true, bajaEn: true },
  });

  if (!pelicula || pelicula.bajaEn !== null) {
    throw new ErrorNoEncontrado(`No se encontro la pelicula con id ${id}`);
  }

  const desde = new Date(Date.now() - pelicula.duracionMinutos * UN_MINUTO_EN_MS);
  const candidatas = await prisma.funcion.findMany({
    where: { peliculaId: id, inicio: { gte: desde } },
    select: { id: true, inicio: true },
    orderBy: { inicio: "asc" },
    take: MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA + 1,
  });

  const funciones = candidatas.map((funcion) => ({
    id: funcion.id,
    titulo: pelicula.titulo,
    inicio: funcion.inicio,
    duracionMinutos: pelicula.duracionMinutos,
  }));

  const impedimentos = funcionesQueImpidenBaja(funciones, new Date());

  if (impedimentos.length > 0) {
    const huboMas = impedimentos.length > MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA;
    const impedimentosAMostrar = huboMas
      ? impedimentos.slice(0, MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA)
      : impedimentos;

    throw new ErrorDeConflicto(
      `No se puede sacar de cartelera "${pelicula.titulo}" porque tiene funciones en curso o ` +
        `programadas: ${detalleDeFuncionesQueImpiden(impedimentosAMostrar, huboMas)}. Hay que ` +
        `esperar a que terminen o darlas de baja primero.`,
    );
  }

  await prisma.pelicula.update({
    where: { id },
    data: { bajaEn: new Date() },
  });
}
