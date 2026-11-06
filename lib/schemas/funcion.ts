/**
 * Schema de validación de la entidad Función.
 *
 * Una función es la proyección de una Película en una Sala, en un horario
 * (ver H3 en docs/spec.md). La regla de superposición de horarios —incluido
 * el margen de 15 minutos con otras funciones de la misma sala— no se puede
 * validar acá: necesita consultar las demás funciones ya guardadas, así que
 * se resuelve en la capa de datos (lib/db/), no en el schema.
 */
import { z } from "zod";

export const crearFuncionSchema = z.object({
  peliculaId: z.string().min(1, "Falta la película"),
  salaId: z.string().min(1, "Falta la sala"),

  // z.coerce.date() convierte el string que llega del formulario/JSON en un
  // Date real. El refine se evalúa en cada validación (no al arrancar el
  // servidor), así que compara siempre contra el momento actual.
  inicio: z.coerce
    .date({ error: "Falta la fecha y hora de inicio" })
    .refine((fecha) => fecha.getTime() > Date.now(), "La función no puede empezar en el pasado"),
});
export type CrearFuncionInput = z.infer<typeof crearFuncionSchema>;

/** Largo máximo del texto de búsqueda de la cartelera: alcanza para cualquier título. */
export const LARGO_MAXIMO_BUSQUEDA = 100;

/**
 * Query string de la cartelera pública (`GET /api/funciones` y la página
 * `/cartelera`). Todo lo que viene en la URL es texto, por eso los `coerce`.
 *
 * - `q`: parte del título de la película. Un texto vacío o solo con espacios
 *   es lo mismo que no buscar nada (queda `undefined`).
 * - `pagina`: de a `limite` funciones. Tiene techo para que un número absurdo
 *   en la URL se rechace con un 400 en vez de llegar como `skip` a la base.
 */
export const carteleraQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(LARGO_MAXIMO_BUSQUEDA, `La búsqueda no puede superar los ${LARGO_MAXIMO_BUSQUEDA} caracteres`)
    .optional()
    .transform((texto) => texto || undefined),
  pagina: z.coerce
    .number()
    .int("La página tiene que ser un número entero")
    .min(1, "La página tiene que ser 1 o mayor")
    .max(1000, "La página no puede superar la 1000")
    .default(1),
  limite: z.coerce
    .number()
    .int("El límite tiene que ser un número entero")
    .min(1, "El límite tiene que ser mayor a 0")
    .max(100, "El límite no puede superar los 100 resultados")
    .default(50),
});
export type CarteleraQuery = z.infer<typeof carteleraQuerySchema>;

/** Id de función que llega por la ruta (`/api/funciones/:id/butacas`). */
export const funcionIdSchema = z.string().min(1, "Falta el id de la función");
