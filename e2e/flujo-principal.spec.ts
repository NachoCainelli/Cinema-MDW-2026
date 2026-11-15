/**
 * El flujo principal de punta a punta (`docs/spec.md` §5), desde la UI: un
 * `test.step` por cada uno de los ocho pasos, con las pantallas del mapa de
 * §5. Dos personas, cada una en su navegador: el gestor (sesión del seed) y
 * un usuario que se registra en el paso 3.
 *
 * Dos casos de error en el medio, los dos visibles en pantalla:
 *   - Paso 1: el primer horario que elige el gestor se pisa con otra función
 *     de la sala (§6, margen de 15 minutos). El rechazo va arriba del
 *     formulario y lo que había elegido sigue ahí (§7, AGENTS.md).
 *   - Paso 6: mientras el usuario elegía, otra sesión compró una de sus
 *     butacas (§6, sin reserva temporal). Al confirmar ve el 409 arriba, la
 *     butaca perdida pasa a ocupada y el resto de la selección se conserva.
 *
 * Lo que se espera sale de la spec y de `docs/api.md` (tabla de mensajes de
 * error), no de mirar los componentes. Las búsquedas son por rol, etiqueta o
 * texto, como las haría una persona.
 *
 * Lo que no es parte del flujo —crear la sala y las películas, y la compra de
 * "la otra sesión"— se hace por la API con las cuentas del seed, igual que en
 * `concurrencia.spec.ts`.
 */
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import type { Rol } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { desdeHoraDelCine, formatearFecha } from "@/lib/utils";

import { USUARIO_B_DEL_SEED, cookieDeSesion, iniciarSesionComo } from "./sesiones";

/** Para que dos corridas sobre la misma base no choquen con nombres únicos (la sala). */
const SUFIJO = Date.now().toString(36);

const SALA = { nombre: `Sala del flujo ${SUFIJO}`, filas: 3, columnas: 4 };
const BUTACAS_DE_LA_SALA = SALA.filas * SALA.columnas;

/** La película que el gestor programa y el usuario compra. */
const PELICULA = { titulo: `Flujo principal ${SUFIJO}`, duracionMinutos: 100 };

/** La que ya ocupa la sala a la mañana: contra esta choca el primer intento del gestor. */
const PELICULA_QUE_OCUPA_LA_SALA = { titulo: `Ensayo técnico ${SUFIJO}`, duracionMinutos: 120 };

/** Pasado mañana en el cine, como lo escribe un `<input type="datetime-local">`. */
function pasadoManiana(hora: string) {
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
  return `${fecha}T${hora}`;
}

// La función que ya está: 10:00 a 12:00. Con el margen, la sala se libera a las 12:15.
const INICIO_OCUPADO = pasadoManiana("10:00");
const INICIO_QUE_SE_PISA = pasadoManiana("11:00");
const INICIO_LIBRE = pasadoManiana("20:00");

async function postComo(
  request: APIRequestContext,
  rol: Rol,
  ruta: string,
  cuerpo: unknown,
  email?: string,
) {
  const cookie = await cookieDeSesion(rol, email);
  const respuesta = await request.post(ruta, {
    headers: { cookie: `${cookie.name}=${cookie.value}` },
    data: cuerpo,
  });
  expect(respuesta.status(), `POST ${ruta}: ${await respuesta.text()}`).toBe(201);
  return (await respuesta.json()) as { id: string };
}

async function crearPelicula(request: APIRequestContext, datos: typeof PELICULA) {
  return postComo(request, "GESTOR_CARTELERA", "/api/peliculas", {
    ...datos,
    sinopsis: "Película creada por la prueba del flujo principal.",
    clasificacion: "ATP",
    categoria: "DRAMA",
  });
}

/** Un link del menú principal del encabezado, que cambia según el rol (`lib/navegacion.ts`). */
function linkDelMenu(page: Page, nombre: string) {
  return page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: nombre });
}

async function navegadorCon(browser: Browser, rol?: Rol) {
  const context = await browser.newContext();
  if (rol) await iniciarSesionComo(context, rol);
  return { context, page: await context.newPage() };
}

