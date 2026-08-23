/**
 * Schemas de validación de la entidad Compra.
 *
 * Una Compra agrupa una o más Entradas (una por butaca) para una misma
 * Función — ver H3 en docs/spec.md. Que ninguna butaca esté ya vendida no
 * se puede validar acá: es una condición que depende del estado actual de
 * la base y se resuelve de forma atómica en lib/db/ al confirmar la compra.
 */
import { z } from "zod";

export const estadoCompraSchema = z.enum(["PENDIENTE", "PAGADA", "RECHAZADA"]);
export type EstadoCompra = z.infer<typeof estadoCompraSchema>;

export const crearCompraSchema = z.object({
  funcionId: z.string().min(1, "Falta la función"),
  butacaIds: z
    .array(z.string().min(1))
    .min(1, "Tenés que seleccionar al menos una butaca")
    .max(10, "No se pueden comprar más de 10 butacas en una sola compra")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "No se puede seleccionar la misma butaca dos veces",
    ),
});
export type CrearCompraInput = z.infer<typeof crearCompraSchema>;
