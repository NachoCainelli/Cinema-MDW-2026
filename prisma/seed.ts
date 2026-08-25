/**
 * Datos de ejemplo para desarrollo.
 *
 * Correr con: pnpm db:seed
 *
 * Por qué existe: para que los cuatro integrantes del equipo trabajen contra
 * los mismos datos y para poder mostrar el sistema sin cargar todo a mano.
 * Debe poder correrse varias veces sin romper, por eso usa upsert (o
 * find-o-create, en las entidades sin una clave única natural).
 *
 * Recorre el flujo completo (ver docs/spec.md, sección 5): un gestor publica
 * una función, un usuario la compra y queda una butaca ocupada.
 *
 * `passwordHash` es un valor de ejemplo, no un hash real — se reemplaza en la
 * clase 6, cuando se cablea Auth.js.
 */
import { PrismaClient, Rol, Clasificacion, Categoria } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@ejemplo.com" },
    update: {},
    create: {
      email: "admin@ejemplo.com",
      nombre: "Admin de ejemplo",
      passwordHash: "seed-no-es-un-hash-real",
      rol: Rol.ADMINISTRADOR,
    },
  });
  void admin;

  const gestor = await prisma.usuario.upsert({
    where: { email: "gestor@ejemplo.com" },
    update: {},
    create: {
      email: "gestor@ejemplo.com",
      nombre: "Gestor de cartelera de ejemplo",
      passwordHash: "seed-no-es-un-hash-real",
      rol: Rol.GESTOR_CARTELERA,
    },
  });
  void gestor;

  const usuario = await prisma.usuario.upsert({
    where: { email: "usuario@ejemplo.com" },
    update: {},
    create: {
      email: "usuario@ejemplo.com",
      nombre: "Usuario de ejemplo",
      passwordHash: "seed-no-es-un-hash-real",
      rol: Rol.USUARIO,
    },
  });

  // Sala 1: 5 filas x 8 columnas = 40 butacas, generadas automáticamente
  // (regla de negocio, sección 6 del spec).
  const sala = await prisma.sala.upsert({
    where: { nombre: "Sala 1" },
    update: {},
    create: { nombre: "Sala 1", filas: 5, columnas: 8 },
  });

  const butacas = [];
  for (let fila = 1; fila <= sala.filas; fila++) {
    for (let columna = 1; columna <= sala.columnas; columna++) {
      butacas.push({ salaId: sala.id, fila, columna });
    }
  }
  await prisma.butaca.createMany({ data: butacas, skipDuplicates: true });

  let pelicula = await prisma.pelicula.findFirst({ where: { titulo: "Película de ejemplo" } });
  if (!pelicula) {
    pelicula = await prisma.pelicula.create({
      data: {
        titulo: "Película de ejemplo",
        sinopsis: "Datos de ejemplo para desarrollo.",
        duracionMinutos: 110,
        clasificacion: Clasificacion.ATP,
        categoria: Categoria.ACCION,
      },
    });
  }

  // Mañana a las 20:00, para que nunca quede en el pasado (regla de H3).
  const inicio = new Date();
  inicio.setDate(inicio.getDate() + 1);
  inicio.setHours(20, 0, 0, 0);

  let funcion = await prisma.funcion.findFirst({
    where: { peliculaId: pelicula.id, salaId: sala.id },
  });
  if (!funcion) {
    funcion = await prisma.funcion.create({
      data: { peliculaId: pelicula.id, salaId: sala.id, inicio },
    });
  }

  const primeraButaca = await prisma.butaca.findFirstOrThrow({
    where: { salaId: sala.id, fila: 1, columna: 1 },
  });

  const entradaExistente = await prisma.entrada.findFirst({
    where: { funcionId: funcion.id, butacaId: primeraButaca.id },
  });
  if (!entradaExistente) {
    // Una Compra con una Entrada: la butaca (1,1) de la función queda
    // ocupada; el resto de las butacas de la sala quedan libres.
    await prisma.compra.create({
      data: {
        usuarioId: usuario.id,
        entradas: {
          create: [{ funcionId: funcion.id, butacaId: primeraButaca.id }],
        },
      },
    });
  }

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
