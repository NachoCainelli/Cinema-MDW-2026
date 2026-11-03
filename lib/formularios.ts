/**
 * El tipo que viaja entre una Server Action y su formulario, y el traductor
 * que convierte los errores de `lib/errores.ts` a ese tipo.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN TIPO COMPARTIDO Y NO UNO POR FORMULARIO
 * ---------------------------------------------------------------------------
 * Porque `useActionState` obliga a que la acción y el componente se pongan de
 * acuerdo en una forma, y si cada pantalla inventa la suya, el tercer
 * formulario termina devolviendo `{ error: string }`, el cuarto
 * `{ mensaje: string }` y ninguno sabe pintar los errores del otro.
 *
 * Con una sola forma, el componente que muestra un error de campo (`Campo`)
 * sirve para todos los formularios del sistema.
 *
 * ---------------------------------------------------------------------------
 * LOS DOS TIPOS DE ERROR, QUE NO SE MUESTRAN EN EL MISMO LUGAR
 * ---------------------------------------------------------------------------
 *   errores   por campo, y van DEBAJO DEL CAMPO
 *             "La capacidad tiene que ser un número positivo"
 *
 *   mensaje   de la regla de negocio, y va ARRIBA DEL FORMULARIO
 *             "Una de las butacas que elegiste ya fue vendida"
 *
 * La diferencia no es estética: el primero se arregla corrigiendo ese campo;
 * el segundo puede que no se arregle tocando nada del formulario, y ponerlo
 * debajo de un input sugiere que sí. Es la distinción del 400 contra el 409,
 * traducida a una pantalla.
 */
import { ZodError } from "zod";

import {
  ErrorDeConflicto,
  ErrorDePagoRechazado,
  ErrorDeServicioExterno,
  ErrorNoEncontrado,
} from "@/lib/errores";

/** Lo que la persona había escrito, para no vaciarle el formulario al fallar. */
export type ValoresDelFormulario = Record<string, string>;

export type EstadoDelFormulario = {
  ok: false;
  /** Errores de validación, por nombre de campo. Los produce Zod. */
  errores?: Record<string, string[] | undefined>;
  /** Un rechazo de la regla de negocio: los datos eran válidos y aun así no se pudo. */
  mensaje?: string;
  /**
   * Lo que el rechazo enumera, cuando hace falta enumerarlo: qué butacas se
   * vendieron mientras la persona elegía. Una lista y no una frase armada con
   * comas, para que la pantalla la pinte como lista.
   */
  detalles?: string[];
  /**
   * A dónde ir para resolverlo, cuando hay un lugar. Un rechazo que dice "ya
   * existe" y no dice dónde deja a la persona buscando.
   */
  enlace?: { href: string; texto: string };
  valores?: ValoresDelFormulario;
};

/**
 * El estado con el que arranca un formulario que todavía nadie envió.
 *
 * Existe como constante para que ninguna pantalla escriba `{ ok: false }` a
 * mano y se olvide un campo. Y es `ok: false` sin errores, que se lee raro
 * hasta que se entiende: "todavía no pasó nada" y "salió mal" se distinguen
 * por si hay errores, no por el estado inicial.
 */
export const SIN_ENVIAR: EstadoDelFormulario = { ok: false };

/**
 * El equivalente de `respuestaDeError` (`lib/api/respuestas.ts`) para la otra
 * puerta: una Server Action llama a la misma función de `lib/db/` que el
 * Route Handler, recibe los mismos errores, y lo único que cambia es a qué
 * los traduce —a un `EstadoDelFormulario` en vez de a un status code—.
 *
 *   ZodError                         → `errores` por campo (el 400)
 *   ErrorNoEncontrado                → `mensaje` arriba del formulario (404)
 *   ErrorDeConflicto                 → `mensaje` (409)
 *   ErrorDePagoRechazado             → `mensaje` (402)
 *   ErrorDeServicioExterno           → `mensaje` (502)
 *   cualquier otro                   → se re-lanza tal cual
 *
 * Se re-lanza —en vez de devolver un mensaje genérico— todo lo que no es una
 * respuesta esperada del contrato: `ErrorNoAutenticado` / `ErrorNoAutorizado`
 * (que no tienen nada que pintar en un formulario), los `redirect()` y
 * `notFound()` de Next.js (que funcionan lanzando y dejarían de funcionar si
 * se atraparan acá) y cualquier error inesperado. Lo toma `error.tsx`, y Next
 * lo deja en el log del servidor: por eso este traductor no loguea nada. Lo
 * que sí garantiza es que el `message` de un error inesperado nunca llega a
 * la pantalla.
 *
 * `valores` es lo que la persona había escrito; se devuelve siempre que
 * venga, para que el formulario no se vacíe al fallar.
 */
export function estadoDeError(
  error: unknown,
  valores?: ValoresDelFormulario,
): EstadoDelFormulario {
  const conValores = valores ? { valores } : {};

  if (error instanceof ZodError) {
    // Se agrupa por la ruta completa (`butacas.0`, no solo `butacas`), igual
    // que `respuestaDeError`, para que un campo anidado conserve su error. Un
    // issue sin ruta (un `refine` sobre el objeto entero) no es de ningún
    // campo: va arriba, como mensaje.
    const errores: Record<string, string[]> = {};
    let mensaje: string | undefined;
    for (const issue of error.issues) {
      if (issue.path.length === 0) {
        mensaje ??= issue.message;
        continue;
      }
      const campo = issue.path.join(".");
      (errores[campo] ??= []).push(issue.message);
    }
    return { ok: false, errores, ...(mensaje ? { mensaje } : {}), ...conValores };
  }

  if (
    error instanceof ErrorNoEncontrado ||
    error instanceof ErrorDeConflicto ||
    error instanceof ErrorDePagoRechazado ||
    error instanceof ErrorDeServicioExterno
  ) {
    return { ok: false, mensaje: error.message, ...conValores };
  }

  throw error;
}
