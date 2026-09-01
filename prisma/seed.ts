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
 * funciones, un usuario compra y quedan butacas ocupadas.
 *
 * El catálogo de películas vive en `prisma/data/peliculas.ts`.
 *
 * `passwordHash` es un valor de ejemplo, no un hash real — se reemplaza en la
 * clase 6, cuando se cablea Auth.js.
 */
import { PrismaClient, Rol } from "@prisma/client";
import { peliculas } from "./data/peliculas";

const prisma = new PrismaClient();

/** Salas del cine de ejemplo. Las butacas se generan a partir de filas x columnas. */
const SALAS = [
  { nombre: "Sala 1", filas: 5, columnas: 8 },
  { nombre: "Sala 2", filas: 6, columnas: 10 },
  { nombre: "Sala 3", filas: 4, columnas: 6 },
];

/**
 * Horarios fijos de cada sala, en hora local.
 *
 * Están separados a propósito: entre un slot y el siguiente hay más de 3 horas,
 * así que aun con la película más larga del catálogo (169 min) se respeta la
 * regla de los 15 minutos de margen entre funciones de una misma sala
 * (docs/spec.md, sección 6). Si se agregan títulos más largos, revisar esto.
 */
const HORARIOS = [
  { hora: 14, minuto: 0 },
  { hora: 18, minuto: 0 },
  { hora: 21, minuto: 30 },
];

/** Cuántos días de cartelera se programan, empezando mañana. */
const DIAS_DE_CARTELERA = 5;

async function main() {
  const usuarios = [
    {
      email: "admin@ejemplo.com",
      nombre: "Admin de ejemplo",
      rol: Rol.ADMINISTRADOR,
    },
    {
      email: "gestor@ejemplo.com",
      nombre: "Gestor de cartelera de ejemplo",
      rol: Rol.GESTOR_CARTELERA,
    },
    {
      email: "usuario@ejemplo.com",
      nombre: "Usuario de ejemplo",
      rol: Rol.USUARIO,
    },
  ];

  for (const { email, nombre, rol } of usuarios) {
    await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: { email, nombre, passwordHash: "seed-no-es-un-hash-real", rol },
    });
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { email: "usuario@ejemplo.com" },
  });

  // El spec (sección 6) pide que las butacas se generen a partir de filas x
  // columnas al crear la sala. Acá lo hace el seed a mano: no hay todavía un
  // lib/db/sala.ts que encapsule esa regla, así que cuando exista hay que
  // reemplazar este bloque por esa función y no duplicar la lógica.
  const salas = [];
  for (const datosSala of SALAS) {
    const sala = await prisma.sala.upsert({
      where: { nombre: datosSala.nombre },
      update: {},
      create: datosSala,
    });

    const butacas = [];
    for (let fila = 1; fila <= sala.filas; fila++) {
      for (let columna = 1; columna <= sala.columnas; columna++) {
        butacas.push({ salaId: sala.id, fila, columna });
      }
    }
    await prisma.butaca.createMany({ data: butacas, skipDuplicates: true });

    salas.push(sala);
  }

  // Película no tiene clave única natural (dos estrenos pueden compartir
  // título), así que la idempotencia es find-o-create por título.
  const peliculasCreadas = [];
  for (const datosPelicula of peliculas) {
    let pelicula = await prisma.pelicula.findFirst({
      where: { titulo: datosPelicula.titulo },
    });
    if (!pelicula) {
      pelicula = await prisma.pelicula.create({ data: datosPelicula });
    }
    peliculasCreadas.push(pelicula);
  }

  // Cartelera: cada sala proyecta, en cada uno de sus tres horarios, una
  // película distinta, rotando el catálogo. Arranca mañana para que ninguna
  // función quede en el pasado (regla de H3).
  const funciones = [];
  let indicePelicula = 0;

  for (let dia = 1; dia <= DIAS_DE_CARTELERA; dia++) {
    for (const sala of salas) {
      for (const { hora, minuto } of HORARIOS) {
        const pelicula = peliculasCreadas[indicePelicula % peliculasCreadas.length];
        if (!pelicula) throw new Error("El catálogo de películas quedó vacío.");
        indicePelicula++;

        const inicio = new Date();
        inicio.setDate(inicio.getDate() + dia);
        inicio.setHours(hora, minuto, 0, 0);

        // Una sala no puede tener dos funciones al mismo tiempo: alcanza con
        // buscar por (sala, inicio) para no duplicar al re-correr el seed.
        let funcion = await prisma.funcion.findFirst({
          where: { salaId: sala.id, inicio },
        });
        if (!funcion) {
          funcion = await prisma.funcion.create({
            data: { peliculaId: pelicula.id, salaId: sala.id, inicio },
          });
        }
        funciones.push(funcion);
      }
    }
  }

  // Una compra de ejemplo sobre la primera función: deja tres butacas ocupadas
  // y el resto de la sala libre, para poder ver el mapa de butacas con ambos
  // estados sin comprar nada a mano.
  const primeraFuncion = funciones[0];
  if (!primeraFuncion) throw new Error("No se generó ninguna función.");
  const BUTACAS_A_VENDER = [1, 2, 3];
  const butacasVendidas = await prisma.butaca.findMany({
    where: {
      salaId: primeraFuncion.salaId,
      fila: 1,
      columna: { in: BUTACAS_A_VENDER },
    },
  });

  // Si la sala ya existía con otra configuración, el upsert de más arriba
  // conserva sus filas/columnas originales y puede no haber tres butacas en la
  // fila 1. Cortamos acá en vez de crear una compra incompleta: el spec pide
  // que una Compra agrupe una o más Entradas, y una compra con menos butacas
  // de las que dice el comentario esconde el problema en lugar de mostrarlo.
  if (butacasVendidas.length !== BUTACAS_A_VENDER.length) {
    throw new Error(
      `Se esperaban ${BUTACAS_A_VENDER.length} butacas en la fila 1 de la sala ` +
        `de la primera función y se encontraron ${butacasVendidas.length}. ` +
        `Suele pasar cuando la sala ya existía en la base con otras dimensiones.`,
    );
  }

  const entradaExistente = await prisma.entrada.findFirst({
    where: { funcionId: primeraFuncion.id },
  });
  if (!entradaExistente) {
    await prisma.compra.create({
      data: {
        usuarioId: usuario.id,
        entradas: {
          create: butacasVendidas.map((butaca) => ({
            funcionId: primeraFuncion.id,
            butacaId: butaca.id,
          })),
        },
      },
    });
  }

  console.log(
    `Seed completo: ${usuarios.length} usuarios, ${salas.length} salas, ` +
      `${peliculasCreadas.length} películas, ${funciones.length} funciones.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
