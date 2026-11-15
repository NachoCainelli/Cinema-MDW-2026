/**
 * Permisos de la API: una prueba por cada fila de la columna "Rol autorizado"
 * de `docs/api.md` (15 filas).
 *
 * Lo que se espera sale del contrato, no del código:
 *   - Sin sesión, una ruta protegida responde 401; con otro rol, 403
 *     ("Reglas generales de error" y "Errores transversales").
 *   - El 401/403 sale **antes** de validar el request (orden de `AGENTS.md`:
 *     sesión → rol → body/query → negocio). Por eso cada pedido sin sesión o
 *     con otro rol va con el body o la query rotos a propósito: si la
 *     validación se adelantara, la respuesta sería 400 y la prueba fallaría.
 *   - Con el rol correcto, ese mismo pedido roto pasa la autorización y llega
 *     a la validación (400) o a la búsqueda del recurso (404). Esto evita que
 *     una ruta que le responde 403 a todo el mundo pase como "protegida".
 *   - Una compra ajena responde lo mismo que una inexistente: 404, nunca 403.
 *
 * Si una de estas pruebas falla, se arregla el código, no la prueba.
 */
import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import type { Rol } from "@prisma/client";

import { USUARIO_B_DEL_SEED, cookieDeSesion } from "./sesiones";

const ROLES: Rol[] = ["ADMINISTRADOR", "GESTOR_CARTELERA", "USUARIO"];

/** Un id con forma válida que no existe en la base. */
const ID_INEXISTENTE = "no-existe-en-la-base";

/** JSON mal formado: si se validara antes de autorizar, respondería 400. */
const JSON_ROTO = "{ esto no es json";

/** Una query fuera de rango para los listados (`limite` va de 1 a 100). */
const QUERY_ROTA = "?limite=0";

type Metodo = "GET" | "POST" | "PATCH" | "DELETE";

type Pedido = {
  metodo: Metodo;
  ruta: string;
  /** Cuerpo crudo; va con Content-Type application/json. */
  cuerpo?: string;
};

/** Una cuenta del seed: el rol y, si no es la de por defecto, el email. */
type Sesion = { rol: Rol; email?: string };

async function pedir(
  request: APIRequestContext,
  { metodo, ruta, cuerpo }: Pedido,
  sesion?: Sesion,
): Promise<APIResponse> {
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers["content-type"] = "application/json";
  if (sesion) {
    const cookie = await cookieDeSesion(sesion.rol, sesion.email);
    headers.cookie = `${cookie.name}=${cookie.value}`;
  }
  return request.fetch(ruta, { method: metodo, headers, data: cuerpo, maxRedirects: 0 });
}

type FilaProtegida = {
  pedido: Pedido;
  rol: Rol;
  /** Lo que responde el rol correcto con este mismo pedido roto. */
  conSuRol: 400 | 404;
};

/** Las 12 filas protegidas de `docs/api.md`, con un pedido roto para cada una. */
const FILAS_PROTEGIDAS: FilaProtegida[] = [
  { pedido: { metodo: "POST", ruta: "/api/salas", cuerpo: JSON_ROTO }, rol: "ADMINISTRADOR", conSuRol: 400 },
  { pedido: { metodo: "GET", ruta: `/api/salas${QUERY_ROTA}` }, rol: "ADMINISTRADOR", conSuRol: 400 },
  { pedido: { metodo: "DELETE", ruta: `/api/salas/${ID_INEXISTENTE}` }, rol: "ADMINISTRADOR", conSuRol: 404 },
  { pedido: { metodo: "POST", ruta: "/api/peliculas", cuerpo: JSON_ROTO }, rol: "GESTOR_CARTELERA", conSuRol: 400 },
  // Sin multipart/form-data: el body no tiene el formato que el endpoint espera.
  { pedido: { metodo: "POST", ruta: "/api/peliculas/imagen", cuerpo: JSON_ROTO }, rol: "GESTOR_CARTELERA", conSuRol: 400 },
  { pedido: { metodo: "GET", ruta: `/api/peliculas${QUERY_ROTA}` }, rol: "GESTOR_CARTELERA", conSuRol: 400 },
  { pedido: { metodo: "PATCH", ruta: `/api/peliculas/${ID_INEXISTENTE}`, cuerpo: JSON_ROTO }, rol: "GESTOR_CARTELERA", conSuRol: 400 },
  { pedido: { metodo: "DELETE", ruta: `/api/peliculas/${ID_INEXISTENTE}` }, rol: "GESTOR_CARTELERA", conSuRol: 404 },
  { pedido: { metodo: "POST", ruta: "/api/funciones", cuerpo: JSON_ROTO }, rol: "GESTOR_CARTELERA", conSuRol: 400 },
  { pedido: { metodo: "POST", ruta: "/api/compras", cuerpo: JSON_ROTO }, rol: "USUARIO", conSuRol: 400 },
  { pedido: { metodo: "GET", ruta: `/api/compras${QUERY_ROTA}` }, rol: "USUARIO", conSuRol: 400 },
  { pedido: { metodo: "GET", ruta: `/api/compras/${ID_INEXISTENTE}` }, rol: "USUARIO", conSuRol: 404 },
];

