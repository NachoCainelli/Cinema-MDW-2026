/**
 * Deja la base local de pruebas en un estado conocido: la borra entera,
 * aplica todas las migraciones y corre el seed (`prisma/seed.ts`).
 *
 * Es el `globalSetup` de `playwright.config.ts`, así que corre una vez antes
 * de cada `pnpm test:e2e`. También se puede correr sola (`pnpm e2e:preparar`),
 * por ejemplo como paso aparte del CI.
 *
 * Por qué reset y no `migrate deploy`: cada corrida arranca de la misma base
 * (los cuatro usuarios, las tres salas y la cartelera del seed), sin lo que
 * dejó la corrida anterior. Una prueba que cuenta filas, como la de
 * concurrencia, no puede depender de cuántas veces se corrió antes.
 *
 * Borrar la base entera solo es aceptable porque es local: antes de tocar
 * nada se carga `.env.e2e` y se exige que DATABASE_URL y DIRECT_URL apunten a
 * localhost (`e2e/entorno.ts`).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

import { cargarEntornoDePruebas, exigirBaseLocal } from "./entorno";

const RAIZ = path.resolve(__dirname, "..");

function prisma(...argumentos: string[]) {
  execFileSync("pnpm", ["exec", "prisma", ...argumentos], {
    cwd: RAIZ,
    env: process.env,
    stdio: "inherit",
  });
}

export default function preparar() {
  cargarEntornoDePruebas();
  exigirBaseLocal();

  // `--skip-seed` para correr el seed como paso propio, con su propio error
  // si falla; `--skip-generate` porque el cliente ya está generado y el build
  // de la app (que puede estar corriendo) lo está usando.
  prisma("migrate", "reset", "--force", "--skip-seed", "--skip-generate");
  prisma("db", "seed");
}

// Corrida suelta: `pnpm e2e:preparar` (tsx e2e/preparar.ts).
if (require.main === module) {
  preparar();
}
