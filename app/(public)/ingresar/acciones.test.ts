import { beforeEach, describe, expect, it, vi } from "vitest";

import { SIN_ENVIAR } from "@/lib/formularios";

vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }));
// El paquete real no carga fuera de Next (igual que en lib/auth.test.ts). Como
// el de verdad, el `type` dice qué falló ("CredentialsSignin", …).
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    constructor(readonly type: string) {
      super(type);
    }
  },
}));
vi.mock("next/navigation", () => ({
  // Como el de verdad, `redirect` lanza: lo que esté después no corre.
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT ${destino}`);
  }),
}));

const { AuthError } = await import("next-auth");
const { signIn } = await import("@/lib/auth");
const { ingresarAction } = await import("./acciones");

const iniciarSesion = vi.mocked(signIn);

const credenciales = { email: "ana@ejemplo.com", password: "una-clave-larga" };

function formulario(valores: Record<string, string>) {
  const datos = new FormData();
  for (const [campo, valor] of Object.entries(valores)) datos.set(campo, valor);
  return datos;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Como el de verdad: con `redirectTo`, `signIn` redirige lanzando.
  iniciarSesion.mockImplementation(async () => {
    throw new Error("NEXT_REDIRECT signIn");
  });
});

describe("ingresarAction", () => {
  it("inicia sesión y re-lanza el redirect hacia el callbackUrl", async () => {
    await expect(
      ingresarAction("/funciones/fun_1", SIN_ENVIAR, formulario(credenciales)),
    ).rejects.toThrow("NEXT_REDIRECT signIn");

    expect(iniciarSesion).toHaveBeenCalledWith("credentials", {
      ...credenciales,
      redirectTo: "/funciones/fun_1",
    });
  });

  it("con credenciales incorrectas avisa arriba, conserva el email y no devuelve la contraseña", async () => {
    iniciarSesion.mockRejectedValue(new AuthError("CredentialsSignin"));

    const estado = await ingresarAction("/funciones/fun_1", SIN_ENVIAR, formulario(credenciales));

    expect(estado).toEqual({
      ok: false,
      mensaje: "El email o la contraseña no son correctos.",
      valores: { email: "ana@ejemplo.com" },
    });
    expect(estado.errores).toBeUndefined();
    expect(JSON.stringify(estado)).not.toContain("una-clave-larga");
  });

  it("otro error de Auth.js da un mensaje genérico, también con el email", async () => {
    iniciarSesion.mockRejectedValue(new AuthError("CallbackRouteError"));

    const estado = await ingresarAction("/", SIN_ENVIAR, formulario(credenciales));

    expect(estado).toEqual({
      ok: false,
      mensaje: "No pudimos iniciar sesión. Probá de nuevo.",
      valores: { email: "ana@ejemplo.com" },
    });
  });

  it("no redirige afuera del sitio aunque el destino atado se cambie", async () => {
    await expect(
      ingresarAction("https://otro.com", SIN_ENVIAR, formulario(credenciales)),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(iniciarSesion.mock.calls[0]?.[1]).toMatchObject({ redirectTo: "/" });
  });

  it("re-lanza un error inesperado en vez de mostrar su mensaje", async () => {
    const inesperado = new Error("connection refused 10.0.0.3");
    iniciarSesion.mockRejectedValue(inesperado);

    await expect(ingresarAction("/", SIN_ENVIAR, formulario(credenciales))).rejects.toBe(
      inesperado,
    );
  });
});
