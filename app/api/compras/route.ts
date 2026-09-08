import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { requerirUsuario } from "@/lib/auth";
import { crearCompra, listarComprasDeUsuario } from "@/lib/db/compras";
import { crearCompraSchema, historialQuerySchema } from "@/lib/schemas/compra";

/**
 * POST /api/compras — comprar entradas (H4).
 *
 * La operación del flujo principal tiene ruta propia con sustantivo: no es el
 * alta de un CRUD, es "comprar", con su pago y su regla de sobreventa.
 *
 * El `usuarioId` sale de la sesión y baja por parámetro a `lib/db/`. Si el
 * body trajera uno, el schema lo descarta y `crearCompra` ni lo mira.
 */
export async function POST(request: Request) {
  try {
    const usuario = await requerirUsuario("USUARIO"); // 401 / 403
    const datos = crearCompraSchema.parse(await request.json()); // 400
    const compra = await crearCompra(datos, usuario.id); // 402 / 404 / 409
    return NextResponse.json(compra, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}

/**
 * GET /api/compras — historial del usuario de la sesión (H4).
 *
 * De quién son las compras no se pregunta: sale de la sesión. Por eso no hay
 * un `/api/compras?usuarioId=...` —sería pedirle al cliente el dato que define
 * el permiso— ni hace falta un 404 por compra ajena: las de otro nunca entran.
 */
export async function GET(request: Request) {
  try {
    const usuario = await requerirUsuario("USUARIO"); // 401 / 403
    const { searchParams } = new URL(request.url);
    const query = historialQuerySchema.parse(Object.fromEntries(searchParams)); // 400
    const compras = await listarComprasDeUsuario(usuario.id, query);
    return NextResponse.json(compras);
  } catch (error) {
    return respuestaDeError(error);
  }
}
