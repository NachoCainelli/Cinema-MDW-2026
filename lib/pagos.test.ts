import { afterEach, describe, expect, it, vi } from "vitest";

import { PRECIO_ENTRADA, cobrar } from "./pagos";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cobrar (pasarela simulada)", () => {
  it("aprueba el pago por defecto: sin la variable puesta no rechaza nada", async () => {
    await expect(cobrar(PRECIO_ENTRADA)).resolves.toEqual({ aprobado: true });
  });

  it("rechaza todos los pagos con la tasa en 1, para poder probar el 402", async () => {
    vi.stubEnv("PAGO_MOCK_TASA_RECHAZO", "1");

    const resultado = await cobrar(PRECIO_ENTRADA);

    expect(resultado.aprobado).toBe(false);
  });

  it("ignora una tasa que no es un número y sigue aprobando", async () => {
    vi.stubEnv("PAGO_MOCK_TASA_RECHAZO", "muchísimo");

    await expect(cobrar(PRECIO_ENTRADA)).resolves.toEqual({ aprobado: true });
  });

  it("rechaza un monto que no es positivo", async () => {
    const resultado = await cobrar(0);

    expect(resultado.aprobado).toBe(false);
  });

  it("el precio de la entrada es un número positivo", () => {
    expect(PRECIO_ENTRADA).toBeGreaterThan(0);
  });
});
