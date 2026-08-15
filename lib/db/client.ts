/**
 * Único lugar del proyecto donde se instancia Prisma.
 *
 * En desarrollo, Next.js recarga los módulos en cada cambio. Si creáramos un
 * PrismaClient nuevo en cada recarga, terminaríamos con decenas de conexiones
 * abiertas y Postgres empezaría a rechazarlas. Por eso lo guardamos en el
 * objeto global: en desarrollo se reutiliza, en producción se crea una sola vez.
 */
import { PrismaClient } from "@prisma/client";

const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
