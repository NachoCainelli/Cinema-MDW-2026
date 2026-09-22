/**
 * Lo que agregamos a los tipos de Auth.js: el id de nuestra tabla Usuario y el
 * rol, que viajan en el JWT y se copian a la sesión (ver `lib/auth.ts`).
 *
 * El JWT no se tipa acá: `next-auth/jwt` es un `export *` de `@auth/core`, que
 * con pnpm no se puede augmentar sin sumarlo como dependencia. El callback
 * `session` valida lo que lee del token.
 */
import type { Rol } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { usuarioId: string; rol: Rol } & DefaultSession["user"];
  }

  // Lo que devuelve `authorize` del provider Credentials.
  interface User {
    rol?: Rol;
  }
}
