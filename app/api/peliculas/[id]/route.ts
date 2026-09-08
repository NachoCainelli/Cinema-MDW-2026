import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { requerirUsuario } from "@/lib/auth";
import { actualizarPelicula, darDeBajaPelicula } from "@/lib/db/peliculas";
import { actualizarPeliculaSchema, peliculaIdSchema } from "@/lib/schemas/pelicula";

/**
 * PATCH /api/peliculas/:id — editar una película (H6).
 *
 * Es PATCH y no PUT: modifica los campos que le mandan y deja el resto como
 * está, por eso valida con el schema en versión `.partial()`. Un body sin
 * ningún campo conocido es 400.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requerirUsuario("GESTOR_CARTELERA"); // 401 / 403
    const { id } = await params;
    const peliculaId = peliculaIdSchema.parse(id); // 400
    const datos = actualizarPeliculaSchema.parse(await request.json()); // 400
    const pelicula = await actualizarPelicula(peliculaId, datos); // 404
    return NextResponse.json(pelicula);
  } catch (error) {
    return respuestaDeError(error);
  }
}

/**
 * DELETE /api/peliculas/:id — sacar de cartelera (H6).
 *
 * Es una baja lógica: la película deja de listarse y de admitir funciones
 * nuevas, pero sus funciones pasadas y el historial de ventas quedan intactos.
 * Responde 204 sin cuerpo, igual que la baja de sala.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requerirUsuario("GESTOR_CARTELERA"); // 401 / 403
    const { id } = await params;
    const peliculaId = peliculaIdSchema.parse(id); // 400
    await darDeBajaPelicula(peliculaId); // 404 / 409
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
