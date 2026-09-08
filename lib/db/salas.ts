import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";
import type { CrearSalaInput } from "@/lib/schemas/sala";

export async function crearSala(datos: CrearSalaInput) {
  const existe = await prisma.sala.findUnique({
    where: { nombre: datos.nombre },
  });

  if (existe) {
    throw new ErrorDeConflicto(`Ya existe una sala con el nombre "${datos.nombre}"`);
  }

  const butacasToCreate = [];
  for (let fila = 1; fila <= datos.filas; fila++) {
    for (let columna = 1; columna <= datos.columnas; columna++) {
      butacasToCreate.push({ fila, columna });
    }
  }

  const sala = await prisma.sala.create({
    data: {
      nombre: datos.nombre,
      filas: datos.filas,
      columnas: datos.columnas,
      butacas: {
        create: butacasToCreate,
      },
    },
    select: {
      id: true,
      nombre: true,
      filas: true,
      columnas: true,
      creadaEn: true,
      eliminadaEn: true,
    },
  });

  return sala;
}

export async function listarSalas() {
  return await prisma.sala.findMany({
    where: {
      eliminadaEn: null,
    },
    select: {
      id: true,
      nombre: true,
      filas: true,
      columnas: true,
      creadaEn: true,
      eliminadaEn: true,
    },
    take: 50,
  });
}

export async function eliminarSalaLogico(id: string) {
  const sala = await prisma.sala.findUnique({
    where: { id },
  });

  if (!sala || sala.eliminadaEn !== null) {
    throw new ErrorNoEncontrado(`No se encontró la sala con id ${id}`);
  }

  const funcionesFuturasCount = await prisma.funcion.count({
    where: {
      salaId: id,
      inicio: {
        gte: new Date(),
      },
    },
  });

  if (funcionesFuturasCount > 0) {
    throw new ErrorDeConflicto(
      `No se puede eliminar la sala "${sala.nombre}" porque tiene funciones programadas a futuro.`
    );
  }

  await prisma.sala.update({
    where: { id },
    data: {
      eliminadaEn: new Date(),
    },
  });
}
