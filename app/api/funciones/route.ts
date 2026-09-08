import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { requerirUsuario } from "@/lib/auth";
import { crearFuncion, listarCartelera } from "@/lib/db/funciones";
import { carteleraQuerySchema, crearFuncionSchema } from "@/lib/schemas/funcion";

/**
 * POST /api/funciones — publicar una función (H3).
 *
 * El schema rechaza la fecha en el pasado (400) y `crearFuncion` las reglas
 * que dependen de la base: película o sala inexistente (404), película dada de
 * baja, sala eliminada y solapamiento con el margen de 15 minutos (409).
 */
export async function POST(request: Request) {
  try {
    await requerirUsuario("GESTOR_CARTELERA"); // 401 / 403
    const datos = crearFuncionSchema.parse(await request.json()); // 400
    const funcion = await crearFuncion(datos); // 404 / 409
    return NextResponse.json(funcion, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}

/**
 * GET /api/funciones — cartelera pública.
 *
 * Sin sesión a propósito: es la vitrina del cine. Devuelve solo funciones
 * futuras de salas vigentes y películas en cartelera.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = carteleraQuerySchema.parse(Object.fromEntries(searchParams)); // 400
    const funciones = await listarCartelera(query);
    return NextResponse.json(funciones);
  } catch (error) {
    return respuestaDeError(error);
  }
}
