import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto, ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";
import { SIN_ENVIAR } from "@/lib/formularios";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/funciones", () => ({ crearFuncion: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  // Como el de verdad, `redirect` lanza: lo que esté después no corre.
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const { requerirUsuario } = await import("@/lib/auth");
const { crearFuncion } = await import("@/lib/db/funciones");
const { revalidatePath } = await import("next/cache");
const { redirect } = await import("next/navigation");
const { crearFuncionAction } = await import("./acciones");

const autorizar = vi.mocked(requerirUsuario);
const crear = vi.mocked(crearFuncion);

const gestor = {
  id: "usr_1",
  email: "gestor@cine.com",
  nombre: "Gestor",
  rol: "GESTOR_CARTELERA" as const,
};

const valoresValidos = { peliculaId: "pel_1", salaId: "sala_1", inicio: "2099-11-10T20:30" };

function formulario(valores: Record<string, string>) {
  const datos = new FormData();
  for (const [campo, valor] of Object.entries(valores)) datos.set(campo, valor);
  return datos;
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(gestor);
  crear.mockResolvedValue({ id: "fun_1" } as never);
});

describe("crearFuncionAction", () => {
  it("crea la función con el inicio en hora argentina, revalida la cartelera y redirige", async () => {
    await expect(crearFuncionAction(SIN_ENVIAR, formulario(valoresValidos))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(autorizar).toHaveBeenCalledWith("GESTOR_CARTELERA");
    expect(crear).toHaveBeenCalledWith({
      peliculaId: "pel_1",
      salaId: "sala_1",
      inicio: new Date("2099-11-10T23:30:00.000Z"),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/cartelera");
    expect(redirect).toHaveBeenCalledWith("/cartelera");
  });

  it.each([
    ["sin sesión", new ErrorNoAutenticado()],
    ["con otro rol", new ErrorNoAutorizado()],
  ])("rechaza %s antes de validar y sin tocar la base", async (_caso, error) => {
    autorizar.mockRejectedValue(error);

    // Body inválido a propósito: si se validara primero, devolvería errores de campo.
    await expect(crearFuncionAction(SIN_ENVIAR, formulario({}))).rejects.toBe(error);
    expect(crear).not.toHaveBeenCalled();
  });

  it("devuelve los errores de validación por campo y lo que se había escrito", async () => {
    const valores = { peliculaId: "", salaId: "sala_1", inicio: "" };

    const estado = await crearFuncionAction(SIN_ENVIAR, formulario(valores));

    expect(estado.errores?.peliculaId).toEqual(["Falta la película"]);
    expect(estado.errores?.inicio).toEqual(["Falta la fecha y hora de inicio"]);
    expect(estado.mensaje).toBeUndefined();
    expect(estado.valores).toEqual(valores);
    expect(crear).not.toHaveBeenCalled();
  });

  it("deja la fecha en el pasado debajo del campo inicio, no arriba", async () => {
    const valores = { ...valoresValidos, inicio: "2000-01-01T10:00" };

    const estado = await crearFuncionAction(SIN_ENVIAR, formulario(valores));

    expect(estado.errores?.inicio).toEqual(["La función no puede empezar en el pasado"]);
    expect(estado.mensaje).toBeUndefined();
  });

  it("pone el solapamiento arriba del formulario, sin vaciarlo y sin redirigir", async () => {
    crear.mockRejectedValue(new ErrorDeConflicto("La sala Sala 1 ya tiene la función de \"Duna\""));

    const estado = await crearFuncionAction(SIN_ENVIAR, formulario(valoresValidos));

    expect(estado).toEqual({
      ok: false,
      mensaje: 'La sala Sala 1 ya tiene la función de "Duna"',
      valores: valoresValidos,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("re-lanza un error inesperado en vez de mostrar su mensaje", async () => {
    const inesperado = new Error("connection refused 10.0.0.3");
    crear.mockRejectedValue(inesperado);

    await expect(crearFuncionAction(SIN_ENVIAR, formulario(valoresValidos))).rejects.toBe(inesperado);
  });
});
