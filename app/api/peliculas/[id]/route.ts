import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { respuestaDeError } from "@/lib/api/respuestas";
import { crearSalaSchema, salasQuerySchema } from "@/lib/schemas/sala";
import { crearSala, listarSalas } from "@/lib/db/salas";

export async function GET(request: Request) {
  try {
    await requerirUsuario("ADMINISTRADOR");
    const { searchParams } = new URL(request.url);
    const query = salasQuerySchema.parse(Object.fromEntries(searchParams));
    const salas = await listarSalas(query);
    return NextResponse.json(salas, { status: 200 });
  } catch (error) {
    return respuestaDeError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requerirUsuario("ADMINISTRADOR");
    const json = await request.json();
    const datos = crearSalaSchema.parse(json);
    const sala = await crearSala(datos);
    return NextResponse.json(sala, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
