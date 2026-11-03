/**
 * Cartelera pública (paso 4 del flujo, `docs/spec.md` §5): las funciones que
 * todavía no empezaron, con o sin sesión.
 *
 * Server Component que lee directo de `lib/db/funciones.ts`, con el mismo
 * criterio que `GET /api/funciones`: solo funciones futuras de salas vigentes
 * y películas en cartelera, con `camposDeFuncionPublicos`. No pasa por la API
 * propia, igual que `app/(app)/compras/page.tsx`.
 *
 * Los cinco estados:
 *   cargando        `loading.tsx`
 *   con datos       `BuscadorCartelera`
 *   vacío           acá, con `SinDatos`: lo sabe el servidor (0 funciones)
 *   sin resultados  `BuscadorCartelera`: lo sabe el cliente (lo que se buscó)
 *   error           `error.tsx`
 */
import type { Metadata } from "next";

import BuscadorCartelera, { type FuncionDeCartelera } from "@/components/BuscadorCartelera";
import SinDatos from "@/components/SinDatos";
import { listarCartelera } from "@/lib/db/funciones";
import { carteleraQuerySchema } from "@/lib/schemas/funcion";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cartelera · Cinema MDW 2026",
};

// Hoy el layout de `(public)` lee la sesión y eso ya vuelve dinámica la
// página, pero la cartelera no puede depender de un detalle del layout: si se
// prerenderizara en el build, quedaría congelada con las funciones de ese
// momento hasta el próximo deploy.
export const dynamic = "force-dynamic";

export default async function Cartelera() {
  const funciones = await listarCartelera(carteleraQuerySchema.parse({}));

  // Lo que cruza al componente cliente va ya formateado y serializable: la
  // fecha se formatea una vez, acá, con la zona horaria del cine.
  const listado: FuncionDeCartelera[] = funciones.map((funcion) => ({
    id: funcion.id,
    titulo: funcion.pelicula.titulo,
    sala: funcion.sala.nombre,
    horario: formatearFecha(funcion.inicio),
    clasificacion: funcion.pelicula.clasificacion,
    categoria: funcion.pelicula.categoria,
    imagenUrl: funcion.pelicula.imagenUrl,
  }));

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Cartelera</h1>
      <p className="mt-1 text-sm text-muted-foreground">Las próximas funciones del cine.</p>

      {listado.length === 0 ? (
        <div className="mt-6">
          <SinDatos
            titulo="No hay funciones programadas por ahora"
            explicacion="Cuando se publique una función nueva, va a aparecer acá."
          />
        </div>
      ) : (
        <BuscadorCartelera funciones={listado} />
      )}
    </main>
  );
}
