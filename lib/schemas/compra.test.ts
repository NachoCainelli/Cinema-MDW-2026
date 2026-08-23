import { describe, expect, it } from "vitest";
import { crearCompraSchema } from "./compra";

describe("crearCompraSchema", () => {
  it("acepta una compra válida", () => {
    const resultado = crearCompraSchema.safeParse({
      funcionId: "funcion-1",
      butacaIds: ["butaca-1", "butaca-2"],
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza una compra sin butacas", () => {
    const resultado = crearCompraSchema.safeParse({
      funcionId: "funcion-1",
      butacaIds: [],
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza más de 10 butacas", () => {
    const butacaIds = Array.from({ length: 11 }, (_, i) => `butaca-${i}`);
    const resultado = crearCompraSchema.safeParse({ funcionId: "funcion-1", butacaIds });

    expect(resultado.success).toBe(false);
  });

  it("rechaza la misma butaca repetida en la selección", () => {
    const resultado = crearCompraSchema.safeParse({
      funcionId: "funcion-1",
      butacaIds: ["butaca-1", "butaca-1"],
    });

    expect(resultado.success).toBe(false);
  });
});
