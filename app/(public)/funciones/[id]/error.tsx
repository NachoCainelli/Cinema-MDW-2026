"use client";

/**
 * Estado "error" de la pantalla de compra: falló el sistema, no la persona.
 *
 * Llega acá lo que falle al cargar la función y lo que `estadoDeError`
 * re-lanza desde la acción (un error inesperado). Una butaca vendida o un pago
 * rechazado no llegan acá: van arriba del formulario. Tampoco la sesión
 * vencida, que la acción manda al login. No muestra el `message` de la
 * excepción: el detalle va a `console.error` y el `digest` permite cruzarlo
 * con el log del servidor. Mismo criterio que `app/(public)/cartelera/error.tsx`.
 */
import Link from "next/link";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorButacasDeFuncion({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Falló la pantalla de compra", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Elegir butacas</h1>
      <Alert variant="destructive" className="mt-6">
        <AlertTitle>No pudimos completar la operación</AlertTitle>
        <AlertDescription>
          <p>
            El problema es del sistema, no de lo que hiciste. Si estabas comprando, revisá en Mis
            compras antes de volver a intentarlo.
          </p>
          {error.digest && (
            <p className="text-xs">
              Código del error: <code>{error.digest}</code>
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => retry()}>
              Reintentar
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/compras">Mis compras</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </main>
  );
}
