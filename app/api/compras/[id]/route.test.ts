import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/db/compras", () => ({ obtenerCompraDeUsuario: vi.fn() }));

const { requerirUsuario } = await import("@/lib/auth");
const { obtenerCompraDeUsuario } = await import("@/lib/db/compras");
const { GET } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const obtener = vi.mocked(obtenerCompraDeUsuario);

const usuario = {
  id: "usr_1",
  email: "persona@mail.com",
  nombre: "Ana Pérez",
  rol: "USUARIO" as const,
};

const compraPropia = { id: "com_1", estado: "PAGADA", entradas: [] };

/**
 * La base mockeada se comporta como el `where: { id, usuarioId }`: solo
 * encuentra la compra si el id existe y además es de quien pregunta.
 */
let compras: Array<typeof compraPropia & { usuarioId: string }> = [];

/** El segundo argumento de un route handler dinámico: los params de la ruta. */
function contexto(id = "com_1") {
  return { params: Promise.resolve({ id }) };
}

function getRequest(id = "com_1") {
  return new Request(`http://localhost/api/compras/${id}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(usuario);
  compras = [
    { ...compraPropia, usuarioId: usuario.id },
    { id: "com_ajena", estado: "PAGADA", entradas: [], usuarioId: "usr_2" },
  ];
  obtener.mockImplementation(async (id, usuarioId) => {
    const compra = compras.find((c) => c.id === id && c.usuarioId === usuarioId);
    return compra ? ({ id: compra.id, estado: compra.estado, entradas: compra.entradas } as never) : null;
  });
});

describe("GET /api/compras/:id", () => {
  it("responde 200 con la compra propia", async () => {
    const respuesta = await GET(getRequest(), contexto());

    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual(compraPropia);
  });

  it("busca la compra con el usuario de la sesión, no con uno que venga de afuera", async () => {
    await GET(getRequest("com_1?usuarioId=usr_2"), contexto());

    expect(obtener).toHaveBeenCalledWith("com_1", usuario.id);
  });

  it("exige el rol USUARIO", async () => {
    await GET(getRequest(), contexto());

    expect(autorizar).toHaveBeenCalledWith("USUARIO");
  });

  it("responde 404 si la compra no existe", async () => {
    const respuesta = await GET(getRequest("com_inexistente"), contexto("com_inexistente"));

    expect(respuesta.status).toBe(404);
    await expect(respuesta.json()).resolves.toEqual({
      error: "No se encontró la compra con id com_inexistente",
    });
  });

  it("responde 404 con el mismo cuerpo si la compra es de otro usuario", async () => {
    const ajena = await GET(getRequest("com_ajena"), contexto("com_ajena"));

    // El mismo id, ahora sin ninguna compra con ese id en la base.
    compras = compras.filter((compra) => compra.id !== "com_ajena");
    const inexistente = await GET(getRequest("com_ajena"), contexto("com_ajena"));

    expect(ajena.status).toBe(404);
    expect(inexistente.status).toBe(404);
    await expect(ajena.json()).resolves.toEqual(await inexistente.json());
  });

  it("responde 401 sin sesión, sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await GET(getRequest(), contexto());

    expect(respuesta.status).toBe(401);
    expect(obtener).not.toHaveBeenCalled();
  });

  it("responde 403 si el rol no es USUARIO (p. ej. ADMINISTRADOR), sin tocar la base", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await GET(getRequest(), contexto());

    expect(respuesta.status).toBe(403);
    expect(obtener).not.toHaveBeenCalled();
  });
});
