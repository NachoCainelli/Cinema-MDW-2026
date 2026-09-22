import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { requerirUsuario } from "@/lib/auth";
import { imagenSchema } from "@/lib/schemas/imagen";
import { subirImagen } from "@/lib/storage";

/**
 * POST /api/peliculas/imagen — sube el póster de una película al bucket
 * público de Supabase Storage y devuelve su URL (spec, sección 8).
 *
 * Ruta propia y no un campo de archivo en `POST /api/peliculas`: separar la
 * subida de la creación deja que el gestor arme la película sin imagen y la
 * complete después con `PATCH`, y que un problema de Storage no bloquee el
 * alta de la película en sí.
 *
 * multipart/form-data, no JSON: el body de `POST /api/peliculas` es JSON, así
 * que este es el único endpoint del contrato que no lo es. El campo del
 * archivo se llama `archivo`.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const archivo = imagenSchema.parse(formData.get("archivo")); // 400
    await requerirUsuario("GESTOR_CARTELERA"); // 401 / 403
    const imagenUrl = await subirImagen(archivo);
    return NextResponse.json({ imagenUrl }, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
