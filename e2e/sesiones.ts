/**
 * Sesiones fabricadas para las pruebas: la cookie de Auth.js de una cuenta del
 * seed, sin pasar por el formulario de `/ingresar`.
 *
 * Es la misma cookie que arma Auth.js al iniciar sesión (`lib/auth.ts`, callback
 * `jwt`): un JWT cifrado con AUTH_SECRET, con el id y el rol de la base
 * adentro. La firma con el secreto de prueba de `.env.e2e`, que es el mismo
 * con el que corre la app de pruebas, así que la app la acepta como cualquier
 * otra. La app no se entera de que la sesión es fabricada: no hay modo prueba,
 * usuario mágico ni `if (process.env.E2E)` en ningún lado.
 *
 * Uso:
 *   await iniciarSesionComo(context, "GESTOR_CARTELERA");
 *   // o, para pedidos a la API sin navegador:
 *   const api = await playwright.request.newContext({
 *     baseURL, storageState: { cookies: [await cookieDeSesion("USUARIO")], origins: [] },
 *   });
 */
import type { BrowserContext } from "@playwright/test";
import type { Rol } from "@prisma/client";
import { encode } from "next-auth/jwt";

import { buscarUsuarioPorEmail } from "@/lib/db/usuarios";

import { URL_DE_LA_APP } from "./entorno";

/**
 * Una cuenta del seed por rol (`prisma/seed.ts`). Los emails son los valores
 * por defecto: `.env.e2e` deja vacíos SEED_EMAIL_ADMIN y SEED_EMAIL_GESTOR.
 */
export const CUENTAS_DEL_SEED: Record<Rol, string> = {
  ADMINISTRADOR: "admin@ejemplo.com",
  GESTOR_CARTELERA: "gestor@ejemplo.com",
  USUARIO: "usuario@ejemplo.com",
};

/**
 * Nombre de la cookie de sesión de Auth.js sobre http. Sobre https lleva el
 * prefijo `__Secure-`; la app de pruebas corre en http://localhost. Es también
 * la "sal" con la que Auth.js deriva la clave de cifrado del JWT.
 */
const COOKIE_DE_SESION = "authjs.session-token";

/** Lo mismo que dura una sesión de Auth.js por defecto: 30 días. */
const DURACION_EN_SEGUNDOS = 30 * 24 * 60 * 60;

/**
 * El segundo USUARIO del seed (el "usuario B" de `docs/api.http`): sirve para
 * probar que un usuario no ve las compras de otro.
 */
export const USUARIO_B_DEL_SEED = "usuario.b@ejemplo.com";

/**
 * Fabrica la cookie de sesión de la cuenta del seed con ese rol. El id se lee
 * de la base (cambia en cada `e2e/preparar.ts`), igual que lo hace el login.
 *
 * `email` elige otra cuenta del seed con el mismo rol (por ejemplo,
 * `USUARIO_B_DEL_SEED`); si no se pasa, es la de `CUENTAS_DEL_SEED`.
 */
export async function cookieDeSesion(rol: Rol, email = CUENTAS_DEL_SEED[rol]) {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error("Falta AUTH_SECRET: ¿se cargó .env.e2e?");

  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) {
    throw new Error(`No está la cuenta ${email} en la base: ¿corrió e2e/preparar.ts?`);
  }
  if (usuario.rol !== rol) {
    throw new Error(`La cuenta ${email} tiene rol ${usuario.rol} en la base, no ${rol}.`);
  }

  // Los mismos campos que deja el callback `jwt` de `lib/auth.ts` en un login
  // por Credentials.
  const valor = await encode({
    salt: COOKIE_DE_SESION,
    secret: secreto,
    maxAge: DURACION_EN_SEGUNDOS,
    token: {
      sub: usuario.id,
      name: usuario.nombre,
      email: usuario.email,
      usuarioId: usuario.id,
      rol: usuario.rol,
    },
  });

  return {
    name: COOKIE_DE_SESION,
    value: valor,
    domain: new URL(URL_DE_LA_APP).hostname,
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
    expires: Math.floor(Date.now() / 1000) + DURACION_EN_SEGUNDOS,
  };
}

/** Deja el contexto del navegador con la sesión de la cuenta del seed con ese rol. */
export async function iniciarSesionComo(context: BrowserContext, rol: Rol) {
  await context.addCookies([await cookieDeSesion(rol)]);
}
