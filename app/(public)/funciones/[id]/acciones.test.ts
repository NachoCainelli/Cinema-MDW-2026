import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorDeConflicto,
  ErrorDePagoRechazado,
  ErrorNoAutenticado,
  ErrorNoAutorizado,
} from "@/lib/errores";
import { SIN_ENVIAR } from "@/lib/formularios";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/compras", () => ({ crearCompra: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  // Como el de verdad, `redirect` lanza: lo que esté después no corre.
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT ${destino}`);
  }),
}));

const { requerirUsuario } = await import("@/lib/auth");
const { crearCompra } = await import("@/lib/db/compras");
const { refresh, revalidatePath } = await import("next/cache");
const { redirect } = await import("next/navigation");
const { comprarEntradasAction } = await import("./acciones");

const autorizar = vi.mocked(requerirUsuario);
const comprar = vi.mocked(crearCompra);

const usuario = {
  id: "usr_1",
  email: "usuario@ejemplo.com",
  nombre: "Usuario",
  rol: "USUARIO" as const,
};

function formulario(butacaIds: string[], extra: Record<string, string> = {}) {
  const datos = new FormData();
  for (const id of butacaIds) datos.append("butacaIds", id);
  for (const [campo, valor] of Object.entries(extra)) datos.set(campo, valor);
  return datos;
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(usuario);
  comprar.mockResolvedValue({ id: "com_1" } as never);
});

describe("comprarEntradasAction", () => {
  it("compra las butacas elegidas a nombre de la sesión, revalida y lleva al detalle", async () => {
    await expect(
      comprarEntradasAction("fun_1", SIN_ENVIAR, formulario(["but_1", "but_2"])),
    ).rejects.toThrow("NEXT_REDIRECT /compras/com_1");

    expect(autorizar).toHaveBeenCalledWith("USUARIO");
    expect(comprar).toHaveBeenCalledWith(
      { funcionId: "fun_1", butacaIds: ["but_1", "but_2"] },
      "usr_1",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/funciones/fun_1");
    expect(revalidatePath).toHaveBeenCalledWith("/cartelera");
    expect(revalidatePath).toHaveBeenCalledWith("/compras");
  });

  it("usa el funcionId atado por la página, aunque el formulario traiga otro", async () => {
    await expect(
      comprarEntradasAction("fun_1", SIN_ENVIAR, formulario(["but_1"], { funcionId: "fun_ajena" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(comprar.mock.calls[0]?.[0].funcionId).toBe("fun_1");
  });

  it("sin sesión, manda al login con vuelta a la función y sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    await expect(comprarEntradasAction("fun_1", SIN_ENVIAR, formulario([]))).rejects.toThrow(
      "NEXT_REDIRECT /ingresar?callbackUrl=%2Ffunciones%2Ffun_1",
    );
    expect(comprar).not.toHaveBeenCalled();
  });

  it("con otro rol, re-lanza antes de validar y sin tocar la base", async () => {
    const error = new ErrorNoAutorizado();
    autorizar.mockRejectedValue(error);

    // Body inválido a propósito: si se validara primero, devolvería errores de campo.
    await expect(comprarEntradasAction("fun_1", SIN_ENVIAR, formulario([]))).rejects.toBe(error);
    expect(comprar).not.toHaveBeenCalled();
  });

  it("sin butacas elegidas, devuelve el error del campo", async () => {
    const estado = await comprarEntradasAction("fun_1", SIN_ENVIAR, formulario([]));

    expect(estado.errores?.butacaIds).toEqual(["Tenés que seleccionar al menos una butaca"]);
    expect(comprar).not.toHaveBeenCalled();
  });

  it("una butaca vendida mientras se elegía va arriba, con cuáles, y repinta el mapa", async () => {
    comprar.mockRejectedValue(
      new ErrorDeConflicto("Una de las butacas que elegiste ya fue vendida", ["Fila 1 · Butaca 2"]),
    );

    const estado = await comprarEntradasAction("fun_1", SIN_ENVIAR, formulario(["but_1", "but_2"]));

    expect(estado).toEqual({
      ok: false,
      mensaje: "Una de las butacas que elegiste ya fue vendida",
      detalles: ["Fila 1 · Butaca 2"],
    });
    expect(refresh).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("un pago rechazado va arriba, sin repintar ni redirigir", async () => {
    comprar.mockRejectedValue(new ErrorDePagoRechazado("Tarjeta sin fondos"));

    const estado = await comprarEntradasAction("fun_1", SIN_ENVIAR, formulario(["but_1"]));

    expect(estado.mensaje).toBe("Tarjeta sin fondos");
    expect(refresh).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("re-lanza un error inesperado en vez de mostrar su mensaje", async () => {
    const inesperado = new Error("connection refused 10.0.0.3");
    comprar.mockRejectedValue(inesperado);

    await expect(comprarEntradasAction("fun_1", SIN_ENVIAR, formulario(["but_1"]))).rejects.toBe(
      inesperado,
    );
  });
});
