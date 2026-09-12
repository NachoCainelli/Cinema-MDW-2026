/**
 * Reglas puras de cartelera (H3).
 *
 * La regla que manda acá es la de solapamiento (sección 6 del spec): dos
 * funciones de la misma sala tienen que estar separadas por al menos 15
 * minutos entre el fin de una y el inicio de la siguiente.
 *
 * Todo lo de este módulo es puro: recibe datos y devuelve un veredicto, sin
 * consultar la base ni mirar el reloj. Buscar las funciones ya programadas y
 * convertir el veredicto en un `ErrorDeConflicto` es trabajo de
 * `lib/db/funciones.ts`.
 */

/** Margen mínimo entre el fin de una función y el inicio de la siguiente. */
export const MARGEN_ENTRE_FUNCIONES_MINUTOS = 15;

const UN_MINUTO_EN_MS = 60 * 1000;

/** Una función vista solo como el rato que ocupa la sala. */
export type Franja = { inicio: Date; duracionMinutos: number };

/** Una función ya programada en la sala, con lo necesario para explicar un conflicto. */
export type FuncionProgramada = Franja & { id: string; titulo: string };

/** Momento en que la sala vuelve a quedar libre: fin de la película + margen. */
export function finConMargen({ inicio, duracionMinutos }: Franja) {
  return inicio.getTime() + (duracionMinutos + MARGEN_ENTRE_FUNCIONES_MINUTOS) * UN_MINUTO_EN_MS;
}

/**
 * Si dos funciones de la misma sala se pisan, contando el margen.
 *
 * Cada función ocupa la sala desde su inicio hasta su fin más 15 minutos; hay
 * conflicto cuando esos dos tramos se tocan. Los bordes quedan así:
 * exactamente 15 minutos de separación está bien (el fin con margen coincide
 * con el inicio siguiente y `>` no lo cuenta), 14 minutos no, y una función
 * que arranca justo cuando termina la anterior tampoco.
 */
export function seSolapan(a: Franja, b: Franja) {
  return finConMargen(a) > b.inicio.getTime() && finConMargen(b) > a.inicio.getTime();
}

/**
 * Funciones ya programadas en la sala que se pisan con la `nueva`.
 *
 * Devuelve todas, no la primera: el veredicto completo sirve para explicar el
 * conflicto. Vacío = se puede publicar. Conserva el orden en que llegan.
 */
export function funcionesEnConflicto(
  nueva: Franja,
  programadas: readonly FuncionProgramada[],
): FuncionProgramada[] {
  return programadas.filter((funcion) => seSolapan(nueva, funcion));
}
