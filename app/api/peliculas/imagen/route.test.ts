import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";

vi.mock("@/lib/auth", () => ({ requerirUsuario: vi.fn() }));
vi.mock("@/lib/storage", () => ({ subirImagen: vi.fn() }));

const { requerirUsuario } = await import("@/lib/auth");
const { subirImagen } = await import("@/lib/storage");
const { POST } = await import("./route");

const autorizar = vi.mocked(requerirUsuario);
const subir = vi.mocked(subirImagen);

const gestor = {
  id: "usr_1",
  email: "gestor@cine.com",
  nombre: "Gestor",
  rol: "GESTOR_CARTELERA" as const,
};

const urlSubida = "https://proyecto.supabase.co/storage/v1/object/public/posters/abc.png";

function archivo(bytes = 1000, tipo = "image/png") {
  return new File([new Uint8Array(bytes)], "poster.png", { type: tipo });
}

function postRequest(campo: "archivo" | "otroNombre" = "archivo", valor: File | string = archivo()) {
  const formData = new FormData();
  formData.set(campo, valor);
  return new Request("http://localhost/api/peliculas/imagen", { method: "POST", body: formData });
}

beforeEach(() => {
  vi.clearAllMocks();
  autorizar.mockResolvedValue(gestor);
  subir.mockResolvedValue(urlSubida);
});

describe("POST /api/peliculas/imagen", () => {
  it("responde 201 con la URL pública de la imagen subida", async () => {
    const respuesta = await POST(postRequest());

    expect(respuesta.status).toBe(201);
    await expect(respuesta.json()).resolves.toEqual({ imagenUrl: urlSubida });
  });

  it("sube el archivo que llegó en el campo `archivo`", async () => {
    const elArchivo = archivo();
    await POST(postRequest("archivo", elArchivo));

    expect(subir).toHaveBeenCalledWith(elArchivo);
  });

  it("exige el rol GESTOR_CARTELERA", async () => {
    await POST(postRequest());

    expect(autorizar).toHaveBeenCalledWith("GESTOR_CARTELERA");
  });

  it("responde 401 sin sesión, sin llamar a Storage", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutenticado());

    const respuesta = await POST(postRequest());

    expect(respuesta.status).toBe(401);
    expect(subir).not.toHaveBeenCalled();
  });

  it("responde 403 si el rol no corresponde, sin llamar a Storage", async () => {
    autorizar.mockRejectedValue(new ErrorNoAutorizado());

    const respuesta = await POST(postRequest());

    expect(respuesta.status).toBe(403);
    expect(subir).not.toHaveBeenCalled();
  });

  it("responde 400 si no llega ningún archivo", async () => {
    const respuesta = await POST(postRequest("otroNombre", "no-es-el-campo-correcto"));

    expect(respuesta.status).toBe(400);
    expect(subir).not.toHaveBeenCalled();
    expect(autorizar).not.toHaveBeenCalled();
  });

  it("responde 400 si el archivo no es un tipo de imagen permitido", async () => {
    const respuesta = await POST(postRequest("archivo", archivo(1000, "application/pdf")));

    expect(respuesta.status).toBe(400);
    expect(subir).not.toHaveBeenCalled();
  });

  it("responde 400 si el archivo supera los 5 MB", async () => {
    const respuesta = await POST(postRequest("archivo", archivo(5 * 1024 * 1024 + 1)));

    expect(respuesta.status).toBe(400);
    expect(subir).not.toHaveBeenCalled();
  });

  it("responde 500 si Supabase Storage no responde, sin filtrar el detalle interno", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    subir.mockRejectedValue(new Error("fetch failed: connect ETIMEDOUT"));

    const respuesta = await POST(postRequest());

    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "Error interno del servidor" });
    log.mockRestore();
  });
});
