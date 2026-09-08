/**
 * Configuración de Vitest.
 *
 * Solo está para que los tests resuelvan el alias `@/` igual que Next.js
 * (tsconfig.json → compilerOptions.paths). Sin esto, `import ... from
 * "@/lib/errores"` compila pero falla al correr los tests.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
