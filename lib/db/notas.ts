/**
 * Acceso a datos de la entidad Nota.
 *
 * Este archivo es el EJEMPLO del patrón que sigue todo el proyecto:
 * ningún componente ni Route Handler habla con Prisma directamente,
 * todos pasan por un módulo de `lib/db/`.
 *
 * Por qué: si mañana cambia la consulta, se cambia en un solo lugar; y
 * cuando algo anda lento, se sabe exactamente dónde mirar.
 */
import { prisma } from "@/lib/db/client";
import type { CrearNotaInput } from "@/lib/schemas/nota";

const LIMITE_POR_DEFECTO = 50;

export async function listarNotas(limite: number = LIMITE_POR_DEFECTO) {
  // Toda consulta que devuelve listas lleva límite explícito.
  return prisma.nota.findMany({
    take: limite,
    orderBy: { creadaEn: "desc" },
    select: {
      id: true,
      titulo: true,
      contenido: true,
      creadaEn: true,
      autor: { select: { id: true, nombre: true } },
    },
  });
}

export async function obtenerNota(id: string) {
  return prisma.nota.findUnique({ where: { id } });
}

export async function crearNota(datos: CrearNotaInput, autorId: string) {
  // `autorId` se recibe por parámetro y sale de la sesión del servidor,
  // nunca del body del request: el cliente no decide de quién es la nota.
  return prisma.nota.create({
    data: { ...datos, autorId },
  });
}
