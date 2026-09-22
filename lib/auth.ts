/**
 * Sesión con Auth.js (docs/adr/0003 y 0004).
 *
 * Dos proveedores: Google, que no nos hace guardar contraseñas, y Credentials,
 * porque H1 pide registro con email y contraseña. La sesión es un JWT dentro
 * de una cookie cifrada con AUTH_SECRET: el id y el rol viajan ahí y no se
 * consulta la base en cada request. La contracara es que el rol del token es
 * una foto del momento del login: si un administrador le cambia el rol a
 * alguien, recién se nota cuando esa persona vuelve a iniciar sesión.
 *
 * El resto del proyecto no conoce Auth.js: los handlers solo llaman a
 * `obtenerUsuario()` / `requerirUsuario(rol)`.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Rol } from "@prisma/client";

import {
  obtenerOCrearUsuarioDeGoogle,
  verificarCredenciales,
} from "@/lib/db/usuarios";
import { ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";
import { credencialesSchema, rolSchema } from "@/lib/schemas/usuario";

export type { Rol };

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    // Lee AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET del entorno.
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credenciales) {
        // Lo que llega del formulario es entrada externa: se valida como
        // cualquier otro body. Un formato inválido es un login fallido más.
        const datos = credencialesSchema.safeParse(credenciales);
        if (!datos.success) return null;

        const usuario = await verificarCredenciales(datos.data);
        if (!usuario) return null;

        return { id: usuario.id, email: usuario.email, name: usuario.nombre, rol: usuario.rol };
      },
    }),
  ],
  callbacks: {
    signIn({ account, profile }) {
      // Sin esto, una cuenta de Google con un email sin verificar podría
      // entrar como la cuenta nuestra que tiene ese email, rol incluido.
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },

    async jwt({ token, user, account }) {
      // `user` solo viene en el login; en los requests siguientes el token
      // ya trae el id y el rol, y se devuelve tal cual.
      if (!user) return token;

      if (account?.provider === "google") {
        if (!user.email) throw new Error("Google no devolvió el email de la cuenta");

        const usuario = await obtenerOCrearUsuarioDeGoogle({
          email: user.email.toLowerCase(),
          nombre: user.name?.trim() || user.email,
        });
        token.usuarioId = usuario.id;
        token.rol = usuario.rol;
        // El nombre y el email salen de nuestra base, no de Google.
        token.name = usuario.nombre;
        token.email = usuario.email;
        return token;
      }

      // Credentials: `user` es lo que devolvió `authorize`, leído de la base.
      if (!user.id || !user.rol) throw new Error("authorize devolvió un usuario incompleto");
      token.usuarioId = user.id;
      token.rol = user.rol;
      return token;
    },

    session({ session, token }) {
      // El token está cifrado con nuestro secreto, pero su tipo para
      // TypeScript es un objeto abierto: se valida la forma antes de copiarlo.
      const rol = rolSchema.safeParse(token.rol);
      if (typeof token.usuarioId === "string" && rol.success) {
        session.user.usuarioId = token.usuarioId;
        session.user.rol = rol.data;
      }
      return session;
    },
  },
});

export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const usuario = (await auth())?.user;
  if (!usuario?.usuarioId || !usuario.rol || !usuario.email) return null;

  return {
    id: usuario.usuarioId,
    email: usuario.email,
    nombre: usuario.name ?? "",
    rol: usuario.rol,
  };
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
