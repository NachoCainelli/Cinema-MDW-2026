import { NextResponse } from "next/server";

import { respuestaDeError } from "@/lib/api/respuestas";
import { signIn } from "@/lib/auth";
import { registrarUsuario } from "@/lib/db/usuarios";
import { registrarUsuarioSchema } from "@/lib/schemas/usuario";

/**
 * POST /api/usuarios — registro público (H1).
 *
 * Es la única ruta de escritura sin sesión del sistema: el paso de autorizar
 * no existe acá a propósito, porque quien se registra todavía no tiene cuenta.
 *
 * TODO (clase 6): iniciar sesión automáticamente después del registro. El
 * criterio de aceptación de H1 lo pide, pero la sesión real llega con Auth.js.
 */
export async function POST(request: Request) {
  try {
    const datos = registrarUsuarioSchema.parse(await request.json()); // 400
    const usuario = await registrarUsuario(datos); // 409 email duplicado
    await signIn("credentials", {
      email: datos.email,
      password: datos.password,
      redirect: false,
    });
    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
