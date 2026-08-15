/**
 * Datos de ejemplo para desarrollo.
 *
 * Correr con: npm run db:seed
 *
 * Por qué existe: para que los cuatro integrantes del equipo trabajen contra
 * los mismos datos y para poder mostrar el sistema sin cargar todo a mano.
 * Debe poder correrse varias veces sin romper (por eso usamos upsert).
 */
import { PrismaClient, Rol } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@ejemplo.com" },
    update: {},
    create: {
      email: "admin@ejemplo.com",
      nombre: "Admin de ejemplo",
      rol: Rol.ADMIN,
    },
  });

  await prisma.nota.deleteMany({ where: { autorId: admin.id } });

  await prisma.nota.createMany({
    data: [
      { titulo: "Primera nota", contenido: "Datos de ejemplo.", autorId: admin.id },
      { titulo: "Segunda nota", contenido: "Borrar en la clase 3.", autorId: admin.id },
    ],
  });

  console.log("Seed completo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
