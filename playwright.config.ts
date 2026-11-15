/**
 * Configuración de las pruebas de punta a punta (`pnpm test:e2e`).
 *
 * Lo primero que hace, antes de levantar la app o el navegador, es cargar
 * `.env.e2e` y negarse a arrancar si la base no es local (`e2e/entorno.ts`).
 * Con una DATABASE_URL de Supabase, `pnpm test:e2e` se corta acá.
 *
 * Después, en este orden (así lo hace Playwright):
 *   1. `webServer`: compila la app en `.next-e2e` y la levanta con `next start`
 *      en el puerto 3100, con las variables de `.env.e2e`.
 *   2. `globalSetup` (`e2e/preparar.ts`): borra la base local, aplica las
 *      migraciones y corre el seed. La app no consulta la base hasta el primer
 *      request, así que no importa que ya esté levantada.
 *   3. Las pruebas de `e2e/*.spec.ts`.
 *
 * Es la app de producción (`next build` + `next start`), no `next dev`: se
 * prueba lo mismo que se despliega.
 */
import { defineConfig, devices } from "@playwright/test";

import {
  CARPETA_DEL_BUILD,
  PUERTO_DE_LA_APP,
  URL_DE_LA_APP,
  cargarEntornoDePruebas,
  exigirBaseLocal,
} from "./e2e/entorno";

cargarEntornoDePruebas();
exigirBaseLocal();

const enCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/preparar.ts",

  // Todas las pruebas comparten una sola base: en paralelo, una prueba que
  // compra una butaca le cambiaría el estado a otra que la está mirando. Un
  // solo worker hasta que haga falta otra cosa.
  workers: 1,
  fullyParallel: false,
  forbidOnly: enCI,
  // Sin reintentos: una prueba que pasa "a la segunda" es una prueba que falla.
  retries: 0,
  reporter: enCI ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: URL_DE_LA_APP,
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `pnpm build && pnpm start --port ${PUERTO_DE_LA_APP}`,
    url: URL_DE_LA_APP,
    // El build tarda; en una máquina lenta o en el CI, bastante más de un minuto.
    timeout: 300_000,
    // En local, si ya hay una app de pruebas levantada en el 3100, se reusa.
    reuseExistingServer: !enCI,
    env: { ...variablesDefinidas(), NEXT_DIST_DIR: CARPETA_DEL_BUILD },
    stdout: "pipe",
    stderr: "pipe",
  },
});

/** `process.env` sin las claves en `undefined`, que es lo que pide `webServer.env`. */
function variablesDefinidas() {
  return Object.fromEntries(
    Object.entries(process.env).filter((entrada): entrada is [string, string] => entrada[1] !== undefined),
  );
}
