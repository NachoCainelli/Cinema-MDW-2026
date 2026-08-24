import { describe, expect, it } from "vitest";
import { posicionButacaSchema } from "./butaca";

describe("posicionButacaSchema", () => {
  it("acepta una posición válida", () => {
    const resultado = posicionButacaSchema.safeParse({ fila: 3, columna: 5 });

    expect(resultado.success).toBe(true);
  });

  it("rechaza la fila 0", () => {
    const resultado = posicionButacaSchema.safeParse({ fila: 0, columna: 5 });

    expect(resultado.success).toBe(false);
  });

  it("rechaza una columna negativa", () => {
    const resultado = posicionButacaSchema.safeParse({ fila: 3, columna: -1 });

    expect(resultado.success).toBe(false);
  });
});
