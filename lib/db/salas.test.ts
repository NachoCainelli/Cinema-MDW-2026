import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";

const { crear, listar, contar, buscar, actualizar } = vi.hoisted(() => ({
  crear: vi.fn(),
  listar: vi.fn(),
  contar: vi.fn(),
  buscar: vi.fn(),
  actualizar: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    sala: {
      create: crear,
      findMany: listar,
      findUnique: buscar,
      update: actualizar,
    },
    funcion: {
      count: contar,
    },
  },
}));

const { crearSala, listarSalas, eliminarSalaLogico } = await import("./salas");

const datos = { nombre: "Sala 1", filas: 2, columnas: 3 };
const salaCreada = {
  id: "sala_1",
  nombre: "Sala 1",
  filas: 2,
  columnas: 3,
  creadaEn: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  buscar.mockResolvedValue({ ...salaCreada, eliminadaEn: null });
  crear.mockResolvedValue(salaCreada);
  listar.mockResolvedValue([salaCreada]);
  contar.mockResolvedValue(0);
});

type ArgsPrisma = {
  data?: {
    eliminadaEn?: unknown;
    butacas?: { create?: { fila: number; columna: number }[] };
  };
  select?: Record<string, unknown>;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

/** El argumento con el que se llamó a un mock de Prisma, o un error si no se llamó. */
function argumentoDe(mock: typeof crear | typeof listar | typeof actualizar): ArgsPrisma {
  const llamada = mock.mock.calls[0];
  if (!llamada) throw new Error("se esperaba una llamada a Prisma y no hubo ninguna");
  return llamada[0] as ArgsPrisma;
}

function errorDePrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falló", { code, clientVersion: "6" });
}

describe("crearSala", () => {
  it("traduce el nombre duplicado a ErrorDeConflicto (409)", async () => {
    crear.mockRejectedValue(errorDePrisma("P2002"));
    await expect(crearSala(datos)).rejects.toBeInstanceOf(ErrorDeConflicto);
  });

  it("deja pasar cualquier otro error de la base para que termine en 500", async () => {
    crear.mockRejectedValue(errorDePrisma("P1001"));
    await expect(crearSala(datos)).rejects.not.toBeInstanceOf(ErrorDeConflicto);
  });

  it("crea una butaca por cada fila y columna, en ese orden", async () => {
    await crearSala(datos); // 2 filas x 3 columnas

    const butacas = argumentoDe(crear).data?.butacas?.create;
    expect(butacas).toHaveLength(6);
    // El caso no es simétrico: si el doble `for` invirtiera fila y columna,
    // esta butaca no existiría y la de abajo sí.
    expect(butacas).toContainEqual({ fila: 2, columna: 3 });
    expect(butacas).not.toContainEqual({ fila: 3, columna: 1 });
  });

  it("retorna la sala creada correctamente", async () => {
    await expect(crearSala(datos)).resolves.toEqual(salaCreada);
  });
});

describe("listarSalas", () => {
  it("lista salas no eliminadas, ordenadas y con el límite pedido", async () => {
    const salas = await listarSalas({ limite: 50 });
    expect(salas).toEqual([salaCreada]);

    const llamada = argumentoDe(listar);
    expect(llamada.where).toEqual({ eliminadaEn: null });
    expect(llamada.orderBy).toEqual({ nombre: "asc" });
    expect(llamada.take).toBe(50);
  });
});

describe("eliminarSalaLogico", () => {
  it("arroja ErrorNoEncontrado si la sala no existe", async () => {
    buscar.mockResolvedValue(null);
    await expect(eliminarSalaLogico("1")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("arroja ErrorNoEncontrado si la sala ya está eliminada", async () => {
    buscar.mockResolvedValue({ ...salaCreada, eliminadaEn: new Date() });
    await expect(eliminarSalaLogico("1")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("arroja ErrorDeConflicto si la sala tiene funciones en curso o programadas", async () => {
    contar.mockResolvedValue(1);
    await expect(eliminarSalaLogico("1")).rejects.toBeInstanceOf(ErrorDeConflicto);
  });

  it("actualiza eliminadaEn de la sala simulando borrado lógico", async () => {
    await eliminarSalaLogico("1");

    const llamada = argumentoDe(actualizar);
    expect(llamada.where).toEqual({ id: "1" });
    expect(llamada.data?.eliminadaEn).toBeInstanceOf(Date);
  });
});
