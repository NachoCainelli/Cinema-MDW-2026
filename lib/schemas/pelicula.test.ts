import { describe, expect, it } from "vitest";
import { crearPeliculaSchema } from "./pelicula";

describe("crearPeliculaSchema", () => {
  it("acepta una película válida", () => {
    const resultado = crearPeliculaSchema.safeParse({
      titulo: "Una película",
      sinopsis: "De qué se trata",
      duracionMinutos: 120,
      clasificacion: "ATP",
      categoria: "DRAMA",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un título que es solo espacios", () => {
    const resultado = crearPeliculaSchema.safeParse({
      titulo: "   ",
      sinopsis: "De qué se trata",
      duracionMinutos: 120,
      clasificacion: "ATP",
      categoria: "DRAMA",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza una duración de 0 minutos", () => {
    const resultado = crearPeliculaSchema.safeParse({
      titulo: "Una película",
      sinopsis: "De qué se trata",
      duracionMinutos: 0,
      clasificacion: "ATP",
      categoria: "DRAMA",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza una clasificación fuera del enum", () => {
    const resultado = crearPeliculaSchema.safeParse({
      titulo: "Una película",
      sinopsis: "De qué se trata",
      duracionMinutos: 120,
      clasificacion: "R",
      categoria: "DRAMA",
    });

    expect(resultado.success).toBe(false);
  });
});
