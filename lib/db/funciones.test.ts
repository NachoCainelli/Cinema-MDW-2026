import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";

const { buscarPelicula, buscarSala, buscarFunciones, crear, buscarFuncion, buscarButacas, buscarEntradas } =
  vi.hoisted(() => ({
    buscarPelicula: vi.fn(),
    buscarSala: vi.fn(),
    buscarFunciones: vi.fn(),
    crear: vi.fn(),
    buscarFuncion: vi.fn(),
    buscarButacas: vi.fn(),
    buscarEntradas: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    pelicula: { findUnique: buscarPelicula },
    sala: { findUnique: buscarSala },
    funcion: { findMany: buscarFunciones, create: crear, findUnique: buscarFuncion },
    butaca: { findMany: buscarButacas },
    entrada: { findMany: buscarEntradas },
  },
}));

const { crearFuncion, listarCartelera, listarButacasDeFuncion } = await import("./funciones");

const UN_MINUTO_EN_MS = 60 * 1000;

/** Una función que arranca `minutos` después de las 20:00 de un día fijo. */
function alas(hora: number, minutos = 0) {
  return new Date(Date.UTC(2030, 0, 1, hora, minutos));
}

const pelicula = {
  id: "pel_1",
  titulo: "Duna",
  duracionMinutos: 120,
  bajaEn: null as Date | null,
};

const sala = { id: "sala_1", nombre: "Sala 1", eliminadaEn: null as Date | null };

/** Función existente en la sala: empieza a las 20:00 y dura 120 minutos. */
const existente = { id: "fun_1", inicio: alas(20), pelicula: { titulo: "Duna", duracionMinutos: 120 } };

const datos = { peliculaId: pelicula.id, salaId: sala.id, inicio: alas(23) };

beforeEach(() => {
  vi.clearAllMocks();
  buscarPelicula.mockResolvedValue({ ...pelicula });
  buscarSala.mockResolvedValue({ ...sala });
  buscarFunciones.mockResolvedValue([]);
  crear.mockImplementation(async () => ({ id: "fun_nueva" }));
});

