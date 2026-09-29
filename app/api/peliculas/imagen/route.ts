import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { requerirUsuario } from "@/lib/auth";
import { ErrorDeServicioExterno } from "@/lib/errores";
import { imagenSchema } from "@/lib/schemas/imagen";
import { subirImagen } from "@/lib/servicios/storage";

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
 *
 * Acá Storage es esencial, al revés que en la creación de la película: sin
 * imagen que subir este endpoint no tiene razón de ser, así que un `null` de
 * `subirImagen` es un 502, no una respuesta exitosa con `imagenUrl: null`.
 */
export async function POST(request: Request) {
  try {
    await requerirUsuario("GESTOR_CARTELERA"); // 401 / 403
    const formData = await formDataDelRequest(request); // 400
    const archivo = imagenSchema.parse(formData.get("archivo")); // 400
    const imagenUrl = await subirImagen(archivo);
    if (!imagenUrl) {
      throw new ErrorDeServicioExterno("No pudimos subir la imagen. Probá de nuevo en unos minutos");
    }
    return NextResponse.json({ imagenUrl }, { status: 201 });
  } catch (error) {
    return respuestaDeError("POST /api/peliculas/imagen", error);
  }
}

/**
 * `request.formData()` tira un `TypeError` si el `Content-Type` no es
 * `multipart/form-data` (o `application/x-www-form-urlencoded`) — no un
 * `SyntaxError` como `request.json()`. Se traduce acá al mismo `SyntaxError`
 * que ya traduce `respuestaDeError`: es el mismo caso, un body que no tiene el
 * formato que este endpoint espera, error de quien llama y no del servidor.
 */
async function formDataDelRequest(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new SyntaxError("El cuerpo del request no es multipart/form-data");
  }
}
