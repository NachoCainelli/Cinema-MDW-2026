/**
 * Capa de datos de Compra (H4): compra de entradas e historial del usuario.
 *
 * La regla no negociable acá es que no haya sobreventa. No hay reserva
 * temporal: la disponibilidad se mira recién al confirmar, así que entre el
 * "está libre" y el "guardá la entrada" siempre hay una carrera posible. La
 * que la corta de verdad es la restricción `@@unique([funcionId, butacaId])`
 * de Entrada —una butaca no puede tener dos entradas para la misma función—;
 * las consultas previas están para no cobrarle a alguien que va a perder esa
 * carrera y para poder decirle qué butaca se le adelantó.
 */
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto, ErrorDePagoRechazado, ErrorNoEncontrado } from "@/lib/errores";
import { PRECIO_ENTRADA, cobrar } from "@/lib/pagos";
import type { CrearCompraInput, HistorialQuery } from "@/lib/schemas/compra";

/** Código de Prisma para "violaste una restricción de unicidad". */
const VIOLACION_DE_UNICIDAD = "P2002";

/**
 * Tope de entradas de una compra: `crearCompraSchema` no admite más de 10
 * butacas por compra.
 */
const MAXIMO_ENTRADAS_POR_COMPRA = 10;

/**
 * Los datos de la función se copian en la respuesta del historial tal como
 * están hoy, sin filtrar por sala eliminada ni por película dada de baja: una
 * compra vieja tiene que seguir mostrando dónde y qué se vio (H5 y H6).
 */
const camposDeCompra = {
  id: true,
  estado: true,
  creadaEn: true,
  entradas: {
    select: {
      id: true,
      butaca: { select: { id: true, fila: true, columna: true } },
      funcion: {
        select: {
          id: true,
          inicio: true,
          pelicula: { select: { id: true, titulo: true, imagenUrl: true } },
          sala: { select: { id: true, nombre: true } },
        },
      },
    },
    orderBy: [{ butaca: { fila: "asc" } }, { butaca: { columna: "asc" } }],
    take: MAXIMO_ENTRADAS_POR_COMPRA,
  },
} satisfies Prisma.CompraSelect;

function mensajeDeButacasOcupadas(cantidad: number) {
  return cantidad === 1
    ? "Una de las butacas que elegiste ya fue vendida para esta función. No se te cobró nada"
    : `${cantidad} de las butacas que elegiste ya fueron vendidas para esta función. No se te cobró nada`;
}

/**
 * Compra de entradas (H4). El `usuarioId` viene de la sesión y baja por
 * parámetro: si saliera del body, cualquiera compraría a nombre de otro.
 *
 * El orden importa. Primero se descarta todo lo que ya se puede saber sin
 * cobrar (función inexistente o pasada, butacas de otra sala, butacas
 * vendidas); recién ahí se cobra, y con el pago aprobado se persiste la Compra
 * con sus Entradas en una única transacción: o entran todas o no entra
 * ninguna, nunca una compra a medio armar.
 */
