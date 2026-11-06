/**
 * Los textos de un login fallido, compartidos por las dos formas en que llega
 * el error: el `?error=` de la URL (las redirecciones de Auth.js, p. ej. el
 * login con Google) y el `AuthError` que atrapa `ingresarAction`. Viven acá y
 * no en `acciones.ts` porque un archivo `"use server"` solo puede exportar
 * funciones async.
 */

// El tipo de error elige uno de estos textos y nunca se muestra tal cual: el
// de la URL lo escribe cualquiera que arme el link. Credenciales mal no dice
// cuál de las dos falló, para no confirmar qué emails tienen cuenta.
const MENSAJE_DE_ERROR: Record<string, string> = {
  CredentialsSignin: "El email o la contraseña no son correctos.",
};
const MENSAJE_DE_ERROR_GENERICO = "No pudimos iniciar sesión. Probá de nuevo.";

export function mensajeDeErrorDeIngreso(tipo: string): string {
  return MENSAJE_DE_ERROR[tipo] ?? MENSAJE_DE_ERROR_GENERICO;
}
