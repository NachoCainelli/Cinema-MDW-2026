import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorDeConflicto } from "@/lib/errores";

vi.mock("@/lib/db/usuarios", () => ({ registrarUsuario: vi.fn() }));

const { registrarUsuario } = await import("@/lib/db/usuarios");
const { POST } = await import("./route");

const registrar = vi.mocked(registrarUsuario);

const usuarioCreado = {
  id: "usr_1",
  email: "persona@mail.com",
  nombre: "Ana",
  rol: "USUARIO" as const,
};

function request(body: unknown) {
  return new Request("http://localhost/api/usuarios", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  registrar.mockResolvedValue(usuarioCreado);
});

describe("POST /api/usuarios", () => {
  it("responde 201 con el usuario creado", async () => {
    const respuesta = await POST(
      request({ email: "persona@mail.com", nombre: "Ana", password: "unaClaveLarga" }),
    );

    expect(respuesta.status).toBe(201);
    await expect(respuesta.json()).resolves.toEqual(usuarioCreado);
  });

  it("nunca devuelve la contraseña ni su hash", async () => {
    const respuesta = await POST(
      request({ email: "persona@mail.com", nombre: "Ana", password: "unaClaveLarga" }),
    );
    const cuerpo = JSON.stringify(await respuesta.json());

    expect(cuerpo).not.toContain("unaClaveLarga");
    expect(cuerpo).not.toContain("passwordHash");
  });

  it("ignora el rol que venga en el body: no delega nada que no valide el schema", async () => {
    await POST(
      request({
        email: "persona@mail.com",
        nombre: "Ana",
        password: "unaClaveLarga",
        rol: "ADMINISTRADOR",
      }),
    );

    expect(registrar).toHaveBeenCalledWith({
      email: "persona@mail.com",
      nombre: "Ana",
      password: "unaClaveLarga",
    });
  });

  it("responde 400 si la contraseña tiene menos de 8 caracteres", async () => {
    const respuesta = await POST(
      request({ email: "persona@mail.com", nombre: "Ana", password: "corta" }),
    );

    expect(respuesta.status).toBe(400);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("responde 400 si el body no es JSON válido", async () => {
    const respuesta = await POST(request("{"));

    expect(respuesta.status).toBe(400);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("responde 409 si el email ya está registrado", async () => {
    registrar.mockRejectedValue(new ErrorDeConflicto("Ya existe una cuenta registrada con ese email"));

    const respuesta = await POST(
      request({ email: "persona@mail.com", nombre: "Ana", password: "unaClaveLarga" }),
    );

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: "Ya existe una cuenta registrada con ese email",
    });
  });
});
