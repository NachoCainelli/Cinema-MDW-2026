import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { requerirUsuario } from "@/lib/auth";
import { obtenerCompraDeUsuario } from "@/lib/db/compras";
import { ErrorNoEncontrado } from "@/lib/errores";
import { compraIdSchema } from "@/lib/schemas/compra";

/**
 * GET /api/compras/:id — una compra del usuario de la sesión, con sus entradas (H4).
 *
 * La compra inexistente y la ajena responden exactamente lo mismo: 404 con el
 * mismo cuerpo. Si la ajena respondiera 403, se podría averiguar qué ids de
 * compra existen probando de a uno.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const compraId = compraIdSchema.parse(id); // 400
    const usuario = await requerirUsuario("USUARIO"); // 401 / 403
    const compra = await obtenerCompraDeUsuario(compraId, usuario.id);
    if (!compra) throw new ErrorNoEncontrado(`No se encontró la compra con id ${compraId}`); // 404
    return NextResponse.json(compra);
  } catch (error) {
    return respuestaDeError(error);
  }
}
