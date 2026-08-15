import path from "node:path";
import { config as cargarEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Configuración de Prisma (reemplaza a la clave `prisma` del package.json,
// que quedó deprecada).
//
// Cuando existe este archivo, Prisma deja de leer los .env por su cuenta:
// hay que cargarlos a mano. Usamos .env.local porque es el archivo que
// también usa Next.js en desarrollo, así hay un solo lugar con las variables.
cargarEnv({ path: ".env.local", quiet: true });
cargarEnv({ path: ".env", quiet: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
