import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { respuestaDeError } from "@/lib/api/respuestas";
import { crearSalaSchema, salasQuerySchema } from "@/lib/schemas/sala";
import { crearSala, listarSalas } from "@/lib/db/salas";

/**
 * Orden de un handler protegido: autorizar → validar → delegar → responder
 * (ver AGENTS.md). La sesión y el rol se verifican primero porque no
 * dependen de nada del request (ni body ni query): así una request sin
 * sesión corta con 401 antes de que el servidor le preste atención a la
 * forma de los datos que mandó.
 */
export async function GET(request: Request) {
  try {
    await requerirUsuario("ADMINISTRADOR"); // 401 / 403
    const { searchParams } = new URL(request.url);
    const query = salasQuerySchema.parse(Object.fromEntries(searchParams)); // 400
    const salas = await listarSalas(query);
    return NextResponse.json(salas, { status: 200 });
  } catch (error) {
    return respuestaDeError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requerirUsuario("ADMINISTRADOR"); // 401 / 403
    const json = await request.json();
    const datos = crearSalaSchema.parse(json); // 400
    const sala = await crearSala(datos);
    return NextResponse.json(sala, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
