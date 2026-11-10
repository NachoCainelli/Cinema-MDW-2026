/**
 * `pnpm test:e2e`: corre `playwright test` con los argumentos que se le pasen.
 *
 * Existe solo por el `--`: pnpm le pasa `pnpm test:e2e -- concurrencia` al
 * script tal cual (`playwright test -- concurrencia`), y Playwright ignora a
 * propósito todo lo que viene después de un `--`, así que el filtro no
 * filtraba y corrían todas las pruebas. Acá se saca ese `--` y el resto llega
 * como filtro. `pnpm test:e2e concurrencia` (sin `--`) funciona igual.
 */
import { spawnSync } from "node:child_process";

const argumentos = process.argv.slice(2);
if (argumentos[0] === "--") argumentos.shift();

const resultado = spawnSync("pnpm", ["exec", "playwright", "test", ...argumentos], {
  stdio: "inherit",
});

if (resultado.error) throw resultado.error;
process.exit(resultado.status ?? 1);
