import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto } from "@/lib/errores";
import { SIN_ENVIAR } from "@/lib/formularios";

vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }));
// El paquete real no carga fuera de Next (igual que en lib/auth.test.ts).
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/lib/db/usuarios", () => ({ registrarUsuario: vi.fn() }));
vi.mock("next/navigation", () => ({
  // Como el de verdad, `redirect` lanza: lo que esté después no corre.
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT ${destino}`);
  }),
}));

const { AuthError } = await import("next-auth");
const { signIn } = await import("@/lib/auth");
const { registrarUsuario } = await import("@/lib/db/usuarios");
const { registrarseAction } = await import("./acciones");

const iniciarSesion = vi.mocked(signIn);
const registrar = vi.mocked(registrarUsuario);

const valoresValidos = { nombre: "Ana Pérez", email: "ana@ejemplo.com", password: "una-clave-larga" };

function formulario(valores: Record<string, string>) {
  const datos = new FormData();
  for (const [campo, valor] of Object.entries(valores)) datos.set(campo, valor);
  return datos;
}

beforeEach(() => {
  vi.clearAllMocks();
  registrar.mockResolvedValue({ id: "usr_1" } as never);
  // Como el de verdad: con `redirectTo`, `signIn` redirige lanzando.
  iniciarSesion.mockImplementation(async () => {
    throw new Error("NEXT_REDIRECT signIn");
  });
});

describe("registrarseAction", () => {
  it("crea la cuenta e inicia sesión volviendo al callbackUrl", async () => {
    await expect(
      registrarseAction("/funciones/fun_1", SIN_ENVIAR, formulario(valoresValidos)),
    ).rejects.toThrow("NEXT_REDIRECT signIn");

    expect(registrar).toHaveBeenCalledWith(valoresValidos);
    expect(iniciarSesion).toHaveBeenCalledWith("credentials", {
      email: "ana@ejemplo.com",
      password: "una-clave-larga",
      redirectTo: "/funciones/fun_1",
    });
  });

  it("aunque el formulario traiga rol, no llega a registrarUsuario", async () => {
    await expect(
      registrarseAction("/", SIN_ENVIAR, formulario({ ...valoresValidos, rol: "ADMINISTRADOR" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    // `registrarUsuario` crea siempre `USUARIO` (lib/db/usuarios.test.ts);
    // acá se comprueba que el `rol` del formulario ni siquiera le llega.
    expect(registrar.mock.calls[0]?.[0]).not.toHaveProperty("rol");
  });

  it("no redirige afuera del sitio aunque el destino atado se cambie", async () => {
    await expect(
      registrarseAction("https://otro.com", SIN_ENVIAR, formulario(valoresValidos)),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(iniciarSesion.mock.calls[0]?.[1]).toMatchObject({ redirectTo: "/" });
  });

  it("el email repetido va arriba, con un link para ingresar y sin vaciar el formulario", async () => {
    registrar.mockRejectedValue(new ErrorDeConflicto("Ya existe una cuenta registrada con ese email"));

    const estado = await registrarseAction(
      "/funciones/fun_1",
      SIN_ENVIAR,
      formulario(valoresValidos),
    );

    expect(estado).toEqual({
      ok: false,
      mensaje: "Ya existe una cuenta registrada con ese email",
      enlace: {
        href: "/ingresar?callbackUrl=%2Ffunciones%2Ffun_1",
        texto: "Ingresar con ese email",
      },
      valores: { nombre: "Ana Pérez", email: "ana@ejemplo.com" },
    });
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  it("los campos inválidos van debajo de cada uno, sin devolver la contraseña", async () => {
    const estado = await registrarseAction(
      "/",
      SIN_ENVIAR,
      formulario({ nombre: "A", email: "no-es-email", password: "corta" }),
    );

    expect(estado.errores).toEqual({
      nombre: ["El nombre necesita al menos 2 caracteres"],
      email: ["El email no es válido"],
      password: ["La contraseña necesita al menos 8 caracteres"],
    });
    expect(estado.mensaje).toBeUndefined();
    expect(estado.valores).toEqual({ nombre: "A", email: "no-es-email" });
    expect(registrar).not.toHaveBeenCalled();
  });

  it("si el login automático falla, manda a ingresar a mano con la misma vuelta", async () => {
    iniciarSesion.mockRejectedValue(new AuthError("CredentialsSignin"));

    await expect(
      registrarseAction("/funciones/fun_1", SIN_ENVIAR, formulario(valoresValidos)),
    ).rejects.toThrow("NEXT_REDIRECT /ingresar?callbackUrl=%2Ffunciones%2Ffun_1");
  });

  it("re-lanza un error inesperado en vez de mostrar su mensaje", async () => {
    const inesperado = new Error("connection refused 10.0.0.3");
    registrar.mockRejectedValue(inesperado);

    await expect(registrarseAction("/", SIN_ENVIAR, formulario(valoresValidos))).rejects.toBe(
      inesperado,
    );
  });
});
