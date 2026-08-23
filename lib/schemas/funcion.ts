/**
 * Schema de validación de la entidad Función.
 *
 * Una función es la proyección de una Película en una Sala, en un horario
 * (ver H2 en docs/spec.md). La regla de superposición de horarios —incluido
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
    .date()
    .refine((fecha) => fecha.getTime() > Date.now(), "La función no puede empezar en el pasado"),
});
export type CrearFuncionInput = z.infer<typeof crearFuncionSchema>;
