import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorNoEncontrado } from "@/lib/errores";

vi.mock("@/lib/db/funciones", () => ({ listarButacasDeFuncion: vi.fn() }));

const { listarButacasDeFuncion } = await import("@/lib/db/funciones");
const { GET } = await import("./route");

const listar = vi.mocked(listarButacasDeFuncion);

const respuestaDeLaBase = {
  funcion: { id: "fun_1" },
  butacas: [
    { id: "but_1", fila: 1, columna: 1, ocupada: false },
    { id: "but_2", fila: 1, columna: 2, ocupada: true },
  ],
};

function request(id: string) {
  return {
    request: new Request(`http://localhost/api/funciones/${id}/butacas`),
    contexto: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  listar.mockResolvedValue(respuestaDeLaBase as never);
});

describe("GET /api/funciones/:id/butacas", () => {
  it("responde 200 con las butacas y su estado, sin pedir sesión", async () => {
    const { request: pedido, contexto } = request("fun_1");

    const respuesta = await GET(pedido, contexto);

    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual(respuestaDeLaBase);
  });

  it("le pasa a la base el id que viene en la ruta", async () => {
    const { request: pedido, contexto } = request("fun_1");

    await GET(pedido, contexto);

    expect(listar).toHaveBeenCalledWith("fun_1");
  });

  it("responde 404 si la función no existe", async () => {
    listar.mockRejectedValue(new ErrorNoEncontrado("No existe la función indicada"));
    const { request: pedido, contexto } = request("fantasma");

    const respuesta = await GET(pedido, contexto);

    expect(respuesta.status).toBe(404);
    await expect(respuesta.json()).resolves.toEqual({ error: "No existe la función indicada" });
  });
});
