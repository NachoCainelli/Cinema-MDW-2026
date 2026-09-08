import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { respuestaDeError } from "@/lib/api/respuestas";
import { crearSalaSchema } from "@/lib/schemas/sala";
import { crearSala, listarSalas } from "@/lib/db/salas";

export async function GET() {
  try {
    await requerirUsuario("ADMINISTRADOR");
    const salas = await listarSalas();
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
