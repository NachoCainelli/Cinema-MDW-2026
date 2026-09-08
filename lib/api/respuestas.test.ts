import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  ErrorDeConflicto,
  ErrorDePagoRechazado,
  ErrorNoAutenticado,
  ErrorNoAutorizado,
  ErrorNoEncontrado,
} from "@/lib/errores";
import { respuestaDeError, type CuerpoDeError } from "./respuestas";

async function cuerpo(respuesta: Response): Promise<CuerpoDeError> {
  return (await respuesta.json()) as CuerpoDeError;
}

describe("respuestaDeError", () => {
  it("traduce un ZodError a 400 con el detalle por campo", async () => {
    const schema = z.object({ nombre: z.string().min(1, "Falta el nombre") });
    const resultado = schema.safeParse({ nombre: "" });
    if (resultado.success) throw new Error("el schema tendría que haber fallado");

    const respuesta = respuestaDeError(resultado.error);

    expect(respuesta.status).toBe(400);
    expect(await cuerpo(respuesta)).toEqual({
      error: "Los datos enviados no son válidos",
      detalles: [{ campo: "nombre", mensaje: "Falta el nombre" }],
    });
  });

  it("traduce un JSON mal formado a 400 y no a 500", async () => {
    // Lo que lanza `request.json()` cuando el body está vacío o roto.
    const respuesta = respuestaDeError(new SyntaxError("Unexpected end of JSON input"));

    expect(respuesta.status).toBe(400);
    expect((await cuerpo(respuesta)).error).toBe("El cuerpo del request no es JSON válido");
  });

  it("traduce ErrorNoAutenticado a 401", async () => {
    const respuesta = respuestaDeError(new ErrorNoAutenticado());

    expect(respuesta.status).toBe(401);
    expect((await cuerpo(respuesta)).error).toBe("Necesitás iniciar sesión");
  });

  it("traduce ErrorNoAutorizado a 403", async () => {
    const respuesta = respuestaDeError(new ErrorNoAutorizado());

    expect(respuesta.status).toBe(403);
  });

  it("traduce ErrorDePagoRechazado a 402 y muestra el motivo", async () => {
    const respuesta = respuestaDeError(new ErrorDePagoRechazado("Tarjeta sin fondos"));

    expect(respuesta.status).toBe(402);
    expect((await cuerpo(respuesta)).error).toBe("Tarjeta sin fondos");
  });

  it("traduce ErrorNoEncontrado a 404", async () => {
    const respuesta = respuestaDeError(new ErrorNoEncontrado("No existe esa sala"));

    expect(respuesta.status).toBe(404);
    expect((await cuerpo(respuesta)).error).toBe("No existe esa sala");
  });

  it("traduce ErrorDeConflicto a 409 y muestra el motivo", async () => {
    const respuesta = respuestaDeError(new ErrorDeConflicto("La butaca ya está vendida"));

    expect(respuesta.status).toBe(409);
    expect((await cuerpo(respuesta)).error).toBe("La butaca ya está vendida");
  });

  it("traduce un error inesperado a 500 sin filtrar el detalle interno", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const interno = new Error("connect ECONNREFUSED 10.0.0.1:5432 (postgres://admin:hunter2@...)");

    const respuesta = respuestaDeError(interno);

    expect(respuesta.status).toBe(500);
    expect(await cuerpo(respuesta)).toEqual({ error: "Error interno del servidor" });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
