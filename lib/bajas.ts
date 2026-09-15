/**
 * Regla pura compartida por H5 (eliminar sala) y H6 (sacar película de
 * cartelera): "¿hay funciones que todavía le importan a alguien que compró
 * una entrada?".
 *
 * Antes esta regla estaba escrita dos veces —en `lib/db/salas.ts` y en
 * `lib/db/peliculas.ts`— y en las dos terminaba en un booleano ("¿tiene
 * funciones futuras?") que no alcanzaba para decir cuáles. Acá vive una sola
 * vez, sin `import` de Prisma ni de Next: recibe los datos ya resueltos
 * (`funciones`) y el instante de referencia (`ahora`) por parámetro, así que
 * es trivial de testear y de llamar desde cualquier capa.
 *
 * "Impide la baja" cubre dos casos: la función que todavía no empezó
 * (futura) y la que está en curso —alguien está sentado en la sala mirándola
 * ahora mismo—. El fin de una función no es un dato que se guarde: sale de
 * sumarle su `duracionMinutos` a su `inicio`.
 */

export interface FuncionParaBaja {
  id: string;
  titulo: string;
  inicio: Date;
  duracionMinutos: number;
}

export const UN_MINUTO_EN_MS = 60 * 1000;

function finDeFuncion(funcion: FuncionParaBaja): Date {
  return new Date(funcion.inicio.getTime() + funcion.duracionMinutos * UN_MINUTO_EN_MS);
}

/**
 * Devuelve las funciones que impiden la baja: las que todavía no terminaron
 * a la altura de `ahora`, ya sea porque no empezaron o porque están en
 * curso. Array vacío significa que se puede dar de baja.
 */
export function funcionesQueImpidenBaja(
  funciones: FuncionParaBaja[],
  ahora: Date,
): FuncionParaBaja[] {
  return funciones.filter((funcion) => finDeFuncion(funcion) > ahora);
}

/** Cuántas funciones como máximo se listan por nombre en el mensaje de 409. */
const MAXIMO_FUNCIONES_EN_MENSAJE = 5;

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Arma el detalle de funciones para el mensaje de 409: hasta 5, con título y
 * horario, y siempre la cantidad total. Pura también, para no repetir este
 * formateo entre `lib/db/salas.ts` y `lib/db/peliculas.ts`.
 *
 * No decide si hay que lanzar el error —eso sigue siendo responsabilidad de
 * cada capa de datos, que es quien conoce el mensaje completo (con el nombre
 * de la sala o el título de la película)—, solo arma la enumeración.
 */
export function detalleDeFuncionesQueImpiden(funciones: FuncionParaBaja[]): string {
  const listadas = funciones
    .slice(0, MAXIMO_FUNCIONES_EN_MENSAJE)
    .map((funcion) => `"${funcion.titulo}" (${formatearFecha(funcion.inicio)})`)
    .join(", ");

  return `${listadas} (${funciones.length} en total)`;
}