/** La ruta tal como figura en `docs/api.md` (`/api/salas/:id`), para el nombre de la prueba. */
function rutaDelContrato(ruta: string) {
  return ruta.replace(QUERY_ROTA, "").replace(ID_INEXISTENTE, ":id");
}

test.describe("rutas protegidas", () => {
  for (const { pedido, rol, conSuRol } of FILAS_PROTEGIDAS) {
    test(`${pedido.metodo} ${rutaDelContrato(pedido.ruta)} es solo de ${rol}`, async ({ request }) => {
      await test.step("sin sesión: 401, aunque el request venga roto", async () => {
        const respuesta = await pedir(request, pedido);
        expect(respuesta.status()).toBe(401);
        expect(await respuesta.json()).toEqual({ error: "Necesitás iniciar sesión" });
      });

      for (const otroRol of ROLES.filter((r) => r !== rol)) {
        await test.step(`con sesión de ${otroRol}: 403, aunque el request venga roto`, async () => {
          const respuesta = await pedir(request, pedido, { rol: otroRol });
          expect(respuesta.status()).toBe(403);
          expect(await respuesta.json()).toEqual({ error: "No tenés permiso para hacer esto" });
        });
      }

      await test.step(`con sesión de ${rol}: pasa la autorización y responde ${conSuRol}`, async () => {
        const respuesta = await pedir(request, pedido, { rol });
        expect(respuesta.status()).toBe(conSuRol);
      });
    });
  }

  test("GET /api/compras/:id: una compra ajena responde lo mismo que una inexistente", async ({ request }) => {
    // La compra del seed es de usuario@ejemplo.com (`prisma/seed.ts`).
    const historial = await pedir(request, { metodo: "GET", ruta: "/api/compras" }, { rol: "USUARIO" });
    expect(historial.status()).toBe(200);
    const compras: { id: string }[] = await historial.json();
    const [primera] = compras;
    if (!primera) throw new Error("El seed no dejó ninguna compra de usuario@ejemplo.com");
    const compraDeA = primera.id;

    await test.step("su dueño la ve: 200", async () => {
      const respuesta = await pedir(request, { metodo: "GET", ruta: `/api/compras/${compraDeA}` }, { rol: "USUARIO" });
      expect(respuesta.status()).toBe(200);
    });

    const usuarioB: Sesion = { rol: "USUARIO", email: USUARIO_B_DEL_SEED };
    const ajena = await pedir(request, { metodo: "GET", ruta: `/api/compras/${compraDeA}` }, usuarioB);
    const inexistente = await pedir(request, { metodo: "GET", ruta: `/api/compras/${ID_INEXISTENTE}` }, usuarioB);

    await test.step("otro usuario la pide: 404, nunca 403", async () => {
      expect(ajena.status()).toBe(404);
      expect(inexistente.status()).toBe(404);
    });

    await test.step("el cuerpo es el mismo que el de una compra inexistente, salvo el id", async () => {
      const cuerpoAjena: { error: string } = await ajena.json();
      const cuerpoInexistente: { error: string } = await inexistente.json();
      expect(cuerpoAjena.error.replace(compraDeA, "<id>")).toBe(
        cuerpoInexistente.error.replace(ID_INEXISTENTE, "<id>"),
      );
      expect(Object.keys(cuerpoAjena)).toEqual(Object.keys(cuerpoInexistente));
    });
  });
});

test.describe("rutas públicas", () => {
  test("POST /api/usuarios responde sin sesión", async ({ request }) => {
    const respuesta = await pedir(request, {
      metodo: "POST",
      ruta: "/api/usuarios",
      cuerpo: JSON.stringify({
        email: `permisos.${Date.now()}@ejemplo.com`,
        nombre: "Prueba de permisos",
        password: "una-contraseña-larga",
      }),
    });
    expect(respuesta.status()).toBe(201);
  });

  test("GET /api/funciones responde sin sesión", async ({ request }) => {
    const respuesta = await pedir(request, { metodo: "GET", ruta: "/api/funciones" });
    expect(respuesta.status()).toBe(200);
  });

  test("GET /api/funciones/:id/butacas responde sin sesión", async ({ request }) => {
    const cartelera = await pedir(request, { metodo: "GET", ruta: "/api/funciones" });
    const { funciones }: { funciones: { id: string }[] } = await cartelera.json();
    const [primera] = funciones;
    if (!primera) throw new Error("El seed no dejó ninguna función en la cartelera");

    const respuesta = await pedir(request, { metodo: "GET", ruta: `/api/funciones/${primera.id}/butacas` });
    expect(respuesta.status()).toBe(200);
  });
});
