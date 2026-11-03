/**
 * Home del proyecto: cartelera pública (H3).
 *
 * Server Component que lee directo de `lib/db/funciones.ts`, igual criterio
 * que `GET /api/funciones`: sin sesión, solo funciones futuras de salas
 * vigentes y películas en cartelera. No pasa por la API — es el mismo
 * patrón que ya usan `app/(app)/compras/page.tsx` y `[id]/page.tsx`.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listarCartelera } from "@/lib/db/funciones";
import { carteleraQuerySchema } from "@/lib/schemas/funcion";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cinema MDW 2026",
};

// Sin esto, Next.js prerrenderiza esta página en el build (no tiene ningún
// uso de cookies/sesión que la fuerce a dinámica por su cuenta, a diferencia
// de las páginas de /compras) y la cartelera quedaría congelada con los datos
// del momento del build hasta el próximo deploy — justo lo que la cartelera
// pública no puede ser.
export const dynamic = "force-dynamic";

export default async function Home() {
  const funciones = await listarCartelera(carteleraQuerySchema.parse({}));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cinema MDW 2026</h1>
        <Button asChild variant="link">
          <Link href="/compras">Mis compras</Link>
        </Button>
      </header>
      <p className="mt-1 text-sm text-muted-foreground">Cartelera</p>

      {funciones.length === 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Todavía no hay funciones programadas</CardTitle>
            <CardDescription>Volvé a mirar más tarde.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {funciones.map((funcion) => (
            <li key={funcion.id}>
              <Card className="h-full py-0">
                {funcion.pelicula.imagenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL dinámica del bucket de Storage (`SUPABASE_URL`), sin dominio fijo para configurar en next.config.
                  <img
                    src={funcion.pelicula.imagenUrl}
                    alt={`Póster de ${funcion.pelicula.titulo}`}
                    className="aspect-2/3 w-full rounded-t-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="aspect-2/3 w-full rounded-t-xl bg-muted"
                  />
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-2">{funcion.pelicula.titulo}</CardTitle>
                  <CardDescription>
                    {funcion.sala.nombre} · {formatearFecha(funcion.inicio)}
                  </CardDescription>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{funcion.pelicula.clasificacion}</Badge>
                    <Badge variant="outline">{funcion.pelicula.categoria}</Badge>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
