"use client";

/**
 * Estado "error" de la cartelera: falló el sistema, no la persona.
 *
 * Tiene que ser de cliente porque "Reintentar" es un evento del navegador.
 * No muestra el `message` de la excepción (mismo criterio que el 500 de
 * `respuestaDeError`): el detalle va a `console.error`, y el `digest` sirve
 * para cruzar lo que vio la persona con el log del servidor.
 *
 * `retry()` y no `reset()`: en esta versión de Next, `retry` vuelve a pedir
 * los datos y re-renderiza; `reset` solo limpia el error sin volver a pedir.
 */
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorCartelera({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Falló la cartelera", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Cartelera</h1>
      <Alert variant="destructive" className="mt-6">
        <AlertTitle>No pudimos cargar la cartelera</AlertTitle>
        <AlertDescription>
          <p>El problema es del sistema, no de lo que hiciste. Probá de nuevo en un momento.</p>
          {error.digest && (
            <p className="text-xs">
              Código del error: <code>{error.digest}</code>
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => retry()}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
