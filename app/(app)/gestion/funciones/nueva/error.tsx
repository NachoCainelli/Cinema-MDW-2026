"use client";

/**
 * Estado "error" de la creación de funciones: falló el sistema, no la persona.
 *
 * Llega acá lo que `estadoDeError` re-lanza desde la acción (un error
 * inesperado, o una sesión que venció mientras completaba el formulario) y lo
 * que falle al cargar las películas y salas. No muestra el `message` de la
 * excepción: el detalle va a `console.error` y el `digest` permite cruzarlo
 * con el log del servidor. Mismo criterio que `app/(public)/cartelera/error.tsx`.
 *
 * No hay `loading.tsx` a propósito: la página llama a `redirect()` y a
 * `notFound()`, y con el streaming que agrega ese archivo el 404 saldría con
 * status 200 (la misma razón por la que `/compras` no lo tiene).
 */
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorNuevaFuncion({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Falló la creación de la función", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Nueva función</h1>
      <Alert variant="destructive" className="mt-6">
        <AlertTitle>No pudimos completar la operación</AlertTitle>
        <AlertDescription>
          <p>
            El problema es del sistema, no de lo que hiciste. Si la sesión venció, volvé a ingresar;
            si no, probá de nuevo en un momento.
          </p>
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
