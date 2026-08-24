import { describe, expect, it } from "vitest";
import { buscarEntradaSchema } from "./entrada";

describe("buscarEntradaSchema", () => {
  it("acepta un id válido", () => {
    const resultado = buscarEntradaSchema.safeParse({ id: "entrada-1" });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un id vacío", () => {
    const resultado = buscarEntradaSchema.safeParse({ id: "" });

    expect(resultado.success).toBe(false);
  });
});