export async function crearCompra(datos: CrearCompraInput, usuarioId: string) {
  const funcion = await prisma.funcion.findUnique({
    where: { id: datos.funcionId },
    select: {
      id: true,
      inicio: true,
      salaId: true,
      pelicula: { select: { titulo: true } },
    },
  });
  if (!funcion) throw new ErrorNoEncontrado("No existe la función indicada");

  if (funcion.inicio.getTime() <= Date.now()) {
    throw new ErrorDeConflicto(
      `La función de "${funcion.pelicula.titulo}" ya empezó: no se pueden comprar entradas`,
    );
  }

  // Las dos consultas dependen de la función pero no entre sí, así que van en
  // paralelo: es el camino caliente de la compra y no hay por qué pagar dos
  // viajes a la base.
  //
  // Las butacas se buscan acotadas a la sala de la función: así, un id que no
  // existe y uno de otra sala caen los dos en el mismo lado, y no hace falta
  // una consulta aparte para distinguirlos. Las entradas no se filtran por
  // estado: la única Compra que se persiste es la PAGADA (el pago rechazado no
  // llega a guardarse), así que toda Entrada que exista ocupa la butaca. Es lo
  // mismo que asume el índice único, que tampoco mira el estado.
  const [butacas, ocupadas] = await Promise.all([
    prisma.butaca.findMany({
      where: { id: { in: datos.butacaIds }, salaId: funcion.salaId },
      select: { id: true },
      take: MAXIMO_ENTRADAS_POR_COMPRA,
    }),
    prisma.entrada.findMany({
      where: { funcionId: funcion.id, butacaId: { in: datos.butacaIds } },
      select: { butacaId: true },
      take: MAXIMO_ENTRADAS_POR_COMPRA,
    }),
  ]);

  // El orden de los dos chequeos importa para el mensaje: una butaca que ni
  // siquiera es de esta sala no es un problema de disponibilidad.
  if (butacas.length !== datos.butacaIds.length) {
    throw new ErrorDeConflicto(
      "Alguna de las butacas elegidas no pertenece a la sala de esta función",
    );
  }

  if (ocupadas.length > 0) throw new ErrorDeConflicto(mensajeDeButacasOcupadas(ocupadas.length));

  // El cobro va afuera de la transacción: dejar la conexión tomada esperando a
  // una pasarela es lo que después tira la base abajo. El precio de sacarlo es
  // que una carrera perdida más abajo deja un cobro hecho; con una pasarela
  // real, ahí iría la anulación.
  const pago = await cobrar(datos.butacaIds.length * PRECIO_ENTRADA);
  if (!pago.aprobado) throw new ErrorDePagoRechazado(pago.motivo);

  try {
    return await prisma.$transaction(async (tx) => {
      // Este re-chequeo no cierra la carrera de dos compras simultáneas: en
      // READ COMMITTED no se ven las filas que la otra transacción todavía no
      // confirmó —eso lo corta el índice único, más abajo—. Cubre el caso
      // frecuente: una compra rival que commiteó entre la verificación de
      // arriba y este momento. Esas filas ya están confirmadas, así que se ven,
      // y el mensaje puede decir cuántas butacas se perdieron en vez del 1 fijo
      // que informa el camino del índice único.
      const seAdelantaron = await tx.entrada.findMany({
        where: { funcionId: funcion.id, butacaId: { in: datos.butacaIds } },
        select: { butacaId: true },
        take: MAXIMO_ENTRADAS_POR_COMPRA,
      });
      if (seAdelantaron.length > 0) {
        throw new ErrorDeConflicto(mensajeDeButacasOcupadas(seAdelantaron.length));
      }

      return tx.compra.create({
        data: {
          usuarioId,
          estado: "PAGADA",
          entradas: {
            create: datos.butacaIds.map((butacaId) => ({ funcionId: funcion.id, butacaId })),
          },
        },
        select: camposDeCompra,
      });
    });
  } catch (error) {
    // Dos compras sobre la misma butaca en el mismo instante: las dos vieron
    // la butaca libre y la segunda choca contra el índice único al escribir.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === VIOLACION_DE_UNICIDAD
    ) {
      throw new ErrorDeConflicto(mensajeDeButacasOcupadas(1));
    }

    throw error;
  }
}

/**
 * Historial de compras (H4). Filtra por el usuario de la sesión y no por un id
 * que llegue de afuera: es lo que hace que nadie vea las compras de otro. Sin
 * filtros de fecha ni de sala, para que las funciones pasadas sigan estando
 * aunque la sala se haya eliminado o la película dada de baja.
 */
export async function listarComprasDeUsuario(usuarioId: string, { limite }: HistorialQuery) {
  return prisma.compra.findMany({
    where: { usuarioId },
    select: camposDeCompra,
    orderBy: { creadaEn: "desc" },
    take: limite,
  });
}
