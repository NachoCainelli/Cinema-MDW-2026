import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto, ErrorNoAutenticado, ErrorNoAutorizado, ErrorNoEncontrado } from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/funciones", () => ({ crearFuncion: vi.fn(), listarCartelera: vi.fn() }));

const { requerirUsuario } = await import("@/lib/auth");
const { crearFuncion, listarCartelera } = await import("@/lib/db/funciones");
const { POST, GET } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const crear = vi.mocked(crearFuncion);
const listar = vi.mocked(listarCartelera);

const gestor = {
  id: "usr_1",
  email: "gestor@cine.com",
  nombre: "Gestor",
  rol: "GESTOR_CARTELERA" as const,
};

const funcionCreada = { id: "fun_1" };

function enHoras(horas: number) {
  return new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/funciones", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const bodyValido = { peliculaId: "pel_1", salaId: "sala_1", inicio: enHoras(24) };

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(gestor);
  crear.mockResolvedValue(funcionCreada as never);
  listar.mockResolvedValue({ funciones: [], hayMas: false } as never);
});

describe("POST /api/funciones", () => {
  it("responde 201 con la función creada", async () => {
    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(201);
    await expect(respuesta.json()).resolves.toEqual(funcionCreada);
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

  it("responde 403 si el rol no corresponde, sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(403);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión aunque la función arranque en el pasado: la sesión se revisa primero", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await POST(postRequest({ ...bodyValido, inicio: enHoras(-2) }));

    expect(respuesta.status).toBe(401);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si la función arranca en el pasado", async () => {
    const respuesta = await POST(postRequest({ ...bodyValido, inicio: enHoras(-2) }));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si el body no es JSON válido", async () => {
    const respuesta = await POST(postRequest("{"));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 409 con el motivo cuando hay solapamiento en la sala", async () => {
    crear.mockRejectedValue(new ErrorDeConflicto("La sala Sala 1 ya tiene una función"));

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: "La sala Sala 1 ya tiene una función",
    });
  });

  it("responde 404 si la película no existe", async () => {
    crear.mockRejectedValue(new ErrorNoEncontrado("No existe la película indicada"));

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(404);
  });
});

describe("GET /api/funciones", () => {
  it("responde 200 sin pedir sesión: la cartelera es pública", async () => {
    const respuesta = await GET(new Request("http://localhost/api/funciones"));

    expect(respuesta.status).toBe(200);
    expect(autorizar).not.toHaveBeenCalled();
  });

  it("responde con las funciones y si hay otra página", async () => {
    listar.mockResolvedValue({ funciones: [{ id: "fun_1" }], hayMas: true } as never);

    const respuesta = await GET(new Request("http://localhost/api/funciones"));

    await expect(respuesta.json()).resolves.toEqual({ funciones: [{ id: "fun_1" }], hayMas: true });
  });

  it("usa la primera página, el límite por defecto y ninguna búsqueda si no vienen en la query", async () => {
    await GET(new Request("http://localhost/api/funciones"));

    expect(listar).toHaveBeenCalledWith({ q: undefined, pagina: 1, limite: 50 });
  });

  it("respeta el límite que llega por query string", async () => {
    await GET(new Request("http://localhost/api/funciones?limite=10"));

    expect(listar).toHaveBeenCalledWith({ q: undefined, pagina: 1, limite: 10 });
  });

  it("pasa la búsqueda sin espacios y la página que llegan por query string", async () => {
    await GET(new Request("http://localhost/api/funciones?q=%20Duna%20&pagina=2"));

    expect(listar).toHaveBeenCalledWith({ q: "Duna", pagina: 2, limite: 50 });
  });

  it("responde 400 si el límite no es válido", async () => {
    const respuesta = await GET(new Request("http://localhost/api/funciones?limite=999"));

    expect(respuesta.status).toBe(400);
    expect(listar).not.toHaveBeenCalled();
  });

  it("responde 400 si la página no es válida", async () => {
    const respuesta = await GET(new Request("http://localhost/api/funciones?pagina=0"));

    expect(respuesta.status).toBe(400);
    expect(listar).not.toHaveBeenCalled();
  });
});
