import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto, ErrorNoAutenticado, ErrorNoAutorizado, ErrorNoEncontrado } from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/salas", () => ({ eliminarSalaLogico: vi.fn() }));

const { requerirUsuario } = await import("@/lib/auth");
const { eliminarSalaLogico } = await import("@/lib/db/salas");
const { DELETE } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const eliminar = vi.mocked(eliminarSalaLogico);

const administrador = {
  id: "usr_1",
  email: "admin@cine.com",
  nombre: "Admin",
  rol: "ADMINISTRADOR" as const,
};

/** El segundo argumento de un route handler dinámico: los params de la ruta. */
function contexto(id = "sala_1") {
  return { params: Promise.resolve({ id }) };
}

function deleteRequest() {
  return new Request("http://localhost/api/salas/sala_1", { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(administrador);
  eliminar.mockResolvedValue(undefined);
});

describe("DELETE /api/salas/:id", () => {
  it("responde 204 sin cuerpo cuando la sala no tiene funciones futuras", async () => {
    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(204);
    await expect(respuesta.text()).resolves.toBe("");
    expect(eliminar).toHaveBeenCalledWith("sala_1");
  });

  it("exige el rol ADMINISTRADOR", async () => {
    await DELETE(deleteRequest(), contexto());

    expect(autorizar).toHaveBeenCalledWith("ADMINISTRADOR");
  });

  it("responde 401 sin sesión, sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(401);
    expect(eliminar).not.toHaveBeenCalled();
  });

  it("responde 403 si el rol no corresponde, sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(403);
    expect(eliminar).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión aunque el id de la ruta también sea inválido: la sesión se revisa primero", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await DELETE(deleteRequest(), contexto(""));

    expect(respuesta.status).toBe(401);
    expect(eliminar).not.toHaveBeenCalled();
  });

  it("responde 404 si la sala no existe", async () => {
    eliminar.mockRejectedValue(new ErrorNoEncontrado("No se encontró la sala con id sala_1"));

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(404);
    await expect(respuesta.json()).resolves.toEqual({
      error: "No se encontró la sala con id sala_1",
    });
  });

  it("responde 409 con el motivo si la sala tiene funciones futuras o en curso", async () => {
    eliminar.mockRejectedValue(
      new ErrorDeConflicto('No se puede eliminar la sala "Sala 1" porque tiene funciones en curso o programadas.'),
    );

    const respuesta = await DELETE(deleteRequest(), contexto());

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: 'No se puede eliminar la sala "Sala 1" porque tiene funciones en curso o programadas.',
    });
  });
});