test("el flujo principal de spec §5, de la función publicada a la compra en el historial", async ({
  browser,
  request,
}) => {
  // Son ocho pasos con dos personas, cada uno con varias navegaciones: más que
  // los 30 segundos por defecto de una prueba.
  test.setTimeout(60_000);

  // Lo que el administrador y el gestor ya cargaron antes del flujo.
  const { id: salaId } = await postComo(request, "ADMINISTRADOR", "/api/salas", SALA);
  await crearPelicula(request, PELICULA);
  const { id: peliculaQueOcupaId } = await crearPelicula(request, PELICULA_QUE_OCUPA_LA_SALA);
  await postComo(request, "GESTOR_CARTELERA", "/api/funciones", {
    peliculaId: peliculaQueOcupaId,
    salaId,
    inicio: desdeHoraDelCine(INICIO_OCUPADO),
  });

  const gestor = await navegadorCon(browser, "GESTOR_CARTELERA");
  const usuario = await navegadorCon(browser);
  const opcionDePelicula = `${PELICULA.titulo} · ${PELICULA.duracionMinutos} min`;
  const horario = formatearFecha(new Date(desdeHoraDelCine(INICIO_LIBRE)));

  /** La tarjeta de la función en la cartelera: la película, en esta sala y a este horario. */
  const tarjetaDeLaFuncion = (page: Page) =>
    page.getByRole("listitem").filter({ hasText: `${SALA.nombre} · ${horario}` });

  await test.step("1. El gestor crea la función, respetando el margen de 15 minutos", async () => {
    const { page } = gestor;
    const inicio = page.getByRole("textbox", { name: "Inicio", exact: true });
    await page.goto("/");
    await linkDelMenu(page, "Nueva función").click();
    await expect(page.getByRole("heading", { level: 1, name: "Nueva función" })).toBeVisible();

    await page.getByRole("combobox", { name: "Película" }).click();
    await page.getByRole("option", { name: opcionDePelicula }).click();
    await page.getByRole("combobox", { name: "Sala" }).click();
    await page.getByRole("option", { name: SALA.nombre }).click();
    await inicio.fill(INICIO_QUE_SE_PISA);
    await page.getByRole("button", { name: "Crear función" }).click();

    // El rechazo de la regla va arriba del formulario (docs/api.md, mensajes de 409).
    const rechazo = page.getByRole("alert").filter({ hasText: "No se pudo crear la función" });
    await expect(rechazo).toContainText(
      `La sala ${SALA.nombre} ya tiene la función de "${PELICULA_QUE_OCUPA_LA_SALA.titulo}"`,
    );
    await expect(rechazo).toContainText("tienen que quedar al menos 15 minutos");

    // Un formulario que falla no se vacía.
    await expect(page.getByRole("combobox", { name: "Película" })).toHaveText(opcionDePelicula);
    await expect(page.getByRole("combobox", { name: "Sala" })).toHaveText(SALA.nombre);
    await expect(inicio).toHaveValue(INICIO_QUE_SE_PISA);

    await inicio.fill(INICIO_LIBRE);
    await page.getByRole("button", { name: "Crear función" }).click();
    await expect(page).toHaveURL(/\/cartelera$/);
  });

  await test.step("2. La función queda publicada en la cartelera pública", async () => {
    // La ve alguien sin sesión, no solo el gestor que la creó.
    const { page } = usuario;
    await page.goto("/cartelera");
    await page.getByLabel("Buscar por película", { exact: true }).fill(PELICULA.titulo);
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(tarjetaDeLaFuncion(page).getByRole("link", { name: PELICULA.titulo })).toBeVisible();
  });

  const email = `flujo-${SUFIJO}@ejemplo.com`;

  await test.step("3. El usuario se registra", async () => {
    const { page } = usuario;
    await page.goto("/registrarse");
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Persona del flujo principal");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await page.getByLabel("Contraseña").fill("una-contraseña-larga");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // El registro deja la sesión iniciada (H1): aparece lo que solo ve un USUARIO.
    await expect(linkDelMenu(page, "Mis compras")).toBeVisible();
  });

  await test.step("4. El usuario ve la cartelera y elige la función", async () => {
    const { page } = usuario;
    await linkDelMenu(page, "Cartelera").click();
    await page.getByLabel("Buscar por película", { exact: true }).fill(PELICULA.titulo);
    await page.getByRole("button", { name: "Buscar" }).click();
    await tarjetaDeLaFuncion(page).getByRole("link", { name: PELICULA.titulo }).click();

    await expect(page.getByRole("heading", { level: 1, name: PELICULA.titulo })).toBeVisible();
    await expect(page.getByText(`${SALA.nombre} · ${horario}`)).toBeVisible();
    await expect(
      page.getByText(`${BUTACAS_DE_LA_SALA} butacas libres de ${BUTACAS_DE_LA_SALA}.`),
    ).toBeVisible();
  });

  const butaca = (columna: number) =>
    usuario.page.getByRole("button", { name: `Fila 1 · Butaca ${columna}`, exact: true });

  await test.step("5. El usuario selecciona tres butacas libres", async () => {
    for (const columna of [1, 2, 3]) {
      await butaca(columna).click();
      await expect(butaca(columna)).toHaveAttribute("aria-pressed", "true");
    }
    await expect(usuario.page.getByText(/^3 butacas ·/)).toBeVisible();
  });

  let urlDeLaCompra = "";

  await test.step("6. Confirma la compra; una butaca se vendió mientras elegía", async () => {
    const { page } = usuario;
    const funcionId = new URL(page.url()).pathname.split("/").at(-1)!;

    // Otra persona compra la Fila 1 · Butaca 1 antes de que este usuario confirme.
    const mapa = await request.get(`/api/funciones/${funcionId}/butacas`);
    const { butacas }: { butacas: { id: string; fila: number; columna: number }[] } =
      await mapa.json();
    const primera = butacas.find((b) => b.fila === 1 && b.columna === 1);
    if (!primera) throw new Error("La sala no tiene Fila 1 · Butaca 1");
    await postComo(
      request,
      "USUARIO",
      "/api/compras",
      { funcionId, butacaIds: [primera.id] },
      USUARIO_B_DEL_SEED,
    );

    await page.getByRole("button", { name: "Confirmar compra" }).click();

    // El 409 va arriba, dice qué butaca se perdió y que no se cobró nada.
    const rechazo = page.getByRole("alert").filter({ hasText: "No se pudo confirmar la compra" });
    await expect(rechazo).toContainText(
      "Una de las butacas que elegiste ya fue vendida para esta función. No se te cobró nada",
    );
    await expect(rechazo.getByRole("listitem")).toHaveText(["Fila 1 · Butaca 1"]);
    await expect(rechazo).toContainText("Las demás butacas que habías elegido siguen elegidas.");

    // La vendida pasa a ocupada; las otras dos siguen elegidas (§7: no se pierde la selección).
    await expect(
      page.getByRole("button", { name: "Fila 1 · Butaca 1: ocupada", exact: true }),
    ).toBeDisabled();
    await expect(butaca(2)).toHaveAttribute("aria-pressed", "true");
    await expect(butaca(3)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/^2 butacas ·/)).toBeVisible();

    await page.getByRole("button", { name: "Confirmar compra" }).click();
    await expect(page).toHaveURL(/\/compras\/[^/]+$/);
    urlDeLaCompra = page.url();
  });

  await test.step("7. Las butacas compradas quedan ocupadas para esa función", async () => {
    const { page } = usuario;
    await page.goBack();
    await page.reload();

    // 12 butacas: una la compró la otra sesión y dos este usuario.
    await expect(
      page.getByText(`${BUTACAS_DE_LA_SALA - 3} butacas libres de ${BUTACAS_DE_LA_SALA}.`),
    ).toBeVisible();
    for (const columna of [1, 2, 3]) {
      await expect(
        page.getByRole("button", { name: `Fila 1 · Butaca ${columna}: ocupada`, exact: true }),
      ).toBeDisabled();
    }
    await expect(butaca(4)).toBeEnabled();
  });

  await test.step("8. El usuario ve su compra confirmada, con sus entradas, en el historial", async () => {
    const { page } = usuario;
    await linkDelMenu(page, "Mis compras").click();
    await expect(page.getByRole("heading", { level: 1, name: "Mis compras" })).toBeVisible();

    const compra = page.getByRole("listitem").filter({ hasText: PELICULA.titulo });
    await expect(compra).toContainText(`${SALA.nombre} · ${horario}`);
    await expect(compra).toContainText("2 entradas");
    await compra.getByRole("link", { name: "Ver detalle" }).click();

    await expect(page).toHaveURL(urlDeLaCompra);
    await expect(page.getByText(PELICULA.titulo)).toBeVisible();
    await expect(page.getByText("Pagada")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Entradas (2)" })).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveText(["Fila 1 · Butaca 2", "Fila 1 · Butaca 3"]);
  });

  await gestor.context.close();
  await usuario.context.close();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
