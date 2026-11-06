import { describe, expect, it } from "vitest";
import { carteleraQuerySchema, crearFuncionSchema } from "./funcion";

function enHoras(horas: number) {
  return new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();
}

describe("crearFuncionSchema", () => {
  it("acepta una función en el futuro", () => {
    const resultado = crearFuncionSchema.safeParse({
      peliculaId: "pelicula-1",
      salaId: "sala-1",
      inicio: enHoras(2),
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza una función en el pasado", () => {
    const resultado = crearFuncionSchema.safeParse({
      peliculaId: "pelicula-1",
      salaId: "sala-1",
      inicio: enHoras(-2),
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un inicio vacío con un mensaje en castellano", () => {
    // Es lo que llega del formulario cuando el datetime-local queda sin completar.
    const resultado = crearFuncionSchema.safeParse({
      peliculaId: "pelicula-1",
      salaId: "sala-1",
      inicio: "",
    });

    expect(resultado.error?.issues).toEqual([
      expect.objectContaining({ path: ["inicio"], message: "Falta la fecha y hora de inicio" }),
    ]);
  });

  it("rechaza si falta la sala", () => {
    const resultado = crearFuncionSchema.safeParse({
      peliculaId: "pelicula-1",
      salaId: "",
      inicio: enHoras(2),
    });

    expect(resultado.success).toBe(false);
  });
});

describe("carteleraQuerySchema", () => {
  it("sin parámetros, arranca en la primera página de 50 y sin búsqueda", () => {
    expect(carteleraQuerySchema.parse({})).toEqual({ q: undefined, pagina: 1, limite: 50 });
  });

  it("recorta los espacios de la búsqueda", () => {
    expect(carteleraQuerySchema.parse({ q: "  duna  " }).q).toBe("duna");
  });

  it.each(["", "   "])("trata la búsqueda %j como si no hubiera búsqueda", (q) => {
    expect(carteleraQuerySchema.parse({ q }).q).toBeUndefined();
  });

  it("rechaza una búsqueda de más de 100 caracteres", () => {
    expect(carteleraQuerySchema.safeParse({ q: "a".repeat(101) }).success).toBe(false);
  });

  it("acepta una búsqueda de 100 caracteres", () => {
    expect(carteleraQuerySchema.safeParse({ q: "a".repeat(100) }).success).toBe(true);
  });

  it("convierte la página que llega como texto en número", () => {
    expect(carteleraQuerySchema.parse({ pagina: "3" }).pagina).toBe(3);
  });

  it.each(["0", "-1", "1.5", "muchas", "1001"])("rechaza la página %j", (pagina) => {
    expect(carteleraQuerySchema.safeParse({ pagina }).success).toBe(false);
  });

  it("acepta un límite entre 1 y 100", () => {
    expect(carteleraQuerySchema.parse({ limite: "1" }).limite).toBe(1);
    expect(carteleraQuerySchema.parse({ limite: "100" }).limite).toBe(100);
  });

  it.each(["0", "101", "muchas"])("rechaza el límite %j", (limite) => {
    expect(carteleraQuerySchema.safeParse({ limite }).success).toBe(false);
  });
});
