import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorDeConflicto,
  ErrorDePagoRechazado,
  ErrorNoAutenticado,
  ErrorNoAutorizado,
  ErrorNoEncontrado,
} from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/compras", () => ({ crearCompra: vi.fn(), listarComprasDeUsuario: vi.fn() }));

const { requerirUsuario } = await import("@/lib/auth");
const { crearCompra, listarComprasDeUsuario } = await import("@/lib/db/compras");
const { POST, GET } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const crear = vi.mocked(crearCompra);
const listar = vi.mocked(listarComprasDeUsuario);

const usuario = {
  id: "usr_1",
  email: "persona@mail.com",
  nombre: "Ana Pérez",
  rol: "USUARIO" as const,
};

const compraCreada = { id: "com_1", estado: "PAGADA" };

const bodyValido = { funcionId: "fun_1", butacaIds: ["but_1", "but_2"] };

function postRequest(body: unknown) {
  return new Request("http://localhost/api/compras", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function getRequest(query = "") {
  return new Request(`http://localhost/api/compras${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(usuario);
  crear.mockResolvedValue(compraCreada as never);
  listar.mockResolvedValue([] as never);
});

describe("POST /api/compras", () => {
  it("responde 201 con la compra creada", async () => {
    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(201);
    await expect(respuesta.json()).resolves.toEqual(compraCreada);
  });

  it("exige el rol USUARIO", async () => {
    await POST(postRequest(bodyValido));

    expect(autorizar).toHaveBeenCalledWith("USUARIO");
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

  it("compra a nombre del usuario de la sesión, ignorando el del body", async () => {
    await POST(postRequest({ ...bodyValido, usuarioId: "usr_ajeno" }));

    expect(crear).toHaveBeenCalledWith(bodyValido, usuario.id);
  });

  it("responde 400 si no se seleccionó ninguna butaca", async () => {
    const respuesta = await POST(postRequest({ ...bodyValido, butacaIds: [] }));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 400 si el body no es JSON válido", async () => {
    const respuesta = await POST(postRequest("{"));

    expect(respuesta.status).toBe(400);
    expect(crear).not.toHaveBeenCalled();
  });

  it("responde 402 si el pago se rechaza", async () => {
    crear.mockRejectedValue(new ErrorDePagoRechazado("Tarjeta sin fondos"));

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(402);
    await expect(respuesta.json()).resolves.toEqual({ error: "Tarjeta sin fondos" });
  });

  it("responde 404 si la función no existe", async () => {
    crear.mockRejectedValue(new ErrorNoEncontrado("No existe la función indicada"));

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(404);
  });

  it("responde 409 con el motivo cuando la butaca ya está vendida", async () => {
    crear.mockRejectedValue(new ErrorDeConflicto("Una de las butacas que elegiste ya fue vendida"));

    const respuesta = await POST(postRequest(bodyValido));

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: "Una de las butacas que elegiste ya fue vendida",
    });
  });
});

describe("GET /api/compras", () => {
  it("responde 200 con el historial del usuario de la sesión", async () => {
    const respuesta = await GET(getRequest());

    expect(respuesta.status).toBe(200);
    expect(listar).toHaveBeenCalledWith(usuario.id, { limite: 50 });
  });

  it("no acepta un usuarioId por query string: siempre pregunta por el de la sesión", async () => {
    await GET(getRequest("?usuarioId=usr_ajeno"));

    expect(listar).toHaveBeenCalledWith(usuario.id, { limite: 50 });
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
