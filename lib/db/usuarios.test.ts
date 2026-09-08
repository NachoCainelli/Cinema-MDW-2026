import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { ErrorDeConflicto } from "@/lib/errores";

const { crear, buscar } = vi.hoisted(() => ({ crear: vi.fn(), buscar: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  prisma: { usuario: { create: crear, findUnique: buscar } },
}));

const { buscarUsuarioPorEmail, registrarUsuario } = await import("./usuarios");

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
function argumentoDe(mock: typeof crear | typeof buscar) {
  const llamada = mock.mock.calls[0];
  if (!llamada) throw new Error("se esperaba una llamada a Prisma y no hubo ninguna");
  return llamada[0] as { data?: Record<string, unknown>; select: Record<string, unknown> };
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
