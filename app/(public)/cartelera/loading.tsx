/**
 * Estado "cargando" de la cartelera: un esqueleto con la forma del contenido
 * (título, buscador y una grilla de pósters), para que la pantalla no salte
 * cuando llegan las funciones.
 *
 * La cartelera no llama a `redirect()` ni a `notFound()`, así que el
 * streaming que agrega este archivo no le cambia el status code (ver la nota
 * de la issue #76 sobre `/compras`).
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoCartelera() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-6 h-9 w-full" />

      <div aria-hidden="true" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((posicion) => (
          <Skeleton key={posicion} className="aspect-2/3 w-full" />
        ))}
      </div>

      <p className="sr-only" role="status">
        Cargando la cartelera…
      </p>
    </main>
  );
}
