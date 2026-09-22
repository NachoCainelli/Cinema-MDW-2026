import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { ErrorDeConflicto } from "@/lib/errores";

const { crear, buscar, upsert } = vi.hoisted(() => ({
  crear: vi.fn(),
  buscar: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({
  prisma: { usuario: { create: crear, findUnique: buscar, upsert } },
}));

const { hashearPassword } = await import("@/lib/password");
const {
  buscarUsuarioPorEmail,
  obtenerOCrearUsuarioDeGoogle,
  registrarUsuario,
  verificarCredenciales,
} = await import("./usuarios");

const datos = {
  email: "persona@mail.com",
  nombre: "Ana",
  password: "unaClaveLarga",
};

const usuarioCreado = {
  id: "usr_1",
  email: datos.email,
  nombre: datos.nombre,
  rol: "USUARIO" as const,
};

/** El argumento con el que se llamó a un mock de Prisma, o un error si no se llamó. */
function argumentoDe(mock: typeof crear | typeof buscar | typeof upsert) {
  const llamada = mock.mock.calls[0];
  if (!llamada) throw new Error("se esperaba una llamada a Prisma y no hubo ninguna");
  return llamada[0] as {
    data?: Record<string, unknown>;
    create?: Record<string, unknown>;
    update?: Record<string, unknown>;
    select: Record<string, unknown>;
  };
}

function errorDePrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falló", { code, clientVersion: "6" });
}

beforeEach(() => {
  vi.clearAllMocks();
  crear.mockResolvedValue(usuarioCreado);
});

describe("registrarUsuario", () => {
  it("crea la cuenta y devuelve solo los campos públicos", async () => {
    await expect(registrarUsuario(datos)).resolves.toEqual(usuarioCreado);
  });

  it("guarda la contraseña hasheada, nunca en texto plano", async () => {
    await registrarUsuario(datos);

    const passwordHash = argumentoDe(crear).data?.passwordHash;
    expect(passwordHash).not.toBe(datos.password);
    expect(passwordHash).not.toContain(datos.password);
    expect(passwordHash).toMatch(/^\$2[aby]\$/); // formato de bcrypt
  });

  it("fija el rol en USUARIO: nadie se autoregistra como staff", async () => {
    await registrarUsuario({ ...datos, rol: "ADMINISTRADOR" } as never);

    expect(argumentoDe(crear).data?.rol).toBe("USUARIO");
  });

  it("pide un select explícito para que no se escape el passwordHash", async () => {
    await registrarUsuario(datos);

    expect(argumentoDe(crear).select).not.toHaveProperty("passwordHash");
    expect(argumentoDe(crear).select).toMatchObject({ id: true, email: true });
  });

  it("traduce el email duplicado a ErrorDeConflicto (409)", async () => {
    crear.mockRejectedValue(errorDePrisma("P2002"));

    await expect(registrarUsuario(datos)).rejects.toBeInstanceOf(ErrorDeConflicto);
  });

  it("deja pasar cualquier otro error de la base para que termine en 500", async () => {
    crear.mockRejectedValue(errorDePrisma("P1001"));

    await expect(registrarUsuario(datos)).rejects.not.toBeInstanceOf(ErrorDeConflicto);
  });
});

describe("buscarUsuarioPorEmail", () => {
  it("consulta por email sin traer el passwordHash", async () => {
    buscar.mockResolvedValue(usuarioCreado);

    await expect(buscarUsuarioPorEmail(datos.email)).resolves.toEqual(usuarioCreado);
    expect(argumentoDe(buscar).select).not.toHaveProperty("passwordHash");
  });
});

describe("verificarCredenciales", () => {
  it("devuelve el usuario, sin el hash, si la contraseña coincide", async () => {
    buscar.mockResolvedValue({ ...usuarioCreado, passwordHash: await hashearPassword(datos.password) });

    const usuario = await verificarCredenciales({ email: datos.email, password: datos.password });

    expect(usuario).toEqual(usuarioCreado);
    expect(usuario).not.toHaveProperty("passwordHash");
  });

  it("devuelve null si la contraseña no coincide", async () => {
    buscar.mockResolvedValue({ ...usuarioCreado, passwordHash: await hashearPassword(datos.password) });

    await expect(
      verificarCredenciales({ email: datos.email, password: "otraClave" }),
    ).resolves.toBeNull();
  });

  it("devuelve null si el email no existe", async () => {
    buscar.mockResolvedValue(null);

    await expect(
      verificarCredenciales({ email: "nadie@mail.com", password: datos.password }),
    ).resolves.toBeNull();
  });

  it("devuelve null si la cuenta se creó con Google y no tiene contraseña", async () => {
    buscar.mockResolvedValue({ ...usuarioCreado, passwordHash: null });

    await expect(
      verificarCredenciales({ email: datos.email, password: datos.password }),
    ).resolves.toBeNull();
  });
});

describe("obtenerOCrearUsuarioDeGoogle", () => {
  it("no pisa nada de una cuenta que ya existe: update vacío", async () => {
    upsert.mockResolvedValue(usuarioCreado);

    await obtenerOCrearUsuarioDeGoogle({ email: datos.email, nombre: datos.nombre });

    expect(argumentoDe(upsert).update).toEqual({});
  });

  it("crea la cuenta nueva como USUARIO y sin contraseña", async () => {
    upsert.mockResolvedValue(usuarioCreado);

    await obtenerOCrearUsuarioDeGoogle({ email: datos.email, nombre: datos.nombre });

    expect(argumentoDe(upsert).create).toEqual({
      email: datos.email,
      nombre: datos.nombre,
      rol: "USUARIO",
    });
    expect(argumentoDe(upsert).select).not.toHaveProperty("passwordHash");
  });
});
