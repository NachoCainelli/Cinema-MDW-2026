/**
 * Schemas de validación de la entidad Usuario.
 *
 * El rol define qué puede hacer cada usuario (docs/spec.md, sección 2). Solo
 * el rol "USUARIO" se autoregistra: las cuentas de administrador y gestor de
 * cartelera las crea un administrador (regla de negocio, sección 6).
 */
import { z } from "zod";

export const rolSchema = z.enum(["ADMINISTRADOR", "GESTOR_CARTELERA", "USUARIO"]);
export type Rol = z.infer<typeof rolSchema>;

const emailSchema = z.string().trim().toLowerCase().email("El email no es válido");
const nombreSchema = z
  .string()
  .trim()
  .min(2, "El nombre necesita al menos 2 caracteres")
  .max(80, "El nombre no puede superar los 80 caracteres");

export const registrarUsuarioSchema = z.object({
  email: emailSchema,
  nombre: nombreSchema,
  password: z
    .string()
    .min(8, "La contraseña necesita al menos 8 caracteres")
    .max(72, "La contraseña no puede superar los 72 caracteres"),
});
export type RegistrarUsuarioInput = z.infer<typeof registrarUsuarioSchema>;

// Un administrador crea la cuenta de otro administrador o de un gestor de
// cartelera. No hay autoregistro para estos dos roles (sección 6 del spec).
export const crearCuentaStaffSchema = z.object({
  email: emailSchema,
  nombre: nombreSchema,
  rol: z.enum(["ADMINISTRADOR", "GESTOR_CARTELERA"]),
});
export type CrearCuentaStaffInput = z.infer<typeof crearCuentaStaffSchema>;
