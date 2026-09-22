import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";

import { ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";

// NextAuth se reemplaza por un mock que guarda la configuración que recibe:
// así se prueban los callbacks y `authorize` sin levantar Auth.js ni Google.
const { authMock, configuracion } = vi.hoisted(() => ({
  authMock: vi.fn(),
  configuracion: { actual: undefined as unknown },
}));
vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    configuracion.actual = config;
    return { auth: authMock, handlers: {}, signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/google", () => ({ default: { id: "google" } }));
vi.mock("next-auth/providers/credentials", () => ({
  default: (opciones: object) => ({ id: "credentials", ...opciones }),
}));
vi.mock("@/lib/db/usuarios", () => ({
  obtenerOCrearUsuarioDeGoogle: vi.fn(),
  verificarCredenciales: vi.fn(),
}));

const { obtenerOCrearUsuarioDeGoogle, verificarCredenciales } = await import("@/lib/db/usuarios");
const { obtenerUsuario, requerirUsuario } = await import("./auth");

const crearDeGoogle = vi.mocked(obtenerOCrearUsuarioDeGoogle);
const verificar = vi.mocked(verificarCredenciales);

// Los callbacks tipados de Auth.js piden muchos campos que acá no importan;
// se llaman a través de este tipo mínimo.
type Config = {
  providers: { id: string; authorize?: (credenciales: unknown) => Promise<unknown> }[];
  callbacks: {
    signIn: (params: unknown) => boolean;
    jwt: (params: unknown) => Promise<Record<string, unknown>>;
    session: (params: unknown) => { user: Record<string, unknown> };
  };
};
const config = configuracion.actual as Pick<NextAuthConfig, "session"> & Config;

const gestor = {
  id: "usr_1",
  email: "gestor@cine.test",
  nombre: "Gestor de prueba",
  rol: "GESTOR_CARTELERA",
} as const;

function conSesion(user: Record<string, unknown> | null) {
  authMock.mockResolvedValue(user ? { user, expires: "" } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  conSesion(null);
});

describe("configuración", () => {
  it("usa JWT como estrategia de sesión (ADR 0004)", () => {
    expect(config.session?.strategy).toBe("jwt");
  });

  it("tiene los dos proveedores: Google y Credentials (ADR 0003)", () => {
    expect(config.providers.map((p) => p.id)).toEqual(["google", "credentials"]);
  });
});

describe("authorize (Credentials)", () => {
  const authorize = config.providers.find((p) => p.id === "credentials")!.authorize!;

  it("devuelve el usuario de la base si las credenciales coinciden", async () => {
    verificar.mockResolvedValue({ ...gestor });

    await expect(
      authorize({ email: "Gestor@Cine.test", password: "unaClaveLarga" }),
    ).resolves.toEqual({ id: gestor.id, email: gestor.email, name: gestor.nombre, rol: gestor.rol });
    expect(verificar).toHaveBeenCalledWith({ email: gestor.email, password: "unaClaveLarga" });
  });

  it("devuelve null si las credenciales no coinciden", async () => {
    verificar.mockResolvedValue(null);

    await expect(authorize({ email: gestor.email, password: "otra" })).resolves.toBeNull();
  });

  it("devuelve null sin consultar la base si el formato es inválido", async () => {
    await expect(authorize({ email: "no-es-un-email", password: "" })).resolves.toBeNull();
    expect(verificar).not.toHaveBeenCalled();
  });
});

describe("callback signIn", () => {
  it("rechaza una cuenta de Google con el email sin verificar", () => {
    expect(
      config.callbacks.signIn({ account: { provider: "google" }, profile: { email_verified: false } }),
    ).toBe(false);
  });

  it("acepta una cuenta de Google con el email verificado", () => {
    expect(
      config.callbacks.signIn({ account: { provider: "google" }, profile: { email_verified: true } }),
    ).toBe(true);
  });
});

describe("callback jwt", () => {
  it("con Google, guarda en el token el id y el rol de nuestra base, no los de Google", async () => {
    crearDeGoogle.mockResolvedValue({ ...gestor });

    const token = await config.callbacks.jwt({
      token: {},
      user: { email: "Gestor@Cine.test", name: "Nombre en Google" },
      account: { provider: "google" },
    });

    expect(crearDeGoogle).toHaveBeenCalledWith({ email: gestor.email, nombre: "Nombre en Google" });
    expect(token).toMatchObject({
      usuarioId: gestor.id,
      rol: gestor.rol,
      name: gestor.nombre,
      email: gestor.email,
    });
  });

  it("con Credentials, toma el id y el rol de lo que devolvió authorize", async () => {
    const token = await config.callbacks.jwt({
      token: {},
      user: { id: gestor.id, rol: gestor.rol },
      account: { provider: "credentials" },
    });

    expect(token).toMatchObject({ usuarioId: gestor.id, rol: gestor.rol });
    expect(crearDeGoogle).not.toHaveBeenCalled();
  });

  it("después del login devuelve el token tal cual, sin consultar la base", async () => {
    const token = { usuarioId: gestor.id, rol: gestor.rol };

    await expect(config.callbacks.jwt({ token })).resolves.toBe(token);
    expect(crearDeGoogle).not.toHaveBeenCalled();
  });
});

describe("callback session", () => {
  it("copia el id y el rol del token a la sesión", () => {
    const sesion = config.callbacks.session({
      session: { user: {} },
      token: { usuarioId: gestor.id, rol: gestor.rol },
    });

    expect(sesion.user).toMatchObject({ usuarioId: gestor.id, rol: gestor.rol });
  });

  it("no copia un rol que no existe", () => {
    const sesion = config.callbacks.session({
      session: { user: {} },
      token: { usuarioId: gestor.id, rol: "SUPERADMIN" },
    });

    expect(sesion.user).not.toHaveProperty("rol");
  });
});

describe("obtenerUsuario", () => {
  it("devuelve el usuario de la sesión", async () => {
    conSesion({ usuarioId: gestor.id, email: gestor.email, name: gestor.nombre, rol: gestor.rol });

    await expect(obtenerUsuario()).resolves.toEqual(gestor);
  });

  it("devuelve null si no hay sesión", async () => {
    await expect(obtenerUsuario()).resolves.toBeNull();
  });

  it("devuelve null si la sesión no trae id o rol", async () => {
    conSesion({ email: gestor.email, name: gestor.nombre });

    await expect(obtenerUsuario()).resolves.toBeNull();
  });
});

describe("requerirUsuario", () => {
  it("lanza ErrorNoAutenticado (401) si no hay sesión", async () => {
    await expect(requerirUsuario()).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("devuelve el usuario cuando no se pide ningún rol", async () => {
    conSesion({ usuarioId: gestor.id, email: gestor.email, name: gestor.nombre, rol: gestor.rol });

    await expect(requerirUsuario()).resolves.toEqual(gestor);
  });

  it("acepta los tres roles del enum de Prisma", async () => {
    for (const rol of ["ADMINISTRADOR", "GESTOR_CARTELERA", "USUARIO"] as const) {
      conSesion({ usuarioId: gestor.id, email: gestor.email, name: gestor.nombre, rol });

      await expect(requerirUsuario(rol)).resolves.toMatchObject({ rol });
    }
  });

  it("lanza ErrorNoAutorizado (403) si el rol no coincide", async () => {
    conSesion({ usuarioId: gestor.id, email: gestor.email, name: gestor.nombre, rol: gestor.rol });

    await expect(requerirUsuario("ADMINISTRADOR")).rejects.toBeInstanceOf(ErrorNoAutorizado);
  });
});
