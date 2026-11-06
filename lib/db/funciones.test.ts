import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";
import { formatearFecha } from "@/lib/utils";

const {
  buscarPelicula,
  buscarSala,
  buscarFunciones,
  crear,
  buscarFuncion,
  buscarFuncionPublicada,
  buscarButacas,
  buscarEntradas,
} =
  vi.hoisted(() => ({
    buscarFuncionPublicada: vi.fn(),
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
    funcion: {
      findMany: buscarFunciones,
      create: crear,
      findUnique: buscarFuncion,
      findFirst: buscarFuncionPublicada,
    },
    butaca: { findMany: buscarButacas },
    entrada: { findMany: buscarEntradas },
  },
}));

const { crearFuncion, listarCartelera, listarButacasDeFuncion, listarButacasDeFuncionPublicada } =
  await import("./funciones");

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
      // En hora argentina, como lo lee el gestor en la pantalla (20:00 UTC → 17:00).
      `La sala Sala 1 ya tiene la función de "Duna" el ${formatearFecha(alas(20))} (120 min). ` +
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
  /** `cantidad` funciones de mentira, que es lo único que mira el paginado. */
  function funciones(cantidad: number) {
    return Array.from({ length: cantidad }, (_, indice) => ({ id: `fun_${indice + 1}` }));
  }

  it("publica solo funciones futuras de salas vigentes y películas en cartelera", async () => {
    buscarFunciones.mockResolvedValue([]);

    await listarCartelera({ q: undefined, pagina: 1, limite: 50 });

    const argumento = buscarFunciones.mock.calls[0]?.[0];
    expect(argumento.where.sala).toEqual({ eliminadaEn: null });
    expect(argumento.where.pelicula).toEqual({ bajaEn: null });
    expect(argumento.where.inicio.gte).toBeInstanceOf(Date);
    expect(argumento.select).toBeDefined();
  });

  it("filtra por título sin distinguir mayúsculas, sin perder el filtro de película en cartelera", async () => {
    buscarFunciones.mockResolvedValue([]);

    await listarCartelera({ q: "duna", pagina: 1, limite: 50 });

    const argumento = buscarFunciones.mock.calls[0]?.[0];
    expect(argumento.where.pelicula).toEqual({
      bajaEn: null,
      titulo: { contains: "duna", mode: "insensitive" },
    });
    expect(argumento.where.sala).toEqual({ eliminadaEn: null });
  });

  it("ordena por inicio y desempata por id, para que las páginas no se pisen", async () => {
    buscarFunciones.mockResolvedValue([]);

    await listarCartelera({ q: undefined, pagina: 1, limite: 50 });

    expect(buscarFunciones.mock.calls[0]?.[0].orderBy).toEqual([{ inicio: "asc" }, { id: "asc" }]);
  });

  it("saltea las páginas anteriores y pide una función de más", async () => {
    buscarFunciones.mockResolvedValue([]);

    await listarCartelera({ q: undefined, pagina: 3, limite: 10 });

    const argumento = buscarFunciones.mock.calls[0]?.[0];
    expect(argumento.skip).toBe(20);
    expect(argumento.take).toBe(11);
  });

  it("con la función de más, avisa que hay otra página y no la devuelve", async () => {
    buscarFunciones.mockResolvedValue(funciones(11));

    const resultado = await listarCartelera({ q: undefined, pagina: 1, limite: 10 });

    expect(resultado.hayMas).toBe(true);
    expect(resultado.funciones).toHaveLength(10);
    expect(resultado.funciones.at(-1)).toEqual({ id: "fun_10" });
  });

  it("sin la función de más, es la última página", async () => {
    buscarFunciones.mockResolvedValue(funciones(10));

    const resultado = await listarCartelera({ q: undefined, pagina: 1, limite: 10 });

    expect(resultado).toEqual({ funciones: funciones(10), hayMas: false });
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

describe("listarButacasDeFuncionPublicada", () => {
  const funcion = {
    id: "fun_1",
    inicio: alas(20),
    pelicula: { id: pelicula.id, titulo: pelicula.titulo },
    sala: { id: sala.id, nombre: sala.nombre },
  };

  beforeEach(() => {
    buscarFuncionPublicada.mockResolvedValue(funcion);
    buscarButacas.mockResolvedValue([{ id: "but_1", fila: 1, columna: 1 }]);
    buscarEntradas.mockResolvedValue([]);
  });

  it("busca por id con el mismo criterio que la cartelera", async () => {
    await listarButacasDeFuncionPublicada("fun_1");

    const argumento = buscarFuncionPublicada.mock.calls[0]?.[0];
    expect(argumento.where).toMatchObject({
      id: "fun_1",
      sala: { eliminadaEn: null },
      pelicula: { bajaEn: null },
    });
    expect(argumento.where.inicio.gte).toBeInstanceOf(Date);
  });

  it("devuelve la función con sus butacas y su estado", async () => {
    await expect(listarButacasDeFuncionPublicada("fun_1")).resolves.toEqual({
      funcion,
      butacas: [{ id: "but_1", fila: 1, columna: 1, ocupada: false }],
    });
  });

  it("responde 404 si la función no existe o no está publicada", async () => {
    buscarFuncionPublicada.mockResolvedValue(null);

    await expect(listarButacasDeFuncionPublicada("fun_1")).rejects.toBeInstanceOf(
      ErrorNoEncontrado,
    );
    expect(buscarButacas).not.toHaveBeenCalled();
  });
});
