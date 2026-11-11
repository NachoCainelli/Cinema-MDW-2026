/**
 * Reglas de "uno solo", probadas con pedidos simultáneos.
 *
 * Lo que se espera sale de `docs/spec.md` §6 y de `docs/api.md`:
 *   - Una función no puede solaparse con otra de la misma sala (margen de 15
 *     minutos): de diez pedidos que se pisan, se crea **una** y los otros nueve
 *     responden 409.
 *   - Una butaca se vende una sola vez por función: de diez compras de la misma
 *     butaca, queda **una** entrada y las otras nueve responden 409.
 *   - En ningún caso un 500: el rechazo de una carrera es un error de negocio.
 *
 * No alcanza con mirar los status: se cuentan las filas en la base, que es lo
 * que la regla protege. La base es la local de las e2e (`e2e/entorno.ts`).
 */
import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import type { Rol } from "@prisma/client";

import { prisma } from "@/lib/db/client";

import { cookieDeSesion } from "./sesiones";

const PEDIDOS_SIMULTANEOS = 10;

/** Cuántas salas compiten a la vez en la prueba de funciones (ver el comentario de esa prueba). */
const SALAS_EN_PARALELO = 5;

/** El header `cookie` de la sesión de ese rol, armado una sola vez antes de disparar. */
async function cookieDe(rol: Rol) {
  const cookie = await cookieDeSesion(rol);
  return `${cookie.name}=${cookie.value}`;
}

async function postComo(request: APIRequestContext, rol: Rol, ruta: string, cuerpo: unknown) {
  return request.post(ruta, { headers: { cookie: await cookieDe(rol) }, data: cuerpo });
}

async function getComo(request: APIRequestContext, rol: Rol, ruta: string) {
  return request.get(ruta, { headers: { cookie: await cookieDe(rol) } });
}

/** Cuántas respuestas hubo de cada status, para que el error diga qué pasó. */
function contarStatus(respuestas: APIResponse[]) {
  const conteo: Record<number, number> = {};
  for (const respuesta of respuestas) {
    conteo[respuesta.status()] = (conteo[respuesta.status()] ?? 0) + 1;
  }
  return conteo;
}

let salasCreadas = 0;

/** Una sala nueva, sin funciones: nada de lo que dejó el seed la toca. */
async function salaVacia(request: APIRequestContext) {
  salasCreadas += 1;
  const respuesta = await postComo(request, "ADMINISTRADOR", "/api/salas", {
    // El nombre es único; el contador evita que dos salas creadas en el mismo
    // milisegundo se llamen igual.
    nombre: `Concurrencia ${Date.now()}-${salasCreadas}`,
    filas: 2,
    columnas: 2,
  });
  expect(respuesta.status()).toBe(201);
  const sala: { id: string } = await respuesta.json();
  return sala.id;
}

/** Una película en cartelera del seed. */
async function unaPelicula(request: APIRequestContext) {
  const respuesta = await getComo(request, "GESTOR_CARTELERA", "/api/peliculas");
  expect(respuesta.status()).toBe(200);
  const [pelicula]: { id: string }[] = await respuesta.json();
  if (!pelicula) throw new Error("El seed no dejó ninguna película en cartelera");
  return pelicula.id;
}

/** Mañana a las 3 de la mañana más `minutos`: en el futuro, sin depender del reloj. */
function manianaALas3(minutos = 0) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  fecha.setUTCHours(6, minutos, 0, 0); // 3:00 en Argentina
  return fecha;
}

test("funciones que se pisan en la misma sala: se crea una sola por sala", async ({ request }) => {
  const peliculaId = await unaPelicula(request);
  const salas = await Promise.all(Array.from({ length: SALAS_EN_PARALELO }, () => salaVacia(request)));

  // La cookie se arma antes: si cada pedido esperara su propia consulta para
  // fabricarla, saldrían escalonados y no simultáneos.
  const cookie = await cookieDe("GESTOR_CARTELERA");

  // En cada sala, diez horarios separados por un minuto: cualquier par se
  // pisa. Las salas van todas a la vez: con un solo grupo de diez, en local
  // la carrera se da pocas veces (la base responde en milisegundos); con más
  // pedidos al mismo tiempo, se da en casi todas las corridas.
  const respuestas = await Promise.all(
    salas.flatMap((salaId) =>
      Array.from({ length: PEDIDOS_SIMULTANEOS }, (_, i) =>
        request.post("/api/funciones", {
          headers: { cookie },
          data: { peliculaId, salaId, inicio: manianaALas3(i).toISOString() },
        }),
      ),
    ),
  );

  const conteo = contarStatus(respuestas);
  const porSala = await Promise.all(salas.map((salaId) => prisma.funcion.count({ where: { salaId } })));
  expect(porSala, `funciones creadas por sala; status: ${JSON.stringify(conteo)}`).toEqual(
    salas.map(() => 1),
  );
  expect(conteo).toEqual({ 201: SALAS_EN_PARALELO, 409: SALAS_EN_PARALELO * (PEDIDOS_SIMULTANEOS - 1) });
});

test("diez compras de la misma butaca: queda una sola entrada", async ({ request }) => {
  const salaId = await salaVacia(request);
  const peliculaId = await unaPelicula(request);

  const creada = await postComo(request, "GESTOR_CARTELERA", "/api/funciones", {
    peliculaId,
    salaId,
    inicio: manianaALas3().toISOString(),
  });
  expect(creada.status()).toBe(201);
  const { id: funcionId }: { id: string } = await creada.json();

  const mapa = await request.get(`/api/funciones/${funcionId}/butacas`);
  const { butacas }: { butacas: { id: string; ocupada: boolean }[] } = await mapa.json();
  const butaca = butacas.find((b) => !b.ocupada);
  if (!butaca) throw new Error("La sala nueva no tiene butacas libres");

  const cookie = await cookieDe("USUARIO");
  const respuestas = await Promise.all(
    Array.from({ length: PEDIDOS_SIMULTANEOS }, () =>
      request.post("/api/compras", { headers: { cookie }, data: { funcionId, butacaIds: [butaca.id] } }),
    ),
  );

  const conteo = contarStatus(respuestas);
  expect(
    await prisma.entrada.count({ where: { funcionId, butacaId: butaca.id } }),
    `status: ${JSON.stringify(conteo)}`,
  ).toBe(1);
  expect(conteo).toEqual({ 201: 1, 409: PEDIDOS_SIMULTANEOS - 1 });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
