/**
 * Configuración de Vitest.
 *
 * Solo está para que los tests resuelvan el alias `@/` igual que Next.js
 * (tsconfig.json → compilerOptions.paths). Sin esto, `import ... from
 * "@/lib/errores"` compila pero falla al correr los tests.
 *
 * `e2e/` queda afuera: esos `.spec.ts` son de Playwright y corren con
 * `pnpm test:e2e`, contra la app levantada y la base local.
 */
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
