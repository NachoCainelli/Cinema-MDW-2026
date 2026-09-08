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

/** Precio único y fijo de la entrada, en pesos (spec, sección 3). */
export const PRECIO_ENTRADA = Number(process.env.PRECIO_ENTRADA ?? 5000);

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
