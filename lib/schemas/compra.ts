/**
 * Schemas de validación de la entidad Compra.
 *
 * Una Compra agrupa una o más Entradas (una por butaca) para una misma
 * Función — ver H4 en docs/spec.md. Que ninguna butaca esté ya vendida no
 * se puede validar acá: es una condición que depende del estado actual de
 * la base y se resuelve de forma atómica en lib/db/ al confirmar la compra.
 */
import { z } from "zod";

// Un solo estado posible, igual que el enum `EstadoCompra` de Prisma. No hay
// "pendiente" porque el pago (mock) resuelve al instante, y tampoco
// "rechazada": esa Compra no llega a persistirse (sección 3 del spec). Un
// estado que la base no puede guardar solo confunde a quien lee consultas —si
// existiera una Entrada de una Compra no PAGADA, la butaca quedaría invendible
// contra el `@@unique([funcionId, butacaId])` de Entrada.
export const estadoCompraSchema = z.enum(["PAGADA"]);
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

/**
 * Query string del historial (`GET /api/compras`). No lleva un `usuarioId`: de
 * quién son las compras lo decide la sesión, no la URL (ver H4 en docs/spec.md
 * y la regla de autorización de AGENTS.md).
 */
export const historialQuerySchema = z.object({
  limite: z.coerce
    .number()
    .int("El límite tiene que ser un número entero")
    .min(1, "El límite tiene que ser mayor a 0")
    .max(100, "El límite no puede superar los 100 resultados")
    .default(50),
});
export type HistorialQuery = z.infer<typeof historialQuerySchema>;
