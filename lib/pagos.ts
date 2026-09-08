/**
 * Pasarela de pago simulada.
 *
 * El spec (sección 3) pide un pago que resuelve al instante: si se aprueba, la
 * Compra queda `PAGADA`; si se rechaza, no se persiste nada —no hay estado
 * "pendiente"—. Mientras no haya una pasarela real, este módulo es todo lo que
 * hay: cobra en memoria y devuelve el resultado.
 *
 * El rechazo no es aleatorio por defecto (`PAGO_MOCK_TASA_RECHAZO=0`): un
 * endpoint que a veces falla sin motivo es imposible de probar. Para ver el
 * camino del pago rechazado se sube esa variable en `.env.local`.
 */

const PRECIO_POR_DEFECTO = 5000;

/**
 * Precio único y fijo de la entrada, en pesos (spec, sección 3).
 *
 * Se valida al cargar el módulo y revienta si el valor configurado no sirve.
 * Es a propósito: un precio en 0 haría que `cobrar` rechace todas las compras
 * con un mensaje sobre el monto, y uno que no es número las aprobaría cobrando
 * `NaN`. Las dos fallas se leen como "la tarjeta falló" y no como lo que son,
 * una variable de entorno mal puesta.
 */
function precioConfigurado() {
  const configurado = process.env.PRECIO_ENTRADA?.trim();
  if (!configurado) return PRECIO_POR_DEFECTO;

  const precio = Number(configurado);
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new Error(
      `PRECIO_ENTRADA tiene que ser un número mayor a 0, y llegó "${configurado}"`,
    );
  }

  return precio;
}

export const PRECIO_ENTRADA = precioConfigurado();

export type ResultadoDePago = { aprobado: true } | { aprobado: false; motivo: string };

/** Proporción de pagos que la simulación rechaza: 0 (ninguno) a 1 (todos). */
function tasaDeRechazo() {
  const valor = Number(process.env.PAGO_MOCK_TASA_RECHAZO ?? 0);
  if (!Number.isFinite(valor)) return 0;
  return Math.min(Math.max(valor, 0), 1);
}

/**
 * Cobra un monto. Es `async` porque una pasarela real lo sería: así el día que
 * se reemplace por una de verdad, quien la llama no cambia.
 */
export async function cobrar(monto: number): Promise<ResultadoDePago> {
  if (monto <= 0) {
    return { aprobado: false, motivo: "El monto a cobrar tiene que ser mayor a 0" };
  }

  if (Math.random() < tasaDeRechazo()) {
    return { aprobado: false, motivo: "El pago fue rechazado por la entidad emisora" };
  }

  return { aprobado: true };
}
