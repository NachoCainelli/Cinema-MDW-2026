import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorDeConflicto,
  ErrorNoAutenticado,
  ErrorNoAutorizado,
  ErrorNoEncontrado,
} from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/peliculas", () => ({
  actualizarPelicula: vi.fn(),
  darDeBajaPelicula: vi.fn(),
}));

const { requerirUsuario } = await import("@/lib/auth");
const { actualizarPelicula, darDeBajaPelicula } = await import("@/lib/db/peliculas");
const { PATCH, DELETE } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const actualizar = vi.mocked(actualizarPelicula);
const darDeBaja = vi.mocked(darDeBajaPelicula);

const gestor = {
  id: "usr_1",
  email: "gestor@cine.com",
  nombre: "Gestor Cartelera",
  rol: "GESTOR_CARTELERA" as const,
};

const peliculaEditada = { id: "pel_1", titulo: "Otro título" };

/** El segundo argumento de un route handler dinámico: los params de la ruta. */
function contexto(id = "pel_1") {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/peliculas/pel_1", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function deleteRequest() {
  return new Request("http://localhost/api/peliculas/pel_1", { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(gestor);
  actualizar.mockResolvedValue(peliculaEditada as never);
  darDeBaja.mockResolvedValue(undefined);
});

describe("PATCH /api/peliculas/:id", () => {
  it("responde 200 con la película editada", async () => {
    const respuesta = await PATCH(patchRequest({ titulo: "Otro título" }), contexto());

    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual(peliculaEditada);
  });

  it("edita solo los campos enviados: el schema parcial no exige el resto", async () => {
    await PATCH(patchRequest({ titulo: "Otro título" }), contexto());

    expect(actualizar).toHaveBeenCalledWith("pel_1", { titulo: "Otro título" });
  });

  it("exige el rol GESTOR_CARTELERA", async () => {
    await PATCH(patchRequest({ titulo: "Otro título" }), contexto());

    expect(autorizar).toHaveBeenCalledWith("GESTOR_CARTELERA");
  });

  it("responde 401 sin sesión, sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await PATCH(patchRequest({ titulo: "x" }), contexto());

    expect(respuesta.status).toBe(401);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("responde 403 si el rol no corresponde", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await PATCH(patchRequest({ titulo: "x" }), contexto());

    expect(respuesta.status).toBe(403);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("responde 404 si la película no existe o está fuera de cartelera", async () => {
    actualizar.mockRejectedValue(new ErrorNoEncontrado("No se encontró la película con id pel_1"));

    const respuesta = await PATCH(patchRequest({ titulo: "x" }), contexto());

    expect(respuesta.status).toBe(404);
  });

  it("responde 400 si un campo enviado es inválido", async () => {
    const respuesta = await PATCH(patchRequest({ clasificacion: "R" }), contexto());

    expect(respuesta.status).toBe(400);
    expect(actualizar).not.toHaveBeenCalled();
  });

  it("responde 400 si no llega ningún campo conocido, en vez de un 200 que no cambió nada", async () => {
    const respuesta = await PATCH(patchRequest({ tituloo: "typo" }), contexto());

    expect(respuesta.status).toBe(400);
    expect(actualizar).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/peliculas/:id", () => {
  it("responde 204 sin cuerpo", async () => {
    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(204);
    await expect(respuesta.text()).resolves.toBe("");
    expect(darDeBaja).toHaveBeenCalledWith("pel_1");
  });

  it("exige el rol GESTOR_CARTELERA", async () => {
    await DELETE(deleteRequest(), contexto());

    expect(autorizar).toHaveBeenCalledWith("GESTOR_CARTELERA");
  });

  it("responde 401 sin sesión, sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(401);
    expect(darDeBaja).not.toHaveBeenCalled();
  });

  it("responde 403 si el rol no corresponde", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(403);
    expect(darDeBaja).not.toHaveBeenCalled();
  });

  it("responde 404 si la película no existe", async () => {
    darDeBaja.mockRejectedValue(new ErrorNoEncontrado("No se encontró la película con id pel_1"));

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(404);
  });

  it("responde 409 con el motivo si la película tiene funciones futuras", async () => {
    darDeBaja.mockRejectedValue(
      new ErrorDeConflicto('No se puede sacar de cartelera "Una película" porque tiene funciones'),
    );

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: 'No se puede sacar de cartelera "Una película" porque tiene funciones',
    });
  });
});
