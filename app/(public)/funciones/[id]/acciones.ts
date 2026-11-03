/**
 * La Server Action que confirma una compra (H4, pasos 6 y 7 del flujo).
 *
 * No decide nada sobre compras: llama a `crearCompra`, la misma que
 * `POST /api/compras`. La sobreventa, el cobro y la transacción viven ahí; lo
 * único que cambia entre las dos puertas es a qué se traduce el rechazo
 * (`respuestaDeError` allá, `estadoDeError` acá).
 *
 * El `funcionId` no viaja en el formulario: la página lo ata con
 * `.bind(null, funcion.id)` a partir de la URL. Del formulario solo llegan los
 * `butacaIds`, que son lo único que la persona elige. El usuario sale de la
 * sesión.
 */
"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requerirUsuario } from "@/lib/auth";
import { crearCompra } from "@/lib/db/compras";
import { ErrorDeConflicto, ErrorNoAutenticado } from "@/lib/errores";
import { estadoDeError, type EstadoDelFormulario } from "@/lib/formularios";
import { urlDeIngreso } from "@/lib/navegacion";
import { crearCompraSchema } from "@/lib/schemas/compra";

export async function comprarEntradasAction(
  funcionId: string,
  _estadoPrevio: EstadoDelFormulario,
  formData: FormData,
): Promise<EstadoDelFormulario> {
  let compraId: string;

  try {
    // Una Server Action es un endpoint público: el rol se exige acá aunque la
    // página ya haya decidido no mostrarle el botón a quien no es USUARIO.
    const usuario = await requerirUsuario("USUARIO");

    const datos = crearCompraSchema.parse({
      funcionId,
      butacaIds: formData.getAll("butacaIds").filter((valor) => typeof valor === "string"),
    });

    ({ id: compraId } = await crearCompra(datos, usuario.id));
  } catch (error) {
    // La sesión venció mientras elegía: en vez de la pantalla de error, de
    // vuelta al login y, al entrar, de vuelta a esta función.
    if (error instanceof ErrorNoAutenticado) redirect(urlDeIngreso(`/funciones/${funcionId}`));

    // Una butaca se vendió mientras la persona elegía: se vuelve a pintar el
    // mapa para que la vea ocupada. La selección vive en el cliente, así que
    // el resto de lo que había elegido sigue elegido.
    if (error instanceof ErrorDeConflicto) refresh();

    return estadoDeError(error);
  }

  // Esa función tiene menos butacas libres, y la compra nueva ya figura en el
  // historial.
  revalidatePath(`/funciones/${funcionId}`);
  revalidatePath("/cartelera");
  revalidatePath("/compras");
  redirect(`/compras/${compraId}`);
}
