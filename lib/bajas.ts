/**
 * Regla pura compartida por H5 (eliminar sala) y H6 (sacar pelicula de
 * cartelera): "¿hay funciones que todavia le importan a alguien que compro
 * una entrada?".
 *
 * Antes esta regla estaba escrita dos veces —en `lib/db/salas.ts` y en
 * `lib/db/peliculas.ts`— y en las dos terminaba en un booleano ("¿tiene
 * funciones futuras?") que no alcanzaba para decir cuales. Aca vive una sola
 * vez, sin `import` de Prisma ni de Next: recibe los datos ya resueltos
 * (`funciones`) y el instante de referencia (`ahora`) por parametro, asi que
 * es trivial de testear y de llamar desde cualquier capa.
 *
 * "Impide la baja" cubre dos casos: la funcion que todavia no empezo
 * (futura) y la que esta en curso —alguien esta sentado en la sala mirandola
 * ahora mismo—. El fin de una funcion no es un dato que se guarde: sale de
 * sumarle su `duracionMinutos` a su `inicio`.
 */

export interface FuncionParaBaja {
  id: string;
  titulo: string;
  inicio: Date;
  duracionMinutos: number;
}

export const UN_MINUTO_EN_MS = 60 * 1000;

/**
 * Tope de funciones que trae cada consulta de `lib/db/salas.ts` y
 * `lib/db/peliculas.ts` para armar el detalle del 409. Sin este limite, una
 * sala o pelicula con la cartelera cargada a meses vista materializaria
 * miles de filas en cada baja solo para imprimir 5 titulos. Mismo patron que
 * `MAXIMO_FUNCIONES_A_REVISAR` en `lib/db/funciones.ts`, para el mismo tipo
 * de problema (acotar una consulta que solo necesita las mas proximas).
 */
export const MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA = 100;

function finDeFuncion(funcion: FuncionParaBaja): Date {
  return new Date(funcion.inicio.getTime() + funcion.duracionMinutos * UN_MINUTO_EN_MS);
}

/**
 * Devuelve las funciones que impiden la baja: las que todavia no terminaron
 * a la altura de `ahora`, ya sea porque no empezaron o porque estan en
 * curso. Array vacio significa que se puede dar de baja.
 */
export function funcionesQueImpidenBaja(
  funciones: FuncionParaBaja[],
  ahora: Date,
): FuncionParaBaja[] {
  return funciones.filter((funcion) => finDeFuncion(funcion) > ahora);
}

/** Cuantas funciones como maximo se listan por nombre en el mensaje de 409. */
const MAXIMO_FUNCIONES_EN_MENSAJE = 5;

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Arma el detalle de funciones para el mensaje de 409: hasta 5, con titulo y
 * horario, y la cantidad total. Pura tambien, para no repetir este formateo
 * entre `lib/db/salas.ts` y `lib/db/peliculas.ts`.
 *
 * `huboMas` avisa que el llamador trunco la consulta a la base en
 * `MAXIMO_FUNCIONES_A_REVISAR_PARA_BAJA` y no puede asegurar el total exacto;
 * en ese caso el mensaje dice "mas de <n>" en vez de "<n>". Con lista vacia
 * devuelve un string vacio en vez de un mensaje roto: no decide si hay que
 * lanzar el error, eso sigue siendo responsabilidad de cada capa de datos.
 */
export function detalleDeFuncionesQueImpiden(
  funciones: FuncionParaBaja[],
  huboMas = false,
): string {
  if (funciones.length === 0) {
    return "";
  }

  const listadas = funciones
    .slice(0, MAXIMO_FUNCIONES_EN_MENSAJE)
    .map((funcion) => `"${funcion.titulo}" (${formatearFecha(funcion.inicio)})`)
    .join(", ");

  const total = huboMas ? `mas de ${funciones.length}` : `${funciones.length}`;

  return `${listadas} (${total} en total)`;
}
