import { describe, expect, it } from "vitest";
import { crearCuentaStaffSchema, registrarUsuarioSchema } from "./usuario";

describe("registrarUsuarioSchema", () => {
  it("acepta un registro válido", () => {
    const resultado = registrarUsuarioSchema.safeParse({
      email: "persona@mail.com",
      nombre: "Ana",
      password: "12345678",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un email inválido", () => {
    const resultado = registrarUsuarioSchema.safeParse({
      email: "no-es-un-email",
      nombre: "Ana",
      password: "12345678",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza una contraseña demasiado corta", () => {
    const resultado = registrarUsuarioSchema.safeParse({
      email: "persona@mail.com",
      nombre: "Ana",
      password: "1234567",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un nombre que es solo espacios", () => {
    // Caso borde: sin el .trim() del schema, "   " pasaría la validación de mínimo.
    const resultado = registrarUsuarioSchema.safeParse({
      email: "persona@mail.com",
      nombre: "   ",
      password: "12345678",
    });

    expect(resultado.success).toBe(false);
  });
});

describe("crearCuentaStaffSchema", () => {
  it("acepta crear un gestor de cartelera", () => {
    const resultado = crearCuentaStaffSchema.safeParse({
      email: "gestor@cine.com",
      nombre: "Gestor",
      rol: "GESTOR_CARTELERA",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza el rol USUARIO: esa cuenta se autoregistra, no la crea un administrador", () => {
    const resultado = crearCuentaStaffSchema.safeParse({
      email: "persona@mail.com",
      nombre: "Persona",
      rol: "USUARIO",
    });

    expect(resultado.success).toBe(false);
  });
});
