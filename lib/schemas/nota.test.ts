/**
 * Test de ejemplo.
 *
 * El objetivo no es "tener tests": es cubrir las reglas que, si se rompen,
 * rompen el negocio. Un buen test describe un caso borde que alguien podría
 * romper sin darse cuenta.
 *
 * Correr con: npm test
 */
import { describe, expect, it } from "vitest";
import { crearNotaSchema } from "./nota";

describe("crearNotaSchema", () => {
  it("acepta una nota válida", () => {
    const resultado = crearNotaSchema.safeParse({
      titulo: "Un título",
      contenido: "Contenido de la nota",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un título demasiado corto", () => {
    const resultado = crearNotaSchema.safeParse({
      titulo: "ab",
      contenido: "Contenido de la nota",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un contenido que es solo espacios", () => {
    // Este es el caso borde interesante: sin el .trim() del schema,
    // "    " pasaría la validación de longitud mínima.
    const resultado = crearNotaSchema.safeParse({
      titulo: "Un título",
      contenido: "     ",
    });

    expect(resultado.success).toBe(false);
  });
});
