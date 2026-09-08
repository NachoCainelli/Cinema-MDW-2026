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

/**
 * `PRECIO_ENTRADA` se resuelve al cargar el módulo, así que cada caso necesita
 * su propia importación: por eso el `resetModules` y el `import()` dinámico.
 */
describe("PRECIO_ENTRADA", () => {
  async function importarConPrecio(configurado?: string) {
    vi.resetModules();
    vi.stubEnv("PRECIO_ENTRADA", configurado);
    return import("./pagos");
  }

  it("usa el precio por defecto si la variable no está", async () => {
    const { PRECIO_ENTRADA: precio } = await importarConPrecio();

    expect(precio).toBe(5000);
  });

  it("usa el precio por defecto si la variable quedó vacía, y no 0", async () => {
    // Es lo que pasa al copiar .env.example tal cual: `Number("")` es 0, y un
    // precio en 0 haría que toda compra respondiera 402.
    const { PRECIO_ENTRADA: precio } = await importarConPrecio("");

    expect(precio).toBe(5000);
  });

  it("toma el precio configurado", async () => {
    const { PRECIO_ENTRADA: precio } = await importarConPrecio("7500");

    expect(precio).toBe(7500);
  });

  it("no arranca con un precio que no es un número", async () => {
    // Sin esto el pago se aprobaría cobrando NaN: `NaN <= 0` es false.
    await expect(importarConPrecio("gratis")).rejects.toThrow(/PRECIO_ENTRADA/);
  });

  it("no arranca con un precio que no es mayor a 0", async () => {
    await expect(importarConPrecio("0")).rejects.toThrow(/PRECIO_ENTRADA/);
    await expect(importarConPrecio("-100")).rejects.toThrow(/PRECIO_ENTRADA/);
  });
});
