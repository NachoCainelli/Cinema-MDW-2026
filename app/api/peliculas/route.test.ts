import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/peliculas", () => ({ crearPelicula: vi.fn(), listarPeliculas: vi.fn() }));

const { requerirUsuario } = await import("@/lib/auth");
const { crearPelicula, listarPeliculas } = await import("@/lib/db/peliculas");
const { POST, GET } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const crear = vi.mocked(crearPelicula);
const listar = vi.mocked(listarPeliculas);

const gestor = {
  id: "usr_1",
  email: "gestor@cine.com",
  nombre: "Gestor Cartelera",
  rol: "GESTOR_CARTELERA" as const,
};

const bodyValido = {
  titulo: "Una película",
  sinopsis: "De qué se trata",
  duracionMinutos: 120,
  clasificacion: "ATP",
  categoria: "DRAMA",
};

const peliculaCreada = { id: "pel_1", titulo: "Una película" };

function postRequest(body: unknown) {
  return new Request("http://localhost/api/peliculas", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function getRequest(query = "") {
  return new Request(`http://localhost/api/peliculas${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(gestor);
  crear.mockResolvedValue(peliculaCreada as never);
  listar.mockResolvedValue([] as never);
});

describe("POST /api/peliculas", () => {
  it("responde 201 con la película creada", async () => {
    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(201);
    await expect(respuesta.json()).resolves.toEqual(peliculaCreada);
  });

  it("exige el rol GESTOR_CARTELERA", async () => {
    await POST(postRequest(bodyValido));

    expect(autorizar).toHaveBeenCalledWith("GESTOR_CARTELERA");
  });

  it("responde 401 sin sesión, sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(401);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 403 si el rol no corresponde", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(403);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si la clasificación está fuera de la lista cerrada", async () => {
    const respuesta = await POST(postRequest({ ...bodyValido, clasificacion: "R" }));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si la categoría está fuera de la lista cerrada", async () => {
    const respuesta = await POST(postRequest({ ...bodyValido, categoria: "MUSICAL" }));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si la duración no es válida", async () => {
    const respuesta = await POST(postRequest({ ...bodyValido, duracionMinutos: 0 }));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si el body no es JSON válido", async () => {
    const respuesta = await POST(postRequest("{"));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("ignora los campos que el schema no conoce", async () => {
    await POST(postRequest({ ...bodyValido, bajaEn: new Date().toISOString() }));

    expect(crear).toHaveBeenCalledWith(bodyValido);
  });
});

describe("GET /api/peliculas", () => {
  it("responde 200 con el listado y el límite por defecto", async () => {
    const respuesta = await GET(getRequest());

    expect(respuesta.status).toBe(200);
    expect(listar).toHaveBeenCalledWith({ limite: 50 });
  });

  it("acepta un límite por query string", async () => {
    await GET(getRequest("?limite=10"));

    expect(listar).toHaveBeenCalledWith({ limite: 10 });
  });

  it("responde 400 si el límite está fuera de rango", async () => {
    const respuesta = await GET(getRequest("?limite=999"));

    expect(respuesta.status).toBe(400);
    expect(listar).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await GET(getRequest());

    expect(respuesta.status).toBe(401);
    expect(listar).not.toHaveBeenCalled();
  });
});
