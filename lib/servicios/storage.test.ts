import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subirImagen } from "./storage";

const fetchMock = vi.fn();

function archivo(contenido = "contenido", tipo = "image/png") {
  return new File([contenido], "poster.png", { type: tipo });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SUPABASE_URL", "https://proyecto.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-secreta");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("subirImagen", () => {
  it("sube el archivo al bucket público con la service_role key y un timeout", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await subirImagen(archivo());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toMatch(/^https:\/\/proyecto\.supabase\.co\/storage\/v1\/object\/posters\/.+\.png$/);
    expect(opciones.method).toBe("POST");
    expect(opciones.headers).toMatchObject({
      Authorization: "Bearer clave-secreta",
      "Content-Type": "image/png",
    });
    expect(opciones.body).toBeInstanceOf(File);
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it("devuelve la URL pública del bucket, no la de escritura", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const url = await subirImagen(archivo());

    expect(url).toMatch(
      /^https:\/\/proyecto\.supabase\.co\/storage\/v1\/object\/public\/posters\/.+\.png$/,
    );
  });

  it("nombra cada subida distinto: dos archivos no se pisan", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const urlA = await subirImagen(archivo());
    const urlB = await subirImagen(archivo());

    expect(urlA).not.toBe(urlB);
  });

  it("elige la extensión según el tipo del archivo", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const url = await subirImagen(archivo("contenido", "image/webp"));

    expect(url).toMatch(/\.webp$/);
  });

  it("devuelve null (no lanza) y loguea si Supabase Storage responde con un error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response("bucket no encontrado", { status: 404 }));

    const resultado = await subirImagen(archivo());

    expect(resultado).toBeNull();
    expect(log).toHaveBeenCalledWith("storage: no se pudo subir la imagen", expect.any(Error));
    log.mockRestore();
  });

  it("devuelve null y loguea si falla la red", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const resultado = await subirImagen(archivo());

    expect(resultado).toBeNull();
    expect(log).toHaveBeenCalledWith("storage: no se pudo subir la imagen", expect.any(TypeError));
    log.mockRestore();
  });

  it("devuelve null y loguea si Storage no responde a tiempo (timeout)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    // Lo que tira `AbortSignal.timeout` cuando se cumple el plazo.
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted", "TimeoutError"));

    const resultado = await subirImagen(archivo());

    expect(resultado).toBeNull();
    expect(log).toHaveBeenCalledWith("storage: no se pudo subir la imagen", expect.any(DOMException));
    log.mockRestore();
  });

  it("devuelve null y loguea si faltan las variables de entorno, sin llamar a fetch", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.unstubAllEnvs();

    const resultado = await subirImagen(archivo());

    expect(resultado).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("storage: no se pudo subir la imagen", expect.any(String));
    log.mockRestore();
  });
});
