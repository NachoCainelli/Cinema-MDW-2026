/**
 * Prueba de humo de `e2e/sesiones.ts`: la cookie fabricada para cada rol es
 * una sesión que la app acepta, con el rol de la cuenta del seed.
 *
 * Cada rol entra a una pantalla que es solo suya (mapa de pantallas,
 * `docs/spec.md` §5) y la barra muestra quién es y con qué rol. Si la cookie
 * estuviera mal firmada, la app la trataría como "sin sesión" y no aparecería
 * la barra.
 */
import { expect, test } from "@playwright/test";
import type { Rol } from "@prisma/client";

import { iniciarSesionComo } from "./sesiones";

const CASOS: { rol: Rol; pantalla: string; etiqueta: string }[] = [
  { rol: "ADMINISTRADOR", pantalla: "/sistema", etiqueta: "Administrador" },
  { rol: "GESTOR_CARTELERA", pantalla: "/gestion/funciones/nueva", etiqueta: "Gestor de cartelera" },
  { rol: "USUARIO", pantalla: "/compras", etiqueta: "Usuario" },
];

for (const { rol, pantalla, etiqueta } of CASOS) {
  test(`la sesión fabricada de ${rol} entra a ${pantalla}`, async ({ context, page }) => {
    await iniciarSesionComo(context, rol);

    const respuesta = await page.goto(pantalla);

    expect(respuesta?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(pantalla);
    const barra = page.getByRole("navigation", { name: "Principal" });
    await expect(barra.getByText(etiqueta, { exact: true })).toBeVisible();
    await expect(barra.getByRole("button", { name: "Salir" })).toBeVisible();
  });
}
