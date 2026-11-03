import { describe, expect, it } from "vitest";
import { crearFuncionSchema } from "./funcion";

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