describe("crearFuncion", () => {
  it("crea la función cuando la sala está libre", async () => {
    await expect(crearFuncion(datos)).resolves.toEqual({ id: "fun_nueva" });

    const argumento = crear.mock.calls[0]?.[0];
    expect(argumento.data).toMatchObject({ peliculaId: pelicula.id, salaId: sala.id });
    expect(argumento.select).toBeDefined();
  });

  it("rechaza con 409 si se solapa con otra función de la misma sala", async () => {
    buscarFunciones.mockResolvedValue([existente]);

    // 21:00 cae en el medio de la función de las 20:00.
    await expect(crearFuncion({ ...datos, inicio: alas(21) })).rejects.toBeInstanceOf(
      ErrorDeConflicto,
    );
    expect(crear).not.toHaveBeenCalled();
  });

  it("acepta la función que arranca justo con los 15 minutos de margen", async () => {
    buscarFunciones.mockResolvedValue([existente]);

    await expect(crearFuncion({ ...datos, inicio: alas(22, 15) })).resolves.toBeDefined();
  });

  it("informa el conflicto con la función que lo provoca", async () => {
    buscarFunciones.mockResolvedValue([existente]);

    await expect(crearFuncion({ ...datos, inicio: alas(21) })).rejects.toThrow(/Duna/);
  });

  it("conserva el mensaje del 409: nombra la primera función en conflicto", async () => {
    // 21:00 a 23:00 pisa las dos: Duna (20:00) y la de las 22:30.
    buscarFunciones.mockResolvedValue([
      existente,
      { id: "fun_2", inicio: alas(22, 30), pelicula: { titulo: "Alien", duracionMinutos: 90 } },
    ]);

    await expect(crearFuncion({ ...datos, inicio: alas(21) })).rejects.toThrow(
      'La sala Sala 1 ya tiene la función de "Duna" a las 2030-01-01T20:00:00.000Z (120 min). ' +
        "Entre una función y la siguiente tienen que quedar al menos 15 minutos",
    );
  });

  it("solo mira funciones de la sala indicada", async () => {
    await crearFuncion(datos);

    expect(buscarFunciones.mock.calls[0]?.[0]).toMatchObject({ where: { salaId: sala.id } });
  });

  it("acota la ventana de la consulta y pide un take explícito", async () => {
    await crearFuncion(datos);

    const argumento = buscarFunciones.mock.calls[0]?.[0];
    expect(argumento.where.inicio.gte.getTime()).toBeLessThan(datos.inicio.getTime());
    expect(argumento.where.inicio.lte.getTime()).toBeGreaterThan(
      datos.inicio.getTime() + pelicula.duracionMinutos * UN_MINUTO_EN_MS,
    );
    expect(argumento.take).toBeGreaterThan(0);
  });

  it("responde 404 si la película no existe", async () => {
    buscarPelicula.mockResolvedValue(null);

    await expect(crearFuncion(datos)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("responde 404 si la sala no existe", async () => {
    buscarSala.mockResolvedValue(null);

    await expect(crearFuncion(datos)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("responde 409 si la película está dada de baja", async () => {
    buscarPelicula.mockResolvedValue({ ...pelicula, bajaEn: new Date() });

    await expect(crearFuncion(datos)).rejects.toBeInstanceOf(ErrorDeConflicto);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 409 si la sala está eliminada", async () => {
    buscarSala.mockResolvedValue({ ...sala, eliminadaEn: new Date() });

    await expect(crearFuncion(datos)).rejects.toBeInstanceOf(ErrorDeConflicto);
    expect(crear).not.toHaveBeenCalled();
  });
});

describe("listarCartelera", () => {
  it("publica solo funciones futuras de salas vigentes y películas en cartelera", async () => {
    buscarFunciones.mockResolvedValue([]);

    await listarCartelera({ limite: 50 });

    const argumento = buscarFunciones.mock.calls[0]?.[0];
    expect(argumento.where.sala).toEqual({ eliminadaEn: null });
    expect(argumento.where.pelicula).toEqual({ bajaEn: null });
    expect(argumento.where.inicio.gte).toBeInstanceOf(Date);
    expect(argumento.take).toBe(50);
    expect(argumento.select).toBeDefined();
  });
});

describe("listarButacasDeFuncion", () => {
  const funcion = {
    id: "fun_1",
    inicio: alas(20),
    pelicula: { id: pelicula.id, titulo: pelicula.titulo },
    sala: { id: sala.id, nombre: sala.nombre },
  };

  beforeEach(() => {
    buscarFuncion.mockResolvedValue(funcion);
    buscarButacas.mockResolvedValue([
      { id: "but_1", fila: 1, columna: 1 },
      { id: "but_2", fila: 1, columna: 2 },
    ]);
    buscarEntradas.mockResolvedValue([{ butacaId: "but_2" }]);
  });

  it("marca como ocupada la butaca con una entrada vendida en esa función", async () => {
    const resultado = await listarButacasDeFuncion("fun_1");

    expect(resultado.butacas).toEqual([
      { id: "but_1", fila: 1, columna: 1, ocupada: false },
      { id: "but_2", fila: 1, columna: 2, ocupada: true },
    ]);
  });

  it("cuenta como ocupadas solo las entradas de compras PAGADAS de esa función", async () => {
    await listarButacasDeFuncion("fun_1");

    expect(buscarEntradas.mock.calls[0]?.[0]).toMatchObject({
      where: { funcionId: "fun_1", compra: { estado: "PAGADA" } },
    });
  });

  it("pide las butacas de la sala de la función, con límite explícito", async () => {
    await listarButacasDeFuncion("fun_1");

    const argumento = buscarButacas.mock.calls[0]?.[0];
    expect(argumento.where).toEqual({ salaId: sala.id });
    expect(argumento.take).toBeGreaterThan(0);
  });

  it("responde 404 si la función no existe", async () => {
    buscarFuncion.mockResolvedValue(null);

    await expect(listarButacasDeFuncion("fantasma")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
