/**
 * Schema de validación de la entidad Butaca.
 *
 * Las butacas no se crean a mano: se generan automáticamente al crear la
 * Sala, una por cada fila y columna (ver H1 y lib/schemas/sala.ts). Este
 * schema valida la posición de una butaca cuando hace falta identificarla
 * por fila y columna en lugar de por id.
 */
import { z } from "zod";

export const posicionButacaSchema = z.object({
  fila: z.number().int("La fila tiene que ser un número entero").min(1, "La fila tiene que ser mayor a 0"),
  columna: z
    .number()
    .int("La columna tiene que ser un número entero")
    .min(1, "La columna tiene que ser mayor a 0"),
});
export type PosicionButaca = z.infer<typeof posicionButacaSchema>;
