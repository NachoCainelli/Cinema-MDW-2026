import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { requerirUsuario } from "@/lib/auth";
import { crearPelicula, listarPeliculas } from "@/lib/db/peliculas";
import { crearPeliculaSchema, peliculasQuerySchema } from "@/lib/schemas/pelicula";

/**
 * POST /api/peliculas — alta de una película (H6).
 *
 * La clasificación y la categoría son listas cerradas en el schema, así que un
 * valor fuera de la lista no llega nunca a la base: lo frena el 400.
 */
export async function POST(request: Request) {
  try {
    await requerirUsuario("GESTOR_CARTELERA"); // 401 / 403
    const datos = crearPeliculaSchema.parse(await request.json()); // 400
    const pelicula = await crearPelicula(datos);
    return NextResponse.json(pelicula, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}

/**
 * GET /api/peliculas — listado para el gestor de cartelera.
 *
 * No es la vitrina del cine —esa es `GET /api/funciones`, pública—: este
 * listado es el catálogo con el que trabaja el gestor, por eso pide sesión.
 * Devuelve solo las películas en cartelera; las dadas de baja quedan afuera.
 */
export async function GET(request: Request) {
  try {
    await requerirUsuario("GESTOR_CARTELERA"); // 401 / 403
    const { searchParams } = new URL(request.url);
    const query = peliculasQuerySchema.parse(Object.fromEntries(searchParams)); // 400
    const peliculas = await listarPeliculas(query);
    return NextResponse.json(peliculas);
  } catch (error) {
    return respuestaDeError(error);
  }
}
