/**
 * Cartelera pública (paso 4 del flujo, `docs/spec.md` §5): las funciones que
 * todavía no empezaron, con o sin sesión.
 *
 * Server Component que lee directo de `lib/db/funciones.ts`, con el mismo
 * criterio que `GET /api/funciones`: solo funciones futuras de salas vigentes
 * y películas en cartelera, con `camposDeFuncionPublicos`. No pasa por la API
 * propia, igual que `app/(app)/compras/page.tsx`.
 *
 * La búsqueda (`?q=`) y la página (`?pagina=`) viajan en la URL y se validan
 * con `carteleraQuerySchema`, el mismo schema que `GET /api/funciones`. Un
 * valor inválido escrito a mano en la URL no es un error de la pantalla: se
 * ignora ese valor y no los demás. Una `?pagina=` inválida vuelve a la primera
 * página de la misma búsqueda; una `?q=` inválida muestra la cartelera desde
 * el principio.
 *
 * Los cinco estados:
 *   cargando        `loading.tsx`
 *   con datos       `BuscadorCartelera`, con "Ver más funciones" si hay otra página
 *   vacío           acá, con `SinDatos`: sin búsqueda, 0 funciones en la primera página
 *   sin resultados  `BuscadorCartelera`: hay búsqueda y ninguna función coincide
 *                   (también resuelve una `?pagina=` más allá de la última)
 *   error           `error.tsx`
 */
import type { Metadata } from "next";

import BuscadorCartelera, { type FuncionDeCartelera } from "@/components/BuscadorCartelera";
import SinDatos from "@/components/SinDatos";
import { listarCartelera } from "@/lib/db/funciones";
import { carteleraQuerySchema } from "@/lib/schemas/funcion";
import { ETIQUETAS_DE_CATEGORIA, ETIQUETAS_DE_CLASIFICACION, formatearFecha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cartelera · Cinema MDW 2026",
};

// Hoy el layout de `(public)` lee la sesión y eso ya vuelve dinámica la
// página, pero la cartelera no puede depender de un detalle del layout: si se
// prerenderizara en el build, quedaría congelada con las funciones de ese
// momento hasta el próximo deploy.
export const dynamic = "force-dynamic";

type Parametros = Promise<{ q?: string | string[]; pagina?: string | string[] }>;

export default async function Cartelera({ searchParams }: { searchParams: Parametros }) {
  const { q, pagina } = await searchParams;
  // `limite` no se lee de la URL: el tamaño de página de la pantalla es el por defecto.
  // Primero los dos; si falla, solo la búsqueda (para no perder un `q` válido
  // por un `pagina` roto); si también falla, los valores por defecto.
  const leido = carteleraQuerySchema.safeParse({ q, pagina });
  const soloBusqueda = leido.success ? leido : carteleraQuerySchema.safeParse({ q });
  const query = soloBusqueda.success ? soloBusqueda.data : carteleraQuerySchema.parse({});

  const { funciones, hayMas } = await listarCartelera(query);

  // Lo que baja al buscador va ya listo para mostrar: la fecha se formatea una
  // vez, acá, con la zona horaria del cine, y los enums pasan a su texto.
  const listado: FuncionDeCartelera[] = funciones.map((funcion) => ({
    id: funcion.id,
    titulo: funcion.pelicula.titulo,
    sala: funcion.sala.nombre,
    horario: formatearFecha(funcion.inicio),
    clasificacion: ETIQUETAS_DE_CLASIFICACION[funcion.pelicula.clasificacion],
    categoria: ETIQUETAS_DE_CATEGORIA[funcion.pelicula.categoria],
    imagenUrl: funcion.pelicula.imagenUrl,
  }));

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Cartelera</h1>
      <p className="mt-1 text-sm text-muted-foreground">Las próximas funciones del cine.</p>

      {listado.length === 0 && !query.q && query.pagina === 1 ? (
        <div className="mt-6">
          <SinDatos
            titulo="No hay funciones programadas por ahora"
            explicacion="Cuando se publique una función nueva, va a aparecer acá."
          />
        </div>
      ) : (
        <BuscadorCartelera
          funciones={listado}
          q={query.q}
          pagina={query.pagina}
          hayMas={hayMas}
        />
      )}
    </main>
  );
}
