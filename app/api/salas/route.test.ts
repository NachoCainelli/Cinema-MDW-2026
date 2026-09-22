import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto, ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/salas", () => ({ crearSala: vi.fn(), listarSalas: vi.fn() }));

const { requerirUsuario } = await import("@/lib/auth");
const { crearSala, listarSalas } = await import("@/lib/db/salas");
const { POST, GET } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const crear = vi.mocked(crearSala);
const listar = vi.mocked(listarSalas);

const administrador = {
  id: "usr_1",
  email: "admin@cine.com",
  nombre: "Admin",
  rol: "ADMINISTRADOR" as const,
};

const bodyValido = { nombre: "Sala 1", filas: 10, columnas: 10 };
const salaCreada = { id: "sala_1", nombre: "Sala 1", filas: 10, columnas: 10 };

function postRequest(body: unknown) {
  return new Request("http://localhost/api/salas", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function getRequest(query = "") {
  return new Request(`http://localhost/api/salas${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(administrador);
  crear.mockResolvedValue(salaCreada as never);
  listar.mockResolvedValue([] as never);
});

describe("POST /api/salas", () => {
  it("responde 201 con la sala creada", async () => {
    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(201);
    await expect(respuesta.json()).resolves.toEqual(salaCreada);
  });

  it("exige el rol ADMINISTRADOR", async () => {
    await POST(postRequest(bodyValido));

    expect(autorizar).toHaveBeenCalledWith("ADMINISTRADOR");
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

  it("responde 401 sin sesión aunque el body también sea inválido: la sesión se revisa primero", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await POST(postRequest({ ...bodyValido, filas: 0 }));

    expect(respuesta.status).toBe(401);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si las filas son cero o negativas", async () => {
    const respuesta = await POST(postRequest({ ...bodyValido, filas: 0 }));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si las columnas son cero o negativas", async () => {
    const respuesta = await POST(postRequest({ ...bodyValido, columnas: -1 }));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si el body no es JSON válido", async () => {
    const respuesta = await POST(postRequest("{"));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 409 si ya existe una sala con ese nombre", async () => {
    crear.mockRejectedValue(
      new ErrorDeConflicto('Ya existe una sala con el nombre "Sala 1"'),
    );

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: 'Ya existe una sala con el nombre "Sala 1"',
    });
  });
});

describe("GET /api/salas", () => {
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

  it("responde 403 si el rol no corresponde", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await GET(getRequest());

    expect(respuesta.status).toBe(403);
    expect(listar).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión aunque el límite también sea inválido: la sesión se revisa primero", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await GET(getRequest("?limite=999"));

    expect(respuesta.status).toBe(401);
    expect(listar).not.toHaveBeenCalled();
  });
});
