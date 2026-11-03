/**
 * Elegir butacas y confirmar la compra, en el mismo formulario (§5, pasos 5 y 6).
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ LA SELECCIÓN NO SE PIERDE AL FALLAR
 * ---------------------------------------------------------------------------
 * Después de una acción, React resetea el formulario. Si las butacas fueran
 * checkboxes, el reset las destildaría. Por eso la selección vive en estado
 * del componente y viaja como `<input type="hidden" name="butacaIds">`, que el
 * reset no toca.
 *
 * Si la compra choca con una butaca que otra persona compró mientras tanto,
 * la acción vuelve a pintar la página (`refresh()`) y el mapa llega con esa
 * butaca ocupada. La selección no se toca: lo que se envía es lo elegido que
 * sigue libre, así que la vendida deja de contar sola y el resto queda
 * elegido. Qué butacas se perdieron lo dice `estado.detalles`, arriba.
 */
"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { etiquetaDeButaca } from "@/lib/butacas";
import { SIN_ENVIAR, type EstadoDelFormulario } from "@/lib/formularios";
import { MAXIMO_BUTACAS_POR_COMPRA } from "@/lib/schemas/compra";
import { formatearPrecio } from "@/lib/utils";

import MapaDeButacas, { type ButacaDelMapa } from "./MapaDeButacas";

type Props = {
  butacas: ButacaDelMapa[];
  precio: number;
  /** `comprarEntradasAction` con el `funcionId` ya atado por la página. */
  comprar: (estado: EstadoDelFormulario, formData: FormData) => Promise<EstadoDelFormulario>;
};

export default function SelectorDeButacas({ butacas, precio, comprar }: Props) {
  const [estado, enviar, pendiente] = useActionState(comprar, SIN_ENVIAR);
  const [elegidas, setElegidas] = useState<string[]>([]);

  const libres = new Map(butacas.filter((butaca) => !butaca.ocupada).map((b) => [b.id, b]));
  const vigentes = elegidas.filter((id) => libres.has(id));
  const sinLugarParaMas = vigentes.length >= MAXIMO_BUTACAS_POR_COMPRA;

  function alternar(id: string) {
    setElegidas(vigentes.includes(id) ? vigentes.filter((otra) => otra !== id) : [...vigentes, id]);
  }

  const resumen = vigentes
    .map((id) => libres.get(id))
    .filter((butaca) => butaca !== undefined)
    .sort((a, b) => a.fila - b.fila || a.columna - b.columna)
    .map(etiquetaDeButaca);

  return (
    <form action={enviar} className="space-y-6">
      {estado.mensaje ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo confirmar la compra</AlertTitle>
          <AlertDescription>
            <p>{estado.mensaje}</p>
            {estado.detalles?.length ? (
              <ul className="mt-1 list-disc pl-5">
                {estado.detalles.map((detalle) => (
                  <li key={detalle}>{detalle}</li>
                ))}
              </ul>
            ) : null}
            {estado.detalles && vigentes.length > 0 ? (
              <p className="mt-1">Las demás butacas que habías elegido siguen elegidas.</p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <fieldset>
        <legend className="text-lg font-semibold">Elegí tus butacas</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Hasta {MAXIMO_BUTACAS_POR_COMPRA} por compra. Cada entrada cuesta {formatearPrecio(precio)}.
        </p>
        <div className="mt-4">
          <MapaDeButacas
            butacas={butacas}
            elegidas={new Set(vigentes)}
            onAlternar={alternar}
            sinLugarParaMas={sinLugarParaMas}
          />
        </div>
      </fieldset>

      {vigentes.map((id) => (
        <input key={id} type="hidden" name="butacaIds" value={id} />
      ))}

      {estado.errores?.butacaIds ? (
        <p role="alert" className="text-sm text-destructive">
          {estado.errores.butacaIds[0]}
        </p>
      ) : null}

      <div className="space-y-3 rounded-lg border p-4">
        {/* `aria-live`: cada butaca que se elige o se suelta actualiza el total en voz alta. */}
        <div aria-live="polite" className="text-sm">
          {resumen.length === 0 ? (
            <p className="text-muted-foreground">Todavía no elegiste ninguna butaca.</p>
          ) : (
            <>
              <p className="font-medium">
                {resumen.length === 1 ? "1 butaca" : `${resumen.length} butacas`} ·{" "}
                {formatearPrecio(resumen.length * precio)}
              </p>
              <p className="mt-1 text-muted-foreground">{resumen.join(", ")}</p>
              {sinLugarParaMas ? (
                <p className="mt-1 text-muted-foreground">
                  Llegaste al máximo de {MAXIMO_BUTACAS_POR_COMPRA} butacas por compra.
                </p>
              ) : null}
            </>
          )}
        </div>

        <Button
          type="submit"
          // Deshabilitado mientras corre: un doble clic no genera dos compras.
          disabled={pendiente || vigentes.length === 0}
          className="w-full sm:w-auto"
        >
          {pendiente ? "Confirmando…" : "Confirmar compra"}
        </Button>
      </div>
    </form>
  );
}
