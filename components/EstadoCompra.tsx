/**
 * El estado de una compra, dicho con una palabra adentro de un `Badge`.
 *
 * El estado nunca se comunica solo con color (docs/spec.md §7): el texto es
 * lo que se lee, el color acompaña. La tabla de etiquetas es un `Record` sobre
 * el enum de Prisma, así que agregar un estado al enum sin darle su palabra
 * acá rompe el typecheck en vez de mostrar un badge vacío.
 *
 * Del enum se importa solo el tipo (se borra al compilar): el cliente de
 * Prisma sigue entrando únicamente por `lib/db/client.ts`.
 */
import type { EstadoCompra as EstadoDeCompra } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const ETIQUETA_DE_ESTADO: Record<EstadoDeCompra, string> = {
  PAGADA: "Pagada",
};

/** Todos los estados posibles, derivados de la misma tabla (para `/sistema`). */
export const ESTADOS_DE_COMPRA = Object.keys(ETIQUETA_DE_ESTADO) as EstadoDeCompra[];

export default function EstadoCompra({ estado }: { estado: EstadoDeCompra }) {
  return <Badge>{ETIQUETA_DE_ESTADO[estado]}</Badge>;
}
