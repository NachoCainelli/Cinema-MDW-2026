/**
 * Prueba trivial de la base de las e2e (#106): la app levanta contra la base
 * local sembrada y la cartelera pública responde, sin sesión.
 *
 * Lo que se espera sale de `docs/spec.md` §5 (paso 4: la cartelera es pública)
 * y del seed (`prisma/seed.ts` programa funciones desde mañana).
 */
import { expect, test } from "@playwright/test";

test("la cartelera responde sin sesión y muestra funciones del seed", async ({ page }) => {
  const respuesta = await page.goto("/cartelera");

  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Cartelera" })).toBeVisible();
  await expect(page.getByText("No hay funciones programadas por ahora")).toHaveCount(0);
});
