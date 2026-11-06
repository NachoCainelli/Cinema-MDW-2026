/**
 * La Server Action del login con email y contraseña.
 *
 * Es un endpoint público: cualquiera la puede llamar con cualquier `FormData`.
 * No tiene paso de autorizar —quien ingresa todavía no tiene sesión— y no
 * valida acá: `authorize` (`lib/auth.ts`) valida email y contraseña con
 * `credencialesSchema`, y un formato inválido es un login fallido más. No lee
 * `rol` ni ningún id del formulario: el rol sale de la base al iniciar sesión.
 *
 * Si falla, devuelve el estado en vez de redirigir a `/ingresar?error=…`: un
 * redirect vuelve a pintar la página desde cero y el email se perdía.
 */
"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import type { EstadoDelFormulario } from "@/lib/formularios";
import { callbackUrlSchema } from "@/lib/schemas/usuario";

import { mensajeDeErrorDeIngreso } from "./mensajes";

export async function ingresarAction(
  volverA: string,
  _estadoPrevio: EstadoDelFormulario,
  formData: FormData,
): Promise<EstadoDelFormulario> {
  // Llega atado con `.bind` desde la página, y lo atado viaja por el cliente
  // sin cifrar: se vuelve a validar para no ser un redireccionador abierto.
  const destino = callbackUrlSchema.parse(volverA);

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: destino,
    });
  } catch (error) {
    // No se usa `estadoDeError` (lib/formularios.ts): traduce los errores de
    // `lib/errores.ts` y re-lanza un `AuthError`, que acá es la respuesta
    // esperada. Lo demás —incluido el redirect de un login exitoso, que
    // también lanza— se re-lanza igual que allá.
    if (!(error instanceof AuthError)) throw error;
    // Solo el email vuelve: la contraseña no tiene por qué volver a viajar.
    return {
      ok: false,
      mensaje: mensajeDeErrorDeIngreso(error.type),
      valores: { email: String(formData.get("email") ?? "") },
    };
  }

  // `signIn` con `redirectTo` ya redirigió; esto es por si algún día no lo hace.
  redirect(destino);
}
