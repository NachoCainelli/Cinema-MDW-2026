/**
 * El mapa de la sala para una función: una grilla de butacas, fila por fila,
 * con la pantalla arriba.
 *
 * ---------------------------------------------------------------------------
 * LIBRE, OCUPADA Y ELEGIDA NO SE DISTINGUEN SOLO CON COLOR (§7)
 * ---------------------------------------------------------------------------
 * Cada estado tiene su forma: libre es el casillero vacío, ocupada lleva una
 * cruz y elegida, una tilde. Con la leyenda de abajo alcanza para leerlo en
 * blanco y negro. Para el lector de pantalla, cada butaca dice su nombre y su
 * estado ("Fila 2 · Butaca 5: libre").
 *
 * ---------------------------------------------------------------------------
 * BOTONES DE ALTERNAR, NO `div` CON `onClick`
 * ---------------------------------------------------------------------------
 * Con `onAlternar`, cada butaca libre es un `<button aria-pressed>`: se llega
 * con Tab, se elige con Enter o Espacio y el lector anuncia "presionado". Una
 * ocupada es un botón deshabilitado. Sin `onAlternar` (quien no puede
 * comprar), el mapa es solo para mirar y no hay nada que enfocar.
 *
 * No lleva `"use client"`: sin estado propio, sirve tanto adentro del
 * selector (cliente) como suelto en la página (servidor).
 */
import { Check, X } from "lucide-react";

import { etiquetaDeButaca } from "@/lib/butacas";
import { cn } from "@/lib/utils";

export type ButacaDelMapa = { id: string; fila: number; columna: number; ocupada: boolean };

type Props = {
  butacas: ButacaDelMapa[];
  elegidas?: ReadonlySet<string>;
  /** Sin esto, el mapa es de solo lectura. */
  onAlternar?: (id: string) => void;
  /** Para no dejar elegir más que el tope de la compra; las ya elegidas se pueden soltar. */
  sinLugarParaMas?: boolean;
};

const ESTILO_DE_BUTACA =
  "flex aspect-square w-full items-center justify-center rounded-md border text-xs [&_svg]:size-4";

export default function MapaDeButacas({ butacas, elegidas, onAlternar, sinLugarParaMas }: Props) {
  const columnas = Math.max(...butacas.map((butaca) => butaca.columna), 1);
  const filas = agruparPorFila(butacas);

  return (
    <div>
      {/* Solo la grilla se desplaza si la sala es muy ancha: la página no. */}
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto w-max min-w-full">
          <p
            aria-hidden="true"
            className="mx-auto mb-4 w-3/4 rounded-b-lg border-t-4 border-muted-foreground/40 pt-1 text-center text-xs text-muted-foreground"
          >
            Pantalla
          </p>
          <ol className="space-y-1" aria-label="Butacas de la sala, de la pantalla hacia atrás">
            {filas.map(([fila, butacasDeLaFila]) => (
              <li key={fila} className="flex items-center gap-1">
                <span aria-hidden="true" className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                  {fila}
                </span>
                <ul
                  aria-label={`Fila ${fila}`}
                  className="grid flex-1 gap-1"
                  // La cantidad de columnas depende de la sala: es un valor de runtime.
                  style={{ gridTemplateColumns: `repeat(${columnas}, minmax(1.75rem, 2.25rem))` }}
                >
                  {butacasDeLaFila.map((butaca) => (
                    <li key={butaca.id} style={{ gridColumn: butaca.columna }}>
                      <Butaca
                        butaca={butaca}
                        elegida={elegidas?.has(butaca.id) ?? false}
                        onAlternar={onAlternar}
                        sinLugarParaMas={sinLugarParaMas}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Referencias">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className={cn(ESTILO_DE_BUTACA, "size-6 border-input")} />
          Libre
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(ESTILO_DE_BUTACA, "size-6 border-transparent bg-muted text-muted-foreground")}
          >
            <X />
          </span>
          Ocupada
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(ESTILO_DE_BUTACA, "size-6 border-primary bg-primary text-primary-foreground")}
          >
            <Check />
          </span>
          Elegida
        </li>
      </ul>
    </div>
  );
}

function Butaca({
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

function agruparPorFila(butacas: ButacaDelMapa[]): [number, ButacaDelMapa[]][] {
  const porFila = new Map<number, ButacaDelMapa[]>();
  for (const butaca of butacas) {
    const fila = porFila.get(butaca.fila) ?? [];
    fila.push(butaca);
    porFila.set(butaca.fila, fila);
  }
  return [...porFila.entries()].sort(([a], [b]) => a - b);
}
