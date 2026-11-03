/**
 * La Server Action que crea una función (H3).
 *
 * No decide nada sobre funciones: llama a `crearFuncion`, la misma que
 * `POST /api/funciones`. La regla del solapamiento con el margen de 15 minutos
 * vive en `lib/cartelera.ts` y `lib/db/funciones.ts`; lo único que cambia
 * entre las dos puertas es a qué se traduce el rechazo:
 *
 *   el endpoint        ErrorDeConflicto → 409          (`respuestaDeError`)
 *   esta acción        ErrorDeConflicto → `mensaje`    (`estadoDeError`)
 *
 * El orden es el del Route Handler: autorizar → validar → delegar. (La
 * referencia de la cátedra valida antes; acá no: alguien sin el rol no tiene
 * por qué enterarse de qué campos acepta el formulario.)
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requerirUsuario } from "@/lib/auth";
import { crearFuncion } from "@/lib/db/funciones";
import { estadoDeError, type EstadoDelFormulario } from "@/lib/formularios";
import { crearFuncionSchema } from "@/lib/schemas/funcion";
import { desdeHoraDelCine } from "@/lib/utils";

export async function crearFuncionAction(
  _estadoPrevio: EstadoDelFormulario,
  formData: FormData,
): Promise<EstadoDelFormulario> {
  // Lo que la persona escribió, tal cual, para devolvérselo si algo falla.
  const valores = {
    peliculaId: String(formData.get("peliculaId") ?? ""),
    salaId: String(formData.get("salaId") ?? ""),
    inicio: String(formData.get("inicio") ?? ""),
  };

  try {
    // Una Server Action es un endpoint público: el rol se vuelve a exigir acá
    // aunque la página ya lo haya hecho. Sin sesión o con otro rol,
    // `estadoDeError` re-lanza y no se pinta nada en el formulario.
    await requerirUsuario("GESTOR_CARTELERA");

    const datos = crearFuncionSchema.parse({
      ...valores,
      // El datetime-local no trae zona: se interpreta en hora del cine, no en
      // la del servidor (UTC en Vercel).
      inicio: desdeHoraDelCine(valores.inicio),
    });

    await crearFuncion(datos);
  } catch (error) {
    return estadoDeError(error, valores);
  }

  // La función nueva ya figura en la cartelera pública. El destino es
  // `/cartelera` y no el detalle de la función porque `/funciones/[id]`
  // (#88) todavía no existe.
  revalidatePath("/cartelera");
  redirect("/cartelera");
}
