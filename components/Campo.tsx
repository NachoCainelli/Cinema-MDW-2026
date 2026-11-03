/**
 * Un campo de formulario completo: etiqueta, control, ayuda y error.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES UN `<input>` SUELTO CON UN `<label>` AL LADO
 * ---------------------------------------------------------------------------
 * Porque las cuatro piezas tienen que estar CONECTADAS, y conectarlas a mano
 * en cada campo es garantía de que el tercero salga mal:
 *
 *   label  ──htmlFor/id──>  control
 *   control ──aria-describedby──>  ayuda y error
 *   control ──aria-invalid──>  "este campo está mal"
 *
 * Sin la primera conexión, tocar la etiqueta no enfoca el campo y el lector de
 * pantalla anuncia "campo de texto" sin decir cuál. Sin la segunda, el error
 * existe en la pantalla pero no se lee: alguien que usa lector escucha "campo
 * inválido" y nunca se entera de por qué.
 *
 * Los ids se generan con `useId()` y no con el nombre del campo: dos
 * formularios en la misma página —o el mismo componente usado dos veces—
 * producirían ids repetidos, y un id repetido rompe justamente la conexión
 * que vinimos a hacer.
 *
 * No lleva `"use client"`: `useId` también existe en Server Components, así
 * que `Campo` sirve en los dos lados. Eso importa por `control`: una función
 * no puede cruzar de un Server Component a uno de cliente, y si `Campo` fuera
 * de cliente, una página de servidor (como `/sistema`) no podría pasarle un
 * `<select>`. Importado desde un formulario con `"use client"`, se vuelve de
 * cliente igual.
 *
 * ---------------------------------------------------------------------------
 * EL ERROR NO SE COMUNICA SOLO CON COLOR, NI SOLO CON UN BORDE
 * ---------------------------------------------------------------------------
 * El borde rojo (lo pinta `Input` a partir de `aria-invalid`) es una ayuda
 * para quien lo ve. La información es el texto, y va con `role="alert"` para
 * que se anuncie cuando aparece, sin que la persona tenga que ir a buscarlo.
 */
import { useId } from "react";

import { Input } from "@/components/ui/input";

type Props = {
  etiqueta: string;
  nombre: string;
  /** El texto de ayuda que explica el formato ANTES de que alguien se equivoque. */
  ayuda?: string;
  errores?: string[];
  /**
   * Para los campos que no son un `<input>` —un `Select` de `components/ui/`,
   * un `<textarea>`—. Recibe `name` y las conexiones ya calculadas en vez de
   * dejar que cada pantalla las vuelva a armar: si el control se olvidara el
   * `id`, la etiqueta dejaría de funcionar y no lo notaría nadie que use el
   * mouse. Con un componente compuesto como el `Select`, `name` va a la raíz
   * (es la que agrega el valor al formulario) y el resto, al elemento que
   * recibe el foco (el `SelectTrigger`).
   */
  control?: (props: {
    id: string;
    name: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
} & Omit<React.ComponentProps<"input">, "name" | "id">;

export default function Campo({ etiqueta, nombre, ayuda, errores, control, ...props }: Props) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const tieneError = Boolean(errores?.length);
  const descripto =
    [ayuda ? idAyuda : null, tieneError ? idError : null].filter(Boolean).join(" ") || undefined;
  const conexiones = {
    id,
    name: nombre,
    "aria-invalid": tieneError || undefined,
    "aria-describedby": descripto,
  } as const;

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium wrap-anywhere">
        {etiqueta}
        {/* `required` ya viaja en el control para el navegador y el lector de
            pantalla; esto es para el ojo. */}
        {props.required ? (
          <span className="ml-1 text-muted-foreground" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {control ? control(conexiones) : <Input {...props} {...conexiones} />}

      {ayuda ? (
        <p id={idAyuda} className="text-xs text-muted-foreground wrap-anywhere">
          {ayuda}
        </p>
      ) : null}

      {tieneError ? (
        <p id={idError} role="alert" className="text-xs text-destructive wrap-anywhere">
          {errores![0]}
        </p>
      ) : null}
    </div>
  );
}
