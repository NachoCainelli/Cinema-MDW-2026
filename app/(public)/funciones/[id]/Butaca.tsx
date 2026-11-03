/**
 * Una butaca del mapa (`MapaDeButacas.tsx`). Con `onAlternar` es un
 * `<button aria-pressed>`; sin eso, un casillero de solo lectura con el estado
 * en el nombre (`role="img"`). El porqué de cada decisión de accesibilidad
 * está en el comentario de `MapaDeButacas.tsx`.
 *
 * No lleva `"use client"`, por lo mismo que el mapa: no tiene estado propio.
 */
import { Check, X } from "lucide-react";

import { etiquetaDeButaca } from "@/lib/butacas";
import { cn } from "@/lib/utils";

import type { ButacaDelMapa } from "./MapaDeButacas";

/** Lo común a los tres estados; la leyenda del mapa lo reusa para sus muestras. */
export const ESTILO_DE_BUTACA =
  "flex aspect-square w-full items-center justify-center rounded-md border text-xs [&_svg]:size-4";

export default function Butaca({
  butaca,
  elegida,
  onAlternar,
  sinLugarParaMas,
}: {
  butaca: ButacaDelMapa;
  elegida: boolean;
  onAlternar?: (id: string) => void;
  sinLugarParaMas?: boolean;
}) {
  const estado = butaca.ocupada ? "ocupada" : elegida ? "elegida" : "libre";
  const etiqueta = `${etiquetaDeButaca(butaca)}: ${estado}`;
  const estilo = cn(
    ESTILO_DE_BUTACA,
    butaca.ocupada && "border-transparent bg-muted text-muted-foreground",
    elegida && "border-primary bg-primary text-primary-foreground",
    !butaca.ocupada && !elegida && "border-input bg-background",
  );
  const icono = butaca.ocupada ? <X aria-hidden="true" /> : elegida ? <Check aria-hidden="true" /> : null;

  if (!onAlternar) {
    return (
      <span role="img" aria-label={etiqueta} className={estilo}>
        {icono}
      </span>
    );
  }

  return (
    <button
      type="button"
      // Libre o elegida lo anuncia `aria-pressed`; ocupada va en el nombre,
      // porque un botón deshabilitado no tiene "presionado" que anunciar.
      aria-label={butaca.ocupada ? etiqueta : etiquetaDeButaca(butaca)}
      aria-pressed={elegida}
      // La ocupada no se puede elegir; con el tope alcanzado, solo se pueden soltar las elegidas.
      disabled={butaca.ocupada || (sinLugarParaMas && !elegida)}
      onClick={() => onAlternar(butaca.id)}
      title={etiqueta}
      className={cn(
        estilo,
        "outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed",
        !butaca.ocupada && !elegida && "hover:bg-accent disabled:opacity-50",
      )}
    >
      {icono}
    </button>
  );
}
