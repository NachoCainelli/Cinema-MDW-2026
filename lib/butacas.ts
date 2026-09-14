/**
 * Reglas puras de butacas (H4).
 *
 * La misma pregunta —¿estas butacas se pueden vender para esta función?— la
 * hacen la compra (para no vender dos veces) y el mapa de la sala (para pintar
 * cuáles están ocupadas). Acá se responde una sola vez, sin consultar la base
 * ni mirar el reloj: buscar las butacas y las entradas y convertir el veredicto
 * en un `ErrorDeConflicto` es trabajo de `lib/db/`.
 *
 * Esto no reemplaza al `@@unique([funcionId, butacaId])` de Entrada, que es lo
 * que de verdad corta la sobreventa: sirve para no cobrarle a quien va a
 * perder la carrera y para poder explicarle qué pasó.
 */

/** Veredicto sobre un pedido de butacas. Las dos listas vacías = se puede cobrar. */
export type VeredictoDeButacas = { fueraDeSala: string[]; ocupadas: string[] };

/**
 * Qué problemas tiene un pedido de butacas.
 *
 * Devuelve todos, no el primero: el veredicto completo sirve para decir
 * cuántas butacas se perdieron. Las dos listas conservan el orden del pedido.
 *
 * @param pedidas ids de las butacas que se quieren comprar.
 * @param deLaSala ids de las butacas que son de la sala de la función.
 * @param vendidas ids de las butacas que ya tienen una entrada para la función.
 */
export function veredictoDeButacas(
  pedidas: readonly string[],
  deLaSala: readonly string[],
  vendidas: readonly string[],
): VeredictoDeButacas {
  const sala = new Set(deLaSala);
  const yaVendidas = new Set(vendidas);

  return {
    fueraDeSala: pedidas.filter((id) => !sala.has(id)),
    ocupadas: pedidas.filter((id) => yaVendidas.has(id)),
  };
}

/**
 * Si la función ya empezó y por lo tanto no admite compras. Una función que
 * empieza exactamente `ahora` ya cuenta como empezada.
 */
export function funcionYaEmpezo(inicio: Date, ahora: Date) {
  return inicio.getTime() <= ahora.getTime();
}
