import { describe, expect, it } from "vitest";
import {
  actualizarPeliculaSchema,
  crearPeliculaSchema,
  peliculasQuerySchema,
} from "./pelicula";

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

  it("acepta una imagenUrl válida", () => {
    const resultado = crearPeliculaSchema.safeParse({
      titulo: "Una película",
      sinopsis: "De qué se trata",
      duracionMinutos: 120,
      clasificacion: "ATP",
      categoria: "DRAMA",
      imagenUrl: "https://xyz.supabase.co/storage/v1/object/public/posters/una-pelicula.jpg",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza una imagenUrl que no es una URL", () => {
    const resultado = crearPeliculaSchema.safeParse({
      titulo: "Una película",
      sinopsis: "De qué se trata",
      duracionMinutos: 120,
      clasificacion: "ATP",
      categoria: "DRAMA",
      imagenUrl: "no-es-una-url",
    });

    expect(resultado.success).toBe(false);
  });
});

describe("actualizarPeliculaSchema", () => {
  it("acepta un solo campo: el PATCH no exige el recurso entero", () => {
    const resultado = actualizarPeliculaSchema.safeParse({ titulo: "Otro título" });

    expect(resultado.success).toBe(true);
  });

  it("aplica las mismas reglas que el alta a los campos que sí llegan", () => {
    const resultado = actualizarPeliculaSchema.safeParse({ duracionMinutos: 0 });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un body vacío", () => {
    const resultado = actualizarPeliculaSchema.safeParse({});

    expect(resultado.success).toBe(false);
  });

  it("rechaza un body con un campo mal escrito, que quedaría vacío al descartarlo", () => {
    const resultado = actualizarPeliculaSchema.safeParse({ tituloo: "typo" });

    expect(resultado.success).toBe(false);
  });
});

describe("peliculasQuerySchema", () => {
  it("usa 50 como límite por defecto", () => {
    const resultado = peliculasQuerySchema.safeParse({});

    expect(resultado.success && resultado.data.limite).toBe(50);
  });

  it("convierte el límite que llega como texto en la URL", () => {
    const resultado = peliculasQuerySchema.safeParse({ limite: "10" });

    expect(resultado.success && resultado.data.limite).toBe(10);
  });

  it("rechaza un límite por encima del tope", () => {
    const resultado = peliculasQuerySchema.safeParse({ limite: "999" });

    expect(resultado.success).toBe(false);
  });
});
