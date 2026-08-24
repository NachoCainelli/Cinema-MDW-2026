import { describe, expect, it } from "vitest";
import { crearSalaSchema } from "./sala";

describe("crearSalaSchema", () => {
  it("acepta una sala válida", () => {
    const resultado = crearSalaSchema.safeParse({
      nombre: "Sala 1",
      filas: 10,
      columnas: 12,
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un nombre que es solo espacios", () => {
    const resultado = crearSalaSchema.safeParse({
      nombre: "   ",
      filas: 10,
      columnas: 12,
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza 0 filas", () => {
    const resultado = crearSalaSchema.safeParse({
      nombre: "Sala 1",
      filas: 0,
      columnas: 12,
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza más de 30 columnas", () => {
    const resultado = crearSalaSchema.safeParse({
      nombre: "Sala 1",
      filas: 10,
      columnas: 31,
    });

    expect(resultado.success).toBe(false);
  });
});
