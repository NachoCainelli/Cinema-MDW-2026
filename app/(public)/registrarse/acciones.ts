/**
 * La Server Action del registro público (H1, paso 3 del flujo).
 *
 * No decide nada sobre cuentas: llama a `registrarUsuario`, la misma que
 * `POST /api/usuarios`, que crea la cuenta siempre como `USUARIO`. El
 * formulario no tiene campo `rol`, y aunque alguien lo agregue a mano,
 * `registrarUsuarioSchema` no lo conoce y Zod lo descarta.
 *
 * Tampoco tiene el paso de autorizar, igual que el endpoint: es la única
 * escritura sin sesión del sistema, porque quien se registra todavía no tiene
 * cuenta. El orden es validar → delegar → iniciar sesión.
 *
 * No hay `revalidatePath`: crear una cuenta no deja vieja ninguna pantalla, y
 * la sesión nueva se lee en el render que sigue al redirect.
 */
"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { registrarUsuario } from "@/lib/db/usuarios";
import { ErrorDeConflicto } from "@/lib/errores";
import { estadoDeError, type EstadoDelFormulario } from "@/lib/formularios";
import { urlDeIngreso } from "@/lib/navegacion";
import {
  callbackUrlSchema,
  registrarUsuarioSchema,
  type RegistrarUsuarioInput,
} from "@/lib/schemas/usuario";

export async function registrarseAction(
  volverA: string,
  _estadoPrevio: EstadoDelFormulario,
  formData: FormData,
): Promise<EstadoDelFormulario> {
  // Llega atado con `.bind` desde la página, y lo atado con `.bind` viaja por
  // el cliente sin cifrar: se vuelve a validar acá para que el registro no
  // sea un redireccionador abierto.
  const destino = callbackUrlSchema.parse(volverA);

  // Lo que se le devuelve si algo falla. La contraseña no: no tiene por qué
  // volver a viajar, y con escribirla de nuevo alcanza.
  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  let datos: RegistrarUsuarioInput;
  try {
    datos = registrarUsuarioSchema.parse({ ...valores, password: formData.get("password") });
    await registrarUsuario(datos);
  } catch (error) {
    const estado = estadoDeError(error, valores);
    // "Ya existe una cuenta con ese email" sin decir dónde ir deja a la
    // persona buscando: probablemente ya se registró y quiere ingresar.
    if (error instanceof ErrorDeConflicto) {
      return { ...estado, enlace: { href: urlDeIngreso(destino), texto: "Ingresar con ese email" } };
    }
    return estado;
  }

  // H1 pide que el registro deje la sesión iniciada. `signIn` redirige al
  // terminar (lanza, como `redirect`), así que va afuera del `try`.
  try {
    await signIn("credentials", { email: datos.email, password: datos.password, redirectTo: destino });
  } catch (error) {
    // La cuenta ya existe: si el login automático falla, que ingrese a mano.
    if (error instanceof AuthError) redirect(urlDeIngreso(destino));
    throw error;
  }

  // `signIn` con `redirectTo` ya redirigió; esto es por si algún día no lo hace.
  redirect(destino);
}
