import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const crearSalaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  filas: z.number().int().positive('Las filas deben ser un entero positivo'),
  columnas: z.number().int().positive('Las columnas deben ser un entero positivo'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = crearSalaSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { nombre, filas, columnas } = result.data;

    const existe = await prisma.sala.findUnique({ where: { nombre } });
    if (existe) {
      return NextResponse.json({ error: 'Ya existe una sala con ese nombre' }, { status: 409 });
    }

    const nuevaSala = await prisma.$transaction(async (tx) => {
      const sala = await tx.sala.create({
        data: { nombre, filas, columnas },
      });

      const butacasData = [];
      for (let f = 1; f <= filas; f++) {
        for (let c = 1; c <= columnas; c++) {
          butacasData.push({ salaId: sala.id, fila: f, columna: c });
        }
      }

      await tx.butaca.createMany({ data: butacasData });
      return sala;
    });

    return NextResponse.json(nuevaSala, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET() {
  const salas = await prisma.sala.findMany({
    where: { eliminadaEn: null },
  });
  return NextResponse.json(salas, { status: 200 });
}