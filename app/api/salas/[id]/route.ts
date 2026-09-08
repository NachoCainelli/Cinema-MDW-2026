import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { respuestaDeError } from "@/lib/api/respuestas";
import { eliminarSalaLogico } from "@/lib/db/salas";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requerirUsuario("ADMINISTRADOR");
    await eliminarSalaLogico(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
