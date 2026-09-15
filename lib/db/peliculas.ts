/**
 * Capa de datos de Película (H6): alta, listado, edición y baja de cartelera.
 *
 * La baja es lógica y no física, por la misma razón que la de Sala: una
 * película con funciones pasadas está referenciada por Entradas y Compras, y
 * borrarla de verdad se llevaría puesto el historial de ventas. `darDeBaja`
 * solo marca `bajaEn`, y a partir de ahí la película deja de aparecer en el
 * listado y en la cartelera pública (`listarCartelera`) y no admite funciones
 * nuevas (`crearFuncion` la rechaza con 409), pero sus funciones pasadas y las
 * compras que las tienen siguen intactas.
 *
 * Dada de baja, una película queda fuera de alcance también para el PATCH y
 * para otra baja: las dos responden 404, igual que si no existiera. No hay
 * endpoint para reponerla en cartelera —el spec no lo pide—; el día que haga
 * falta es poner `bajaEn` en null.
 */
import { Prisma } from "@prisma/client";

import { detalleDeFuncionesQueImpiden, funcionesQueImpidenBaja, UN_MINUTO_EN_MS } from "@/lib/bajas";
import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";
import type {
  ActualizarPeliculaInput,
  CrearPeliculaInput,
  PeliculasQuery,
} from "@/lib/schemas/pelicula";

/** Código de Prisma para "no encontré la fila que pediste actualizar". */
const REGISTRO_NO_ENCONTRADO = "P2025";

/**
 * Lo único que sale de esta capa hacia afuera. `bajaEn` no está: todo lo que
 * devuelven estas funciones son películas en cartelera, así que el campo sería
 * siempre null y no le diría nada a quien lee la respuesta.
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
 * Listado de películas en cartelera. Las dadas de baja quedan afuera: siguen
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
 * Edita una película. El `bajaEn: null` va dentro del `where` y no en un
 * `findUnique` previo a propósito: así el "existe y está en cartelera" y la
 * escritura son la misma operación, y no hay ventana entre las dos para que
 * alguien la dé de baja en el medio. Prisma responde P2025 cuando ninguna fila
 * matchea —no existe, o ya está dada de baja— y las dos se traducen al mismo
 * 404: una película fuera de cartelera no es editable.
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
      throw new ErrorNoEncontrado(`No se encontró la película con id ${id}`);
    }

    throw error;
  }
}

/**
 * Saca una película de cartelera (H6).
 *
 * No se puede dar de baja si tiene funciones que todavía no terminaron: la
 * gente ya compró entradas para verla. "Todavía no terminó" no es una columna
 * —el fin de una función sale de `inicio` más la duración de la película—,
 * pero acá esa duración se conoce, así que la ventana ya es exacta y el
 * filtro de la consulta (`inicio: { gte: desde }`) no es una aproximación
 * como en `eliminarSalaLogico`: coincide exactamente con la regla de
 * `funcionesQueImpidenBaja`, en lib/bajas.ts.
 */
export async function darDeBajaPelicula(id: string) {
  const pelicula = await prisma.pelicula.findUnique({
    where: { id },
    select: { id: true, titulo: true, duracionMinutos: true, bajaEn: true },
  });

  if (!pelicula || pelicula.bajaEn !== null) {
    throw new ErrorNoEncontrado(`No se encontró la película con id ${id}`);
  }

  const desde = new Date(Date.now() - pelicula.duracionMinutos * UN_MINUTO_EN_MS);
  const candidatas = await prisma.funcion.findMany({
    where: { peliculaId: id, inicio: { gte: desde } },
    select: { id: true, inicio: true },
  });

  const funciones = candidatas.map((funcion) => ({
    id: funcion.id,
    titulo: pelicula.titulo,
    inicio: funcion.inicio,
    duracionMinutos: pelicula.duracionMinutos,
  }));

  const funcionesQueImpiden = funcionesQueImpidenBaja(funciones, new Date());

  if (funcionesQueImpiden.length > 0) {
    throw new ErrorDeConflicto(
      `No se puede sacar de cartelera "${pelicula.titulo}" porque tiene funciones en curso o ` +
        `programadas: ${detalleDeFuncionesQueImpiden(funcionesQueImpiden)}. Hay que esperar a ` +
        `que terminen o darlas de baja primero.`,
    );
  }

  await prisma.pelicula.update({
    where: { id },
    data: { bajaEn: new Date() },
  });
}
