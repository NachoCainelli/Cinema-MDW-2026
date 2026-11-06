/**
 * Buscador de la cartelera: el formulario de búsqueda por título y lo que
 * encontró, con los links para pasar de página.
 *
 * Es un Server Component: buscar y paginar son navegaciones (`?q=` y
 * `?pagina=` en la URL), así que el filtro lo resuelve la base sobre todas
 * las funciones publicadas, no el navegador sobre las que ya llegaron. Por la
 * misma razón, cualquier búsqueda se puede compartir o recargar.
 *
 * Resuelve dos estados además de "con datos":
 * - sin resultados: hay una búsqueda y ninguna función coincide. Ofrece
 *   sacar el filtro. No es el vacío (no hay funciones): ese lo decide la
 *   página antes de renderizar esto.
 * - página fuera de rango: un `?pagina=` más allá de la última (un link viejo,
 *   o funciones que ya empezaron desde que se abrió). Ofrece volver a la
 *   primera página de la misma búsqueda, en vez de una grilla vacía.
 */
import Link from "next/link";

import Campo from "@/components/Campo";
import SinDatos from "@/components/SinDatos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LARGO_MAXIMO_BUSQUEDA } from "@/lib/schemas/funcion";

export type FuncionDeCartelera = {
  id: string;
  titulo: string;
  sala: string;
  horario: string;
  clasificacion: string;
  categoria: string;
  imagenUrl: string | null;
};

type Props = {
  funciones: FuncionDeCartelera[];
  q: string | undefined;
  pagina: number;
  hayMas: boolean;
};

/** La dirección de una página de la cartelera, conservando la búsqueda. */
function hrefDePagina(q: string | undefined, pagina: number) {
  const parametros = new URLSearchParams();
  if (q) parametros.set("q", q);
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const query = parametros.toString();
  return query ? `/cartelera?${query}` : "/cartelera";
}

export default function BuscadorCartelera({ funciones, q, pagina, hayMas }: Props) {
  return (
    <div className="mt-6">
      {/* Un GET común: la búsqueda queda en la URL y arranca de la primera página. */}
      <form action="/cartelera" role="search" className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {/* `Campo` envuelve label e input en un bloque: el bloque crece y el
            botón se alinea con el input por `sm:items-end`. */}
        <div className="sm:flex-1">
          <Campo
            etiqueta="Buscar por película"
            nombre="q"
            type="search"
            defaultValue={q ?? ""}
            maxLength={LARGO_MAXIMO_BUSQUEDA}
            placeholder="Título de la película"
          />
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          Buscar
        </Button>
      </form>

      {funciones.length === 0 ? (
        pagina > 1 ? (
          <div className="mt-6">
            <SinDatos
              titulo="Esta página de la cartelera no tiene funciones"
              explicacion="Puede que el link sea viejo o que algunas funciones ya hayan empezado."
              accion={{ etiqueta: "Ir a la primera página", href: hrefDePagina(q, 1) }}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-3" role="status">
            <p className="text-sm wrap-anywhere">
              Ninguna función coincide con <strong>“{q}”</strong>.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href="/cartelera">Ver toda la cartelera</Link>
            </Button>
          </div>
        )
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {funciones.map((funcion) => (
              <li key={funcion.id}>
                {/* `pt-0`: la tarjeta siempre arranca con el póster (o su lugar vacío), pegado al borde. */}
                {/* `relative` + el `after:` del link: toda la tarjeta es el link a la
                    función, pero el lector de pantalla anuncia un solo link, con el título. */}
                <Card className="relative h-full pt-0 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                  {funcion.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL dinámica del bucket de Storage (`SUPABASE_URL`), sin dominio fijo para configurar en next.config.
                    <img
                      src={funcion.imagenUrl}
                      alt={`Póster de ${funcion.titulo}`}
                      className="aspect-2/3 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div aria-hidden="true" className="aspect-2/3 w-full bg-muted" />
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">
                      <Link
                        href={`/funciones/${funcion.id}`}
                        className="outline-none after:absolute after:inset-0 hover:underline"
                      >
                        {funcion.titulo}
                        {/* Hay varias funciones de la misma película: sin esto, el lector
                            anunciaría varios links iguales. */}
                        <span className="sr-only">
                          , {funcion.sala}, {funcion.horario}
                        </span>
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {funcion.sala} · {funcion.horario}
                    </CardDescription>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{funcion.clasificacion}</Badge>
                      <Badge variant="outline">{funcion.categoria}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>

          {(pagina > 1 || hayMas) && (
            <nav
              aria-label="Páginas de la cartelera"
              className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between"
            >
              {pagina > 1 && (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={hrefDePagina(q, pagina - 1)}>Ver funciones más próximas</Link>
                </Button>
              )}
              {hayMas && (
                <Button asChild className="w-full sm:ml-auto sm:w-auto">
                  <Link href={hrefDePagina(q, pagina + 1)}>Ver más funciones</Link>
                </Button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
