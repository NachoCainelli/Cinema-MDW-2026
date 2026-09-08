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

const {
  MARGEN_ENTRE_FUNCIONES_MINUTOS,
  seSolapan,
  crearFuncion,
  listarCartelera,
  listarButacasDeFuncion,
} = await import("./funciones");

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

describe("seSolapan (regla de las 15 minutos)", () => {
  // La existente ocupa la sala de 20:00 a 22:00, más el margen: 22:15.
  const enSala = { inicio: alas(20), duracionMinutos: 120 };

  it("deja pasar una función que arranca exactamente 15 minutos después", () => {
    expect(seSolapan(enSala, { inicio: alas(22, 15), duracionMinutos: 90 })).toBe(false);
  });

  it("rechaza una función que arranca 14 minutos después: falta un minuto de margen", () => {
    expect(seSolapan(enSala, { inicio: alas(22, 14), duracionMinutos: 90 })).toBe(true);
  });

  it("rechaza una función que arranca justo cuando termina la anterior", () => {
    expect(seSolapan(enSala, { inicio: alas(22), duracionMinutos: 90 })).toBe(true);
  });

  it("rechaza una función que empieza en el medio de la anterior", () => {
    expect(seSolapan(enSala, { inicio: alas(21), duracionMinutos: 90 })).toBe(true);
  });

  it("aplica el margen también hacia atrás: la nueva termina 14 minutos antes", () => {
    // Termina a las 19:46 (19:46 + 14 = 20:00), le falta un minuto de margen.
    expect(seSolapan(enSala, { inicio: alas(18, 46), duracionMinutos: 60 })).toBe(true);
  });

  it("deja pasar una función que termina 15 minutos antes", () => {
    expect(seSolapan(enSala, { inicio: alas(18, 45), duracionMinutos: 60 })).toBe(false);
  });

  it("deja pasar funciones de horarios lejanos", () => {
    expect(seSolapan(enSala, { inicio: alas(10), duracionMinutos: 120 })).toBe(false);
  });

  it("usa el margen que declara el módulo", () => {
    expect(MARGEN_ENTRE_FUNCIONES_MINUTOS).toBe(15);
  });
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
