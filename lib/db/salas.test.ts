import { beforeEach, describe, expect, it, vi } from "vitest";

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

const datos = { nombre: "Sala 1", filas: 2, columnas: 2 };
const salaCreada = {
  id: "sala_1",
  nombre: "Sala 1",
  filas: 2,
  columnas: 2,
  creadaEn: new Date(),
  eliminadaEn: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  buscar.mockResolvedValue(null);
  crear.mockResolvedValue(salaCreada);
  listar.mockResolvedValue([salaCreada]);
  contar.mockResolvedValue(0);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function argumentoDe(mockFn: any) {
  const llamada = mockFn.mock.calls[0];
  if (!llamada) throw new Error("se esperaba una llamada a Prisma y no hubo ninguna");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return llamada[0] as any;
}

describe("crearSala", () => {
  it("valida que no exista una sala con ese nombre", async () => {
    buscar.mockResolvedValue(salaCreada);
    await expect(crearSala(datos)).rejects.toBeInstanceOf(ErrorDeConflicto);
  });

  it("crea las butacas de forma anidada", async () => {
    await crearSala(datos);
    const llamada = argumentoDe(crear);
    
    expect(llamada.data.butacas.create).toHaveLength(4);
    expect(llamada.data.butacas.create).toContainEqual({ fila: 1, columna: 1 });
    expect(llamada.data.butacas.create).toContainEqual({ fila: 2, columna: 2 });
  });

  it("retorna la sala creada correctamente", async () => {
    await expect(crearSala(datos)).resolves.toEqual(salaCreada);
  });
});

describe("listarSalas", () => {
  it("lista salas filtrando las no eliminadas", async () => {
    const salas = await listarSalas();
    expect(salas).toEqual([salaCreada]);
    
    const llamada = argumentoDe(listar);
    expect(llamada.where).toEqual({ eliminadaEn: null });
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

  it("arroja ErrorDeConflicto si la sala tiene funciones a futuro", async () => {
    buscar.mockResolvedValue(salaCreada);
    contar.mockResolvedValue(1);
    await expect(eliminarSalaLogico("1")).rejects.toBeInstanceOf(ErrorDeConflicto);
  });

  it("actualiza eliminadaEn de la sala simulando borrado lógico", async () => {
    buscar.mockResolvedValue(salaCreada);
    await eliminarSalaLogico("1");
    
    const llamada = argumentoDe(actualizar);
    expect(llamada.where).toEqual({ id: "1" });
    expect(llamada.data.eliminadaEn).toBeInstanceOf(Date);
  });
});
