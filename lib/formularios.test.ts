import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ErrorDeConflicto,
  ErrorDePagoRechazado,
  ErrorDeServicioExterno,
  ErrorNoAutenticado,
  ErrorNoAutorizado,
  ErrorNoEncontrado,
} from "@/lib/errores";
import { SIN_ENVIAR, estadoDeError } from "./formularios";

function errorDeZod(schema: z.ZodType, datos: unknown) {
  const resultado = schema.safeParse(datos);
  if (resultado.success) throw new Error("el schema tendría que haber fallado");
  return resultado.error;
}

describe("SIN_ENVIAR", () => {
  it("no trae errores ni mensaje: todavía no pasó nada", () => {
    expect(SIN_ENVIAR).toEqual({ ok: false });
  });
});

describe("estadoDeError", () => {
  it("traduce un ZodError a errores por campo", () => {
    const error = errorDeZod(
      z.object({
        nombre: z.string().min(1, "Falta el nombre"),
        capacidad: z.number().positive("La capacidad tiene que ser positiva"),
      }),
      { nombre: "", capacidad: -1 },
    );

    expect(estadoDeError(error)).toEqual({
      ok: false,
      errores: {
        nombre: ["Falta el nombre"],
        capacidad: ["La capacidad tiene que ser positiva"],
      },
    });
  });

  it("conserva la ruta completa de un campo anidado", () => {
    const error = errorDeZod(
      z.object({ butacas: z.array(z.string().min(1, "Falta la butaca")) }),
      { butacas: ["A1", ""] },
    );

    expect(estadoDeError(error).errores).toEqual({ "butacas.1": ["Falta la butaca"] });
  });

  it("junta varios errores del mismo campo", () => {
    const error = errorDeZod(
      z.object({ butaca: z.string().min(2, "Muy corto").regex(/^[A-Z]\d+$/, "Formato A12") }),
      { butaca: "a" },
    );

    expect(estadoDeError(error).errores).toEqual({ butaca: ["Muy corto", "Formato A12"] });
  });

  it("un error sin campo (refine sobre el objeto entero) va arriba, como mensaje", () => {
    const error = errorDeZod(
      z
        .object({ desde: z.number(), hasta: z.number() })
        .refine((d) => d.desde < d.hasta, "El inicio tiene que ser antes del fin"),
      { desde: 2, hasta: 1 },
    );

    expect(estadoDeError(error)).toEqual({
      ok: false,
      errores: {},
      mensaje: "El inicio tiene que ser antes del fin",
    });
  });

  it.each([
    ["ErrorNoEncontrado", new ErrorNoEncontrado("La función no existe")],
    ["ErrorDeConflicto", new ErrorDeConflicto("Una de las butacas que elegiste ya fue vendida")],
    ["ErrorDePagoRechazado", new ErrorDePagoRechazado()],
    ["ErrorDeServicioExterno", new ErrorDeServicioExterno()],
  ])("traduce %s a mensaje arriba del formulario", (_nombre, error) => {
    expect(estadoDeError(error)).toEqual({ ok: false, mensaje: error.message });
  });

  it("pasa los detalles de un ErrorDeConflicto, para pintarlos como lista", () => {
    const error = new ErrorDeConflicto("2 de las butacas ya fueron vendidas", [
      "Fila 1 · Butaca 3",
      "Fila 1 · Butaca 4",
    ]);

    expect(estadoDeError(error)).toEqual({
      ok: false,
      mensaje: "2 de las butacas ya fueron vendidas",
      detalles: ["Fila 1 · Butaca 3", "Fila 1 · Butaca 4"],
    });
  });

  it("conserva los valores que la persona había escrito", () => {
    const valores = { nombre: "Sala 1", capacidad: "120" };

    expect(estadoDeError(new ErrorDeConflicto("Ya existe"), valores).valores).toEqual(valores);
    expect(
      estadoDeError(errorDeZod(z.object({ nombre: z.string().min(10) }), valores), valores).valores,
    ).toEqual(valores);
  });

  it.each([
    ["ErrorNoAutenticado", new ErrorNoAutenticado()],
    ["ErrorNoAutorizado", new ErrorNoAutorizado()],
    ["un Error inesperado", new Error("connect ECONNREFUSED 10.0.0.1:5432")],
  ])("re-lanza %s sin tocarlo", (_nombre, error) => {
    let lanzado: unknown;
    try {
      estadoDeError(error);
    } catch (e) {
      lanzado = e;
    }

    expect(lanzado).toBe(error);
  });

  it("nunca devuelve el message de un error inesperado", () => {
    expect(() => estadoDeError(new Error("password=secreto"), { a: "b" })).toThrow(
      "password=secreto",
    );
  });

  it("re-lanza lo que no es un Error, como los redirect de Next", () => {
    const redireccion = { digest: "NEXT_REDIRECT;replace;/compras;307;" };

    expect(() => estadoDeError(redireccion)).toThrow();
  });
});
