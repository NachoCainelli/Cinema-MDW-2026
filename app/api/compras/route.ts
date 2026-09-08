import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const comprarEntradasSchema = z.object({
  funcionId: z.string().min(1, 'El ID de la función es obligatorio'),
  butacasIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una butaca'),
});

// Endpoint para comprar entradas
export async function POST(request: Request) {
  try {
    // 1. Simulación de sesión leyendo el header
    const email = request.headers.get('x-usuario-prueba');
    if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    // 2. Validación de los datos enviados (body)
    const body = await request.json();
    const result = comprarEntradasSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { funcionId, butacasIds } = result.data;

    // 3. Verificamos que la función exista
    const funcion = await prisma.funcion.findUnique({ where: { id: funcionId } });
    if (!funcion) return NextResponse.json({ error: 'Función no encontrada' }, { status: 404 });

    // 4. Verificamos que las butacas no estén ocupadas ya en esa función
    const butacasOcupadas = await prisma.entrada.findMany({
      where: {
        funcionId,
        butacaId: { in: butacasIds },
      },
    });

    if (butacasOcupadas.length > 0) {
      return NextResponse.json({ error: 'Una o más butacas ya están ocupadas' }, { status: 409 });
    }

    // 5. Transacción: Creamos la compra y todas las entradas juntas
    const nuevaCompra = await prisma.$transaction(async (tx) => {
      const compra = await tx.compra.create({
        data: { usuarioId: usuario.id },
      });

      const entradasData = butacasIds.map((butacaId) => ({
        funcionId,
        butacaId,
        compraId: compra.id,
      }));

      await tx.entrada.createMany({ data: entradasData });

      return tx.compra.findUnique({
        where: { id: compra.id },
        include: { entradas: true },
      });
    });

    return NextResponse.json(nuevaCompra, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Endpoint para ver el historial de compras del usuario
export async function GET(request: Request) {
  try {
    const email = request.headers.get('x-usuario-prueba');
    if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    // Traemos el historial con todo el detalle anidado (entradas, función, película y butacas)
    const historial = await prisma.compra.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { creadaEn: 'desc' },
      include: {
        entradas: {
          include: {
            funcion: {
              include: { pelicula: true, sala: true },
            },
            butaca: true,
          },
        },
      },
    });

    return NextResponse.json(historial, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}