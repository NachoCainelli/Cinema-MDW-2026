/**
 * Configuración de autenticación y autorización.
 *
 * Se completa en la CLASE 6. Hasta entonces, este archivo documenta el
 * contrato que va a tener el resto del proyecto.
 *
 * Las dos funciones de abajo son las únicas formas válidas de saber quién
 * está haciendo un request. Ningún componente ni endpoint debe leer el
 * usuario de otro lado: si el `userId` o el `rol` vienen del cliente,
 * cualquiera puede mentir.
 */

export type Rol = "ADMIN" | "USUARIO";

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

/**
 * Devuelve el usuario de la sesión, o null si no hay sesión.
 * Se usa cuando la página funciona con y sin usuario logueado.
 */
export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  // TODO (clase 6): leer la sesión real de Auth.js.
  return null;
}

/**
 * Devuelve el usuario de la sesión o corta el request.
 * Se usa en todo lo que requiere estar logueado.
 *
 * Si además hay que verificar un rol, se compara acá y no en la UI:
 * esconder un botón no impide que alguien llame al endpoint con Postman.
 */
export async function requerirUsuario(rol?: Rol): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    throw new Error("No autenticado"); // → 401
  }

  if (rol && usuario.rol !== rol) {
    throw new Error("No autorizado"); // → 403
  }

  return usuario;
}
