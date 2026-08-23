/**
 * Schema de validación de la entidad Sala.
 *
 * Al crear una sala se generan automáticamente todas sus butacas —una por
 * cada combinación de fila y columna—, ver H1 y lib/schemas/butaca.ts en
 * docs/spec.md.
 */
import { z } from "zod";

export const crearSalaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre de la sala no puede estar vacío")
    .max(60, "El nombre de la sala no puede superar los 60 caracteres"),
  filas: z
    .number()
    .int("Las filas tienen que ser un número entero")
    .min(1, "La sala necesita al menos 1 fila")
    .max(30, "La sala no puede tener más de 30 filas"),
  columnas: z
    .number()
    .int("Las columnas tienen que ser un número entero")
    .min(1, "La sala necesita al menos 1 columna")
    .max(30, "La sala no puede tener más de 30 columnas"),
});
export type CrearSalaInput = z.infer<typeof crearSalaSchema>;
