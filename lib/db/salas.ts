/**
 * Capa de datos de Sala (H2): alta con generacion de butacas, listado y
 * borrado logico.
 *
 * El borrado es logico y no fisico: una sala con funciones pasadas esta
 * referenciada por Entradas y Compras (el historial de ventas, H5/H6).
 * Borrarla de verdad se llevaria puesto ese historial, asi que
 * `eliminarSalaLogico` solo marca `eliminadaEn` y todas las lecturas filtran
 * por `eliminadaEn: null`.
 *
 * Consecuencia sobre el nombre: `Sala.nombre` es `@unique` a nivel base y el
 * borrado logico no lo toca, asi que el nombre de una sala eliminada queda
 * reservado para siempre. Es a proposito —ese nombre sigue vivo en los
 * reportes historicos y renombrarlo al borrar ensuciaria el dato—. `crearSala`
 * lo comunica con un 409 que aclara que la sala en conflicto puede estar
 * eliminada.
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
import { DURACION_MAXIMA_MINUTOS } from "@/lib/schemas/pelicula";
import type { CrearSalaInput, SalasQuery } from "@/lib/schemas/sala";

/** Lo unico que sale de esta capa hacia afuera. */
const camposPublicos = {
  id: true,
  nombre: true,
  filas: true,
  columnas: true,
  creadaEn: true,
} as const;

/** Codigo de Prisma para "violaste una restriccion de unicidad". */
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
  // requests con el mismo nombre y los dos lo verian libre. La restriccion
  // `@unique` de `Sala.nombre` es la unica que no se puede ganar por carrera.
  // Mismo patron que `registrarUsuario` en lib/db/usuarios.ts.
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
    throw new ErrorNoEncontrado(`No se encontro la sala con id ${id}`);
  }

  // Las funciones de una sala pueden ser de peliculas distintas, cada una con
  // su propia duracion, asi que `desde` sigue usando el techo de duracion
  // maxima como filtro de performance: cualquier funcion que arranco hace mas
  // que la pelicula mas larga posible ya termino seguro. Es una
  // sobre-aproximacion segura (trae de mas, nunca de menos), no la regla
  // final -esa la aplica despues `funcionesQueImpidenBaja`, en lib/bajas.ts,
  // la misma que usa `darDeBajaPelicula` en lib/db/peliculas.ts-.
  //
  // Hacia el futuro no hay cota superior en el `where` (una funcion futura,
  // por lejana que este, siempre impide la baja), asi que sin `take` la
  // consulta traeria toda la cartelera programada de la sala. `orderBy:
  // { inicio: "asc" }` + `take` (mismo patron que `funcionesQuePuedenSolapar`
  // en lib/db/funciones.ts) la acota a las funciones mas proximas, que son
  // justo las que le sirven al gestor para decidir que hacer. Se pide una de
  // mas (+1) solo para poder avisar "mas de N" en el mensaje sin tener que
  // contar aparte.
  const desde = new Date(Date.now() - DURACION_MAXIMA_MINUTOS * UN_MINUTO_EN_MS);
  const candidatas = await prisma.funcion.findMany({
    where: { salaId: id, inicio: { gte: desde } },
    select: {
      id: true,
      inicio: true,
      pelicula: { select: { titulo: true, duracionMinutos: true } },
    },
    orderBy: { inicio: "asc" },
    take: MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA + 1,
  });

  const funciones = candidatas.map((funcion) => ({
    id: funcion.id,
    titulo: funcion.pelicula.titulo,
    inicio: funcion.inicio,
    duracionMinutos: funcion.pelicula.duracionMinutos,
  }));

  const impedimentos = funcionesQueImpidenBaja(funciones, new Date());

  if (impedimentos.length > 0) {
    const huboMas = impedimentos.length > MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA;
    const impedimentosAMostrar = huboMas
      ? impedimentos.slice(0, MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA)
      : impedimentos;

    throw new ErrorDeConflicto(
      `No se puede eliminar la sala "${sala.nombre}" porque tiene funciones en curso o ` +
        `programadas: ${detalleDeFuncionesQueImpiden(impedimentosAMostrar, huboMas)}.`,
    );
  }

  await prisma.sala.update({
    where: { id },
    data: { eliminadaEn: new Date() },
  });
}
