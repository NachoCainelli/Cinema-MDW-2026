/**
 * Schemas de validación de la entidad Película.
 */
import { z } from "zod";

export const clasificacionSchema = z.enum(["ATP", "MAS_13", "MAS_16", "MAS_18"]);
export type Clasificacion = z.infer<typeof clasificacionSchema>;

export const categoriaSchema = z.enum([
  "ACCION",
  "COMEDIA",
  "DRAMA",
  "TERROR",
  "CIENCIA_FICCION",
  "ANIMACION",
  "DOCUMENTAL",
  "ROMANCE",
  "SUSPENSO",
]);
export type Categoria = z.infer<typeof categoriaSchema>;

export const crearPeliculaSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "El título no puede estar vacío")
    .max(200, "El título no puede superar los 200 caracteres"),
  sinopsis: z
    .string()
    .trim()
    .min(1, "La sinopsis no puede estar vacía")
    .max(1000, "La sinopsis no puede superar los 1000 caracteres"),
  duracionMinutos: z
    .number()
    .int("La duración tiene que ser un número entero de minutos")
    .min(1, "La duración tiene que ser mayor a 0")
    .max(600, "La duración no puede superar los 600 minutos"),
  clasificacion: clasificacionSchema,
  categoria: categoriaSchema,
});
export type CrearPeliculaInput = z.infer<typeof crearPeliculaSchema>;
