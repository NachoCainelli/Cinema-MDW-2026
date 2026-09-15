/**
 * Capa de datos de Sala (H2): alta con generación de butacas, listado y
 * borrado lógico.
 *
 * El borrado es lógico y no físico: una sala con funciones pasadas está
 * referenciada por Entradas y Compras (el historial de ventas, H5/H6).
 * Borrarla de verdad se llevaría puesto ese historial, así que
 * `eliminarSalaLogico` solo marca `eliminadaEn` y todas las lecturas filtran
 * por `eliminadaEn: null`.
 *
 * Consecuencia sobre el nombre: `Sala.nombre` es `@unique` a nivel base y el
 * borrado lógico no lo toca, así que el nombre de una sala eliminada queda
 * reservado para siempre. Es a propósito —ese nombre sigue vivo en los
 * reportes históricos y renombrarlo al borrar ensuciaría el dato—. `crearSala`
 * lo comunica con un 409 que aclara que la sala en conflicto puede estar
 * eliminada.
 */
import { Prisma } from "@prisma/client";

import { detalleDeFuncionesQueImpiden, funcionesQueImpidenBaja, UN_MINUTO_EN_MS } from "@/lib/bajas";
import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";
import { DURACION_MAXIMA_MINUTOS } from "@/lib/schemas/pelicula";
import type { CrearSalaInput, SalasQuery } from "@/lib/schemas/sala";

/** Lo único que sale de esta capa hacia afuera. */
const camposPublicos = {
  id: true,
  nombre: true,
  filas: true,
  columnas: true,
  creadaEn: true,
} as const;

/** Código de Prisma para "violaste una restricción de unicidad". */
const VIOLACION_DE_UNICIDAD = "P2002";

export async function crearSala(datos: CrearSalaInput) {
  const butacasACrear = [];
  for (let fila = 1; fila <= datos.filas; fila++) {
    for (let columna = 1; columna <= datos.columnas; columna++) {
      butacasACrear.push({ fila, columna });
    }
  }

  // El nombre duplicado se detecta por el error de la base y no con un
  // `findUnique` previo: entre el "no existe" y el `create` pueden entrar dos
  // requests con el mismo nombre y los dos lo verían libre. La restricción
  // `@unique` de `Sala.nombre` es la única que no se puede ganar por carrera.
  // Mismo patrón que `registrarUsuario` en lib/db/usuarios.ts.
  try {
    return await prisma.sala.create({
      data: {
        nombre: datos.nombre,
        filas: datos.filas,
        columnas: datos.columnas,
        butacas: { create: butacasACrear },
      },
      select: camposPublicos,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === VIOLACION_DE_UNICIDAD
    ) {
      throw new ErrorDeConflicto(
        `Ya existe una sala con el nombre "${datos.nombre}". Si fue eliminada, ` +
          `su nombre queda reservado y no se puede reutilizar.`,
      );
    }

    throw error;
  }
}

export async function listarSalas({ limite }: SalasQuery) {
  return prisma.sala.findMany({
    where: { eliminadaEn: null },
    select: camposPublicos,
    orderBy: { nombre: "asc" },
    take: limite,
  });
}

export async function eliminarSalaLogico(id: string) {
  const sala = await prisma.sala.findUnique({
    where: { id },
    select: { id: true, nombre: true, eliminadaEn: true },
  });

  if (!sala || sala.eliminadaEn !== null) {
    throw new ErrorNoEncontrado(`No se encontró la sala con id ${id}`);
  }

  // Las funciones de una sala pueden ser de películas distintas, cada una con
  // su propia duración, así que acá no se puede saber de antemano hasta
  // cuándo hay que traer funciones. Por eso la consulta a la base sigue
  // usando el techo de duración máxima como filtro de performance: cualquier
  // función que arrancó hace más que la película más larga posible ya
  // terminó seguro, y no hace falta traerla. Es una sobre-aproximación
  // segura (un superconjunto de las que realmente importan), no la regla
  // final. La regla exacta —por la duración real de cada película— la aplica
  // después `funcionesQueImpidenBaja`, la misma que usa `darDeBajaPelicula`
  // en lib/db/peliculas.ts.
  const desde = new Date(Date.now() - DURACION_MAXIMA_MINUTOS * UN_MINUTO_EN_MS);
  const candidatas = await prisma.funcion.findMany({
    where: { salaId: id, inicio: { gte: desde } },
    select: {
      id: true,
      inicio: true,
      pelicula: { select: { titulo: true, duracionMinutos: true } },
    },
  });

  const funciones = candidatas.map((funcion) => ({
    id: funcion.id,
    titulo: funcion.pelicula.titulo,
    inicio: funcion.inicio,
    duracionMinutos: funcion.pelicula.duracionMinutos,
  }));

  const funcionesQueImpiden = funcionesQueImpidenBaja(funciones, new Date());

  if (funcionesQueImpiden.length > 0) {
    throw new ErrorDeConflicto(
      `No se puede eliminar la sala "${sala.nombre}" porque tiene funciones en curso o ` +
        `programadas: ${detalleDeFuncionesQueImpiden(funcionesQueImpiden)}.`,
    );
  }

  await prisma.sala.update({
    where: { id },
    data: { eliminadaEn: new Date() },
  });
}
