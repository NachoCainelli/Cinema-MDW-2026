import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorNoAutenticado, ErrorNoAutorizado } from "@/lib/errores";

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));
vi.mock("next/headers", () => ({ headers: headersMock }));

vi.mock("@/lib/db/usuarios", () => ({ buscarUsuarioPorEmail: vi.fn() }));

const { buscarUsuarioPorEmail } = await import("@/lib/db/usuarios");
const { obtenerUsuario, requerirUsuario } = await import("./auth");

const buscarUsuario = vi.mocked(buscarUsuarioPorEmail);

const gestor = {
  id: "usr_1",
  email: "gestor@cine.test",
  nombre: "Gestor de prueba",
  rol: "GESTOR_CARTELERA",
} as const;

function conHeader(valor: string | null) {
  headersMock.mockResolvedValue({ get: () => valor });
}

beforeEach(() => {
  vi.stubEnv("AUTH_STUB_HABILITADO", "true");
  vi.stubEnv("AUTH_STUB_EMAIL", "");
  conHeader(null);
  buscarUsuario.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("obtenerUsuario", () => {
  it("devuelve el usuario de la base cuando llega el header de prueba", async () => {
    conHeader(gestor.email);
    buscarUsuario.mockResolvedValue({ ...gestor });

    await expect(obtenerUsuario()).resolves.toEqual(gestor);
    expect(buscarUsuario).toHaveBeenCalledWith(gestor.email);
  });

  it("usa AUTH_STUB_EMAIL cuando no viene el header", async () => {
    vi.stubEnv("AUTH_STUB_EMAIL", gestor.email);
    buscarUsuario.mockResolvedValue({ ...gestor });

    await expect(obtenerUsuario()).resolves.toEqual(gestor);
  });

  it("devuelve null si el email del header no existe en la base", async () => {
    conHeader("nadie@cine.test");

    await expect(obtenerUsuario()).resolves.toBeNull();
  });

  it("devuelve null si el stub no está habilitado, aunque venga el header", async () => {
    vi.stubEnv("AUTH_STUB_HABILITADO", "");
    conHeader(gestor.email);
    buscarUsuario.mockResolvedValue({ ...gestor });

    await expect(obtenerUsuario()).resolves.toBeNull();
    expect(buscarUsuario).not.toHaveBeenCalled();
  });

  it("no consulta la base en producción ni con el stub habilitado", async () => {
    vi.stubEnv("NODE_ENV", "production");
    conHeader(gestor.email);
    buscarUsuario.mockResolvedValue({ ...gestor });

    await expect(obtenerUsuario()).resolves.toBeNull();
    expect(buscarUsuario).not.toHaveBeenCalled();
  });
});

describe("requerirUsuario", () => {
  it("lanza ErrorNoAutenticado (401) si no hay sesión", async () => {
    await expect(requerirUsuario()).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("devuelve el usuario cuando no se pide ningún rol", async () => {
    conHeader(gestor.email);
    buscarUsuario.mockResolvedValue({ ...gestor });

    await expect(requerirUsuario()).resolves.toEqual(gestor);
  });

  it("acepta los tres roles del enum de Prisma", async () => {
    for (const rol of ["ADMINISTRADOR", "GESTOR_CARTELERA", "USUARIO"] as const) {
      conHeader("alguien@cine.test");
      buscarUsuario.mockResolvedValue({ ...gestor, rol });

      await expect(requerirUsuario(rol)).resolves.toMatchObject({ rol });
    }
  });

  it("lanza ErrorNoAutorizado (403) si el rol no coincide", async () => {
    conHeader(gestor.email);
    buscarUsuario.mockResolvedValue({ ...gestor });

    await expect(requerirUsuario("ADMINISTRADOR")).rejects.toBeInstanceOf(ErrorNoAutorizado);
  });
});
