/**
 * Entorno de las pruebas de punta a punta, y la guarda que impide correrlas
 * contra producción.
 *
 * La regla: las e2e corren contra una base local, nunca contra la de
 * producción. En el recorrido de #90 quedaron datos de prueba en Supabase
 * ("Película del flujo 17…"); esto es lo que lo impide de ahora en más.
 *
 * Lo usan `playwright.config.ts` (antes de levantar la app o el navegador) y
 * `e2e/preparar.ts` (antes de tocar la base, también cuando se corre suelto).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as cargarEnv, parse as leerEnv } from "dotenv";

const RAIZ = path.resolve(__dirname, "..");

/**
 * Dónde escucha la app de pruebas. No es el 3000 de `pnpm dev`, para poder
 * correr las e2e con el servidor de desarrollo abierto.
 */
export const PUERTO_DE_LA_APP = 3100;
export const URL_DE_LA_APP = `http://localhost:${PUERTO_DE_LA_APP}`;

/**
 * Carpeta del build de pruebas (`distDir` de `next.config.ts`). Aparte de
 * `.next` para que `pnpm test:e2e` no pise el build ni la caché de `pnpm dev`.
 */
export const CARPETA_DEL_BUILD = ".next-e2e";

/** Hosts que se aceptan como "base local". Cualquier otro se rechaza. */
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1"]);

/** Las dos variables de conexión de Prisma (`prisma/schema.prisma`). */
const VARIABLES_DE_BASE = ["DATABASE_URL", "DIRECT_URL"] as const;

/**
 * Carga `.env.e2e` en `process.env` y vacía todo lo que venga de `.env.local`
 * o `.env` y no esté definido ahí.
 *
 * Por qué vaciar: `next build`/`next start` y `prisma.config.ts` leen
 * `.env.local` por su cuenta, pero no pisan una variable que ya existe en
 * `process.env`, aunque esté vacía. Dejarla en `""` es la forma de que una
 * credencial de producción que alguien tenga en su `.env.local` (y que
 * `.env.e2e` no conozca todavía) no llegue al servidor de pruebas.
 *
 * Lo que ya venía definido en la terminal gana sobre `.env.e2e` (es el
 * comportamiento normal de dotenv): por eso la guarda mira el valor final.
 */
export function cargarEntornoDePruebas() {
  cargarEnv({ path: path.join(RAIZ, ".env.e2e"), quiet: true });

  for (const archivo of [".env.local", ".env"]) {
    const ruta = path.join(RAIZ, archivo);
    if (!existsSync(ruta)) continue;
    for (const clave of Object.keys(leerEnv(readFileSync(ruta)))) {
      process.env[clave] ??= "";
    }
  }
}

/**
 * Corta con un error si DATABASE_URL o DIRECT_URL no apuntan a una base
 * local. Una variable vacía o que no se puede leer como URL también corta: la
 * duda se resuelve para el lado seguro.
 */
export function exigirBaseLocal() {
  for (const variable of VARIABLES_DE_BASE) {
    const valor = process.env[variable]?.trim();
    const host = hostDe(valor);

    if (!host || !HOSTS_LOCALES.has(host)) {
      throw new Error(
        `Las pruebas e2e solo corren contra una base local, y ${variable} apunta a ` +
          `${host ? `"${host}"` : "algo que no es una URL de Postgres"}. ` +
          "Revisá que no haya una DATABASE_URL/DIRECT_URL exportada en la terminal " +
          "y que .env.e2e apunte a la Postgres de docker-compose.yml.",
      );
    }
  }
}

function hostDe(valor: string | undefined) {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    // Postgres acepta `?host=` y con eso pisa el host de la URL: una
    // `postgresql://localhost/...?host=otro.servidor` se conectaría a "otro".
    // No se usa en este proyecto, así que se rechaza en vez de interpretarla.
    if (url.searchParams.has("host")) return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}
