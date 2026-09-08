import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { ErrorDeConflicto, ErrorNoEncontrado } from "@/lib/errores";

const { crear, listar, buscar, actualizar, contar } = vi.hoisted(() => ({
  crear: vi.fn(),
  listar: vi.fn(),
  buscar: vi.fn(),
  actualizar: vi.fn(),
  contar: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    pelicula: {
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

const { crearPelicula, listarPeliculas, actualizarPelicula, darDeBajaPelicula } = await import(
  "./peliculas"
);

const datos = {
  titulo: "Una película",
  sinopsis: "De qué se trata",
  duracionMinutos: 120,
  clasificacion: "ATP" as const,
  categoria: "DRAMA" as const,
};

const peliculaCreada = { id: "pel_1", ...datos, imagenUrl: null, creadaEn: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
  crear.mockResolvedValue(peliculaCreada);
  listar.mockResolvedValue([peliculaCreada]);
  buscar.mockResolvedValue({ ...peliculaCreada, bajaEn: null });
  actualizar.mockResolvedValue(peliculaCreada);
  contar.mockResolvedValue(0);
});

type ArgsPrisma = {
  data?: { bajaEn?: unknown };
  select?: Record<string, unknown>;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

/** El argumento con el que se llamó a un mock de Prisma, o un error si no se llamó. */
function argumentoDe(mock: typeof crear, indice = 0): ArgsPrisma {
  const llamada = mock.mock.calls[indice];
  if (!llamada) throw new Error("se esperaba una llamada a Prisma y no hubo ninguna");
  return llamada[0] as ArgsPrisma;
}

function errorDePrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falló", { code, clientVersion: "6" });
}

describe("crearPelicula", () => {
  it("retorna la película creada con los campos públicos", async () => {
    await expect(crearPelicula(datos)).resolves.toEqual(peliculaCreada);
    expect(argumentoDe(crear).select).toMatchObject({ titulo: true });
  });
});

describe("listarPeliculas", () => {
  it("lista solo las películas en cartelera, ordenadas y con el límite pedido", async () => {
    await expect(listarPeliculas({ limite: 50 })).resolves.toEqual([peliculaCreada]);

    const llamada = argumentoDe(listar);
    expect(llamada.where).toEqual({ bajaEn: null });
    expect(llamada.orderBy).toEqual({ titulo: "asc" });
    expect(llamada.take).toBe(50);
  });
});

describe("actualizarPelicula", () => {
  it("actualiza solo los campos enviados, sin tocar el resto", async () => {
    await actualizarPelicula("pel_1", { titulo: "Otro título" });

    expect(argumentoDe(actualizar).data).toEqual({ titulo: "Otro título" });
  });

  it("no deja editar una película dada de baja: el filtro va en el where", async () => {
    await actualizarPelicula("pel_1", { titulo: "Otro título" });

    expect(argumentoDe(actualizar).where).toEqual({ id: "pel_1", bajaEn: null });
  });

  it("traduce el registro inexistente a ErrorNoEncontrado (404)", async () => {
    actualizar.mockRejectedValue(errorDePrisma("P2025"));

    await expect(actualizarPelicula("pel_1", { titulo: "x" })).rejects.toBeInstanceOf(
      ErrorNoEncontrado,
    );
  });

  it("deja pasar cualquier otro error de la base para que termine en 500", async () => {
    actualizar.mockRejectedValue(errorDePrisma("P1001"));

    await expect(actualizarPelicula("pel_1", { titulo: "x" })).rejects.not.toBeInstanceOf(
      ErrorNoEncontrado,
    );
  });
});

describe("darDeBajaPelicula", () => {
  it("arroja ErrorNoEncontrado si la película no existe", async () => {
    buscar.mockResolvedValue(null);
    await expect(darDeBajaPelicula("pel_1")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("arroja ErrorNoEncontrado si ya estaba dada de baja", async () => {
    buscar.mockResolvedValue({ ...peliculaCreada, bajaEn: new Date() });
    await expect(darDeBajaPelicula("pel_1")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("arroja ErrorDeConflicto si tiene funciones en curso o programadas", async () => {
    contar.mockResolvedValue(1);

    await expect(darDeBajaPelicula("pel_1")).rejects.toBeInstanceOf(ErrorDeConflicto);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("cuenta como en curso una función que arrancó hace menos que la duración de la película", async () => {
    await darDeBajaPelicula("pel_1"); // dura 120 minutos

    const where = argumentoDe(contar).where as { peliculaId: string; inicio: { gte: Date } };
    expect(where.peliculaId).toBe("pel_1");

    // La ventana arranca 120 minutos atrás: una función de las 2 en punto
    // todavía se está proyectando a las 3.
    const minutosDeVentana = (Date.now() - where.inicio.gte.getTime()) / 60_000;
    expect(minutosDeVentana).toBeCloseTo(120, 0);
  });

  it("marca bajaEn en vez de borrar la fila", async () => {
    await darDeBajaPelicula("pel_1");

    const llamada = argumentoDe(actualizar);
    expect(llamada.where).toEqual({ id: "pel_1" });
    expect(llamada.data?.bajaEn).toBeInstanceOf(Date);
  });
});
