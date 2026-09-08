import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto, ErrorDePagoRechazado, ErrorNoEncontrado } from "@/lib/errores";

const { buscarFuncion, buscarButacas, buscarEntradas, crear, buscarCompras, transaccion, cobrar } =
  vi.hoisted(() => ({
    buscarFuncion: vi.fn(),
    buscarButacas: vi.fn(),
    buscarEntradas: vi.fn(),
    crear: vi.fn(),
    buscarCompras: vi.fn(),
    transaccion: vi.fn(),
    cobrar: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    funcion: { findUnique: buscarFuncion },
    butaca: { findMany: buscarButacas },
    entrada: { findMany: buscarEntradas },
    compra: { create: crear, findMany: buscarCompras },
    $transaction: transaccion,
  },
}));

vi.mock("@/lib/pagos", () => ({ PRECIO_ENTRADA: 5000, cobrar }));

const { crearCompra, listarComprasDeUsuario } = await import("./compras");

const usuarioId = "usr_1";

/** Función futura: la compra solo tiene sentido antes de que empiece. */
const funcion = {
  id: "fun_1",
  inicio: new Date(Date.now() + 24 * 60 * 60 * 1000),
  salaId: "sala_1",
  pelicula: { titulo: "Duna" },
};

const datos = { funcionId: funcion.id, butacaIds: ["but_1", "but_2"] };

const compraCreada = { id: "com_1", estado: "PAGADA" };

/** El error que tira Prisma cuando se viola un `@@unique`. */
function violacionDeUnicidad() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.5.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  buscarFuncion.mockResolvedValue({ ...funcion });
  buscarButacas.mockResolvedValue(datos.butacaIds.map((id) => ({ id })));
  buscarEntradas.mockResolvedValue([]);
  crear.mockResolvedValue(compraCreada);
  cobrar.mockResolvedValue({ aprobado: true });
  // La transacción corre el callback con el mismo cliente mockeado.
  transaccion.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ entrada: { findMany: buscarEntradas }, compra: { create: crear } }),
  );
});

describe("crearCompra", () => {
  it("crea la compra con una entrada por butaca, a nombre del usuario de la sesión", async () => {
    await expect(crearCompra(datos, usuarioId)).resolves.toEqual(compraCreada);

    const argumento = crear.mock.calls[0]?.[0];
    expect(argumento.data).toMatchObject({ usuarioId, estado: "PAGADA" });
    expect(argumento.data.entradas.create).toEqual([
      { funcionId: funcion.id, butacaId: "but_1" },
      { funcionId: funcion.id, butacaId: "but_2" },
    ]);
    expect(argumento.select).toBeDefined();
  });

  it("escribe la compra y sus entradas dentro de una transacción", async () => {
    await crearCompra(datos, usuarioId);

    expect(transaccion).toHaveBeenCalledTimes(1);
  });

  it("cobra una entrada por butaca", async () => {
    await crearCompra(datos, usuarioId);

    expect(cobrar).toHaveBeenCalledWith(2 * 5000);
  });

  it("rechaza con 404 si la función no existe, sin cobrar", async () => {
    buscarFuncion.mockResolvedValue(null);

    await expect(crearCompra(datos, usuarioId)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(cobrar).not.toHaveBeenCalled();
    expect(crear).not.toHaveBeenCalled();
  });

  it("rechaza con 409 si la función ya empezó", async () => {
    buscarFuncion.mockResolvedValue({ ...funcion, inicio: new Date(Date.now() - 60 * 1000) });

    await expect(crearCompra(datos, usuarioId)).rejects.toBeInstanceOf(ErrorDeConflicto);
    expect(cobrar).not.toHaveBeenCalled();
  });

  it("rechaza con 409 si alguna butaca no es de la sala de la función", async () => {
    // La consulta acota por sala: la butaca ajena simplemente no vuelve.
    buscarButacas.mockResolvedValue([{ id: "but_1" }]);

    await expect(crearCompra(datos, usuarioId)).rejects.toThrow(/no pertenece a la sala/);
    expect(cobrar).not.toHaveBeenCalled();
    expect(crear).not.toHaveBeenCalled();
  });

  it("no persiste la compra si el pago se rechaza", async () => {
    cobrar.mockResolvedValue({ aprobado: false, motivo: "Tarjeta sin fondos" });

    await expect(crearCompra(datos, usuarioId)).rejects.toBeInstanceOf(ErrorDePagoRechazado);
    expect(crear).not.toHaveBeenCalled();
  });

  describe("sobreventa", () => {
    it("rechaza la segunda compra de la misma butaca y función, sin cobrarla", async () => {
      // La primera compra ya dejó su entrada para esa butaca en esa función.
      buscarEntradas.mockResolvedValue([{ butacaId: "but_1" }]);

      await expect(crearCompra(datos, usuarioId)).rejects.toThrow(/ya fue vendida/);
      expect(cobrar).not.toHaveBeenCalled();
      expect(crear).not.toHaveBeenCalled();
    });

    it("rechaza con 409 cuando las dos compras pasan la verificación a la vez", async () => {
      // Las dos vieron la butaca libre: la segunda choca contra el índice
      // único al escribir. Es la carrera que no se puede evitar mirando antes.
      crear.mockRejectedValue(violacionDeUnicidad());

      await expect(crearCompra(datos, usuarioId)).rejects.toBeInstanceOf(ErrorDeConflicto);
    });

    it("deja pasar cualquier otro error de la base sin disfrazarlo de conflicto", async () => {
      crear.mockRejectedValue(new Error("se cayó la conexión"));

      await expect(crearCompra(datos, usuarioId)).rejects.toThrow("se cayó la conexión");
    });
  });
});

describe("listarComprasDeUsuario", () => {
  beforeEach(() => {
    buscarCompras.mockResolvedValue([]);
  });

  it("filtra por el usuario que pregunta y aplica el límite", async () => {
    await listarComprasDeUsuario(usuarioId, { limite: 10 });

    const argumento = buscarCompras.mock.calls[0]?.[0];
    expect(argumento.where).toEqual({ usuarioId });
    expect(argumento.take).toBe(10);
  });

  it("no filtra por sala eliminada, película de baja ni fecha: el historial no se recorta", async () => {
    await listarComprasDeUsuario(usuarioId, { limite: 50 });

    const argumento = buscarCompras.mock.calls[0]?.[0];
    expect(argumento.where).toEqual({ usuarioId });
    expect(JSON.stringify(argumento.select)).not.toMatch(/eliminadaEn|bajaEn/);
  });

  it("devuelve las compras más nuevas primero", async () => {
    await listarComprasDeUsuario(usuarioId, { limite: 50 });

    expect(buscarCompras.mock.calls[0]?.[0].orderBy).toEqual({ creadaEn: "desc" });
  });
});
