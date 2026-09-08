import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { listarButacasDeFuncion } from "@/lib/db/funciones";
import { funcionIdSchema } from "@/lib/schemas/funcion";

/**
 * GET /api/funciones/:id/butacas — butacas de una función, con su estado.
 *
 * Público: quien mira la cartelera necesita ver qué hay libre antes de
 * registrarse. Acá se corta el anidamiento de rutas: las butacas cuelgan de la
 * función y nada cuelga de las butacas.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const funcionId = funcionIdSchema.parse(id); // 400
    const butacas = await listarButacasDeFuncion(funcionId); // 404
    return NextResponse.json(butacas);
  } catch (error) {
    return respuestaDeError(error);
  }
}
