/**
 * Schema de validación de la entidad Entrada.
 *
 * Una Entrada no se crea directamente: nace de una Compra, una por cada
 * butaca seleccionada (ver lib/schemas/compra.ts). Este schema valida el
 * identificador que se usa para buscar una entrada puntual, por ejemplo al
 * mostrarla en el historial de compras del usuario.
 */
import { z } from "zod";

export const buscarEntradaSchema = z.object({
  id: z.string().min(1, "Falta el id de la entrada"),
});
export type BuscarEntradaInput = z.infer<typeof buscarEntradaSchema>;
