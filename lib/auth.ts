import { headers } from "next/headers";
import type { Rol } from "@prisma/client";

import { buscarUsuarioPorEmail } from "@/lib/db/usuarios";
import { ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";

export type { Rol };

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

const HEADER_USUARIO_DE_PRUEBA = "x-usuario-prueba";

/**
 * Stub de sesión para probar los endpoints protegidos antes de Auth.js: toma
 * el email del header `x-usuario-prueba` (o de AUTH_STUB_EMAIL) y busca esa
 * fila en la base. Solo con AUTH_STUB_HABILITADO="true" y nunca en producción.
 *
 * TODO (clase 6): borrar este stub cuando entre Auth.js, junto con
 * AUTH_STUB_HABILITADO y AUTH_STUB_EMAIL de `.env.example`.
 */
async function obtenerUsuarioDePrueba(): Promise<UsuarioSesion | null> {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.AUTH_STUB_HABILITADO !== "true") return null;

  // headers() solo existe dentro de un request; en un test o en un script no.
  let emailDelHeader: string | null = null;
  try {
    emailDelHeader = (await headers()).get(HEADER_USUARIO_DE_PRUEBA);
  } catch {
    emailDelHeader = null;
  }

  const email = emailDelHeader?.trim() || process.env.AUTH_STUB_EMAIL?.trim();
  if (!email) return null;

  return buscarUsuarioPorEmail(email);
}

export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  // El `return await` no es redundante. Con Next 16.3.0, sin él, Turbopack
  // deducía en compilación que `await obtenerUsuario()` nunca es null y
  // borraba el `if (!usuario)` de `requerirUsuario`: sin sesión, los endpoints
  // protegidos respondían 500 en vez de 401, en `pnpm dev` y en Vercel. Next
  // 16.3.4 ya compila bien el retorno directo; el `await` queda para que el
  // chequeo no dependa de que ese bug no vuelva.
  return await obtenerUsuarioDePrueba();
}

export async function requerirUsuario(rol?: Rol): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    throw new ErrorNoAutenticado();
  }

  if (rol && usuario.rol !== rol) {
    throw new ErrorNoAutorizado();
  }

  return usuario;
}
