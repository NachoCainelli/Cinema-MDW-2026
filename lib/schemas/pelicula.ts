/**
 * Schemas de validación de la entidad Película.
 */
import { z } from "zod";

/**
 * Techo de duración de una película. Lo usa también lib/db/funciones.ts para
 * acotar la ventana de funciones que puede llegar a solaparse con una nueva:
 * ninguna función arrancada más de este rato antes puede seguir en curso.
 */
export const DURACION_MAXIMA_MINUTOS = 600;

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
    .max(DURACION_MAXIMA_MINUTOS, `La duración no puede superar los ${DURACION_MAXIMA_MINUTOS} minutos`),
  clasificacion: clasificacionSchema,
  categoria: categoriaSchema,
  // URL pública del póster en el bucket de Supabase Storage. Opcional: no hay
  // todavía un flujo de carga de imágenes, así que la película se puede crear
  // sin ella y completarla después.
  imagenUrl: z.string().trim().url("La imagen tiene que ser una URL válida").optional(),
});
export type CrearPeliculaInput = z.infer<typeof crearPeliculaSchema>;
/**
 * Schema del PATCH (`PATCH /api/peliculas/:id`). Es el de creación en versión
 * parcial: el endpoint modifica los campos que le mandan, no reemplaza el
 * recurso entero, así que las reglas de cada campo son exactamente las mismas
 * y no se duplican acá.
 *
 * El `refine` rechaza el body vacío. No es por prolijidad: Zod descarta las
 * claves que no conoce, así que un `{ "titulo2": "..." }` —un campo mal
 * escrito— llegaría como `{}` y el PATCH respondería 200 sin haber cambiado
 * nada. Mejor un 400 que diga que no se envió ningún campo.
 */
export const actualizarPeliculaSchema = crearPeliculaSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Hay que enviar al menos un campo para modificar",
  });
export type ActualizarPeliculaInput = z.infer<typeof actualizarPeliculaSchema>;

/**
 * Query string del listado de películas (`GET /api/peliculas`). Mismo criterio
 * que el listado de salas: el límite llega como texto y siempre hay un tope.
 */
export const peliculasQuerySchema = z.object({
  limite: z.coerce
    .number()
    .int("El límite tiene que ser un número entero")
    .min(1, "El límite tiene que ser mayor a 0")
    .max(100, "El límite no puede superar los 100 resultados")
    .default(50),
});
export type PeliculasQuery = z.infer<typeof peliculasQuerySchema>;

/** Id de película que llega por la ruta (`/api/peliculas/:id`). */
export const peliculaIdSchema = z.string().min(1, "Falta el id de la película");
