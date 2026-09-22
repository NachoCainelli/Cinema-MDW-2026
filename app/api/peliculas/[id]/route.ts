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
 *
 * Orden: sesión y rol primero (no dependen del id ni del body), y recién
 * después el id y el body. El 404 ("existe y está en cartelera") no se
 * adelanta al 400 a propósito: `actualizarPelicula` resuelve las dos cosas
 * en una sola escritura (`where: { id, bajaEn: null }` + `update`), así que
 * separar "existe" de "el body es válido" en dos pasos distintos exigiría una
 * consulta aparte solo para el orden, y abriría una ventana entre chequear y
 * escribir que hoy no existe (ver AGENTS.md).
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
 *
 * A diferencia del PATCH, acá no hay body que validar —solo el id de la
 * ruta—, así que no hay ninguna tensión entre 400 y 404 que resolver: el id
 * se valida antes de delegar, y `darDeBajaPelicula` (`lib/db/peliculas.ts`)
 * resuelve el 404 con su propio `findUnique` antes de escribir, no con una
 * sola escritura condicionada como `actualizarPelicula`.
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
