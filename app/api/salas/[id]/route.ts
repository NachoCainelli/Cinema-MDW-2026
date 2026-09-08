import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { respuestaDeError } from "@/lib/api/respuestas";
import { eliminarSalaLogico } from "@/lib/db/salas";
import { salaIdSchema } from "@/lib/schemas/sala";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requerirUsuario("ADMINISTRADOR"); // 401 / 403
    const { id } = await params;
    const salaId = salaIdSchema.parse(id); // 400
    await eliminarSalaLogico(salaId); // 404 / 409
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
