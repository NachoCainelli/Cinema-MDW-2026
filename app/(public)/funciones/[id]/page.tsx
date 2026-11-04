/**
 * Butacas de una función y compra (H4, pasos 5 a 7 del flujo en
 * `docs/spec.md` §5). Elegir y confirmar son la misma pantalla.
 *
 * Es pública: las butacas libres de una función publicada son parte de la
 * cartelera. Lo que cambia según quién mira es si puede elegir:
 *   USUARIO      el selector, con el botón de confirmar
 *   sin sesión   el mapa para mirar y "Ingresá para comprar", que vuelve acá
 *   staff        el mapa para mirar: las entradas se compran con una cuenta de usuario
 * Esto es experiencia de uso. Quien autoriza la compra es la acción, que
 * vuelve a exigir el rol.
 *
 * Una función que no existe o que no está publicada (ya empezó, sala
 * eliminada, película dada de baja) responde 404, igual en los dos casos.
 *
 * No hay `loading.tsx` a propósito: esta página llama a `notFound()`, y con el
 * streaming que agrega ese archivo el 404 saldría con status 200 (la misma
 * razón por la que `/compras` y `/gestion/funciones/nueva` no lo tienen).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { obtenerUsuario } from "@/lib/auth";
import { listarButacasDeFuncionPublicada } from "@/lib/db/funciones";
import { ErrorNoEncontrado } from "@/lib/errores";
import { urlDeIngreso } from "@/lib/navegacion";
import { PRECIO_ENTRADA } from "@/lib/pagos";
import { funcionIdSchema } from "@/lib/schemas/funcion";
import { formatearFecha } from "@/lib/utils";

import { comprarEntradasAction } from "./acciones";
import MapaDeButacas from "./MapaDeButacas";
import SelectorDeButacas from "./SelectorDeButacas";

export const metadata: Metadata = {
  title: "Elegir butacas · Cinema MDW 2026",
};

async function buscarFuncion(id: string) {
  try {
    return await listarButacasDeFuncionPublicada(id);
  } catch (error) {
    // Solo el 404 de negocio se vuelve `notFound()`; cualquier otra falla
    // sigue de largo hasta `error.tsx`.
    if (error instanceof ErrorNoEncontrado) notFound();
    throw error;
  }
}

export default async function ButacasDeFuncion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const funcionId = funcionIdSchema.safeParse(id);
  if (!funcionId.success) notFound();

  const [{ funcion, butacas }, usuario] = await Promise.all([
    buscarFuncion(funcionId.data),
    obtenerUsuario(),
  ]);
  const libres = butacas.filter((butaca) => !butaca.ocupada).length;

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <Button asChild variant="link" className="px-0">
        <Link href="/cartelera">← Volver a la cartelera</Link>
      </Button>

      <div className="mt-2 flex gap-4">
        {funcion.pelicula.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL dinámica del bucket de Storage (`SUPABASE_URL`), sin dominio fijo para configurar en next.config.
          <img
            src={funcion.pelicula.imagenUrl}
            alt=""
            className="aspect-2/3 w-20 shrink-0 rounded-md object-cover sm:w-28"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold wrap-anywhere">{funcion.pelicula.titulo}</h1>
          <p className="mt-1 text-sm">
            {funcion.sala.nombre} · {formatearFecha(funcion.inicio)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline">{funcion.pelicula.clasificacion}</Badge>
            <Badge variant="outline">{funcion.pelicula.categoria}</Badge>
            <Badge variant="outline">{funcion.pelicula.duracionMinutos} min</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {libres === 0
              ? "No quedan butacas libres para esta función."
              : `${libres} ${libres === 1 ? "butaca libre" : "butacas libres"} de ${butacas.length}.`}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {usuario?.rol === "USUARIO" ? (
          <SelectorDeButacas
            butacas={butacas}
            precio={PRECIO_ENTRADA}
            // El id sale de la URL, no de un campo del formulario. Lo atado con
            // `.bind` igual viaja por el cliente sin cifrar y se puede cambiar:
            // lo que protege es `crearCompra`, que vuelve a validar la función.
            comprar={comprarEntradasAction.bind(null, funcion.id)}
          />
        ) : (
          <section aria-labelledby="titulo-butacas">
            <h2 id="titulo-butacas" className="text-lg font-semibold">
              Butacas
            </h2>
            <div className="mt-4">
              <MapaDeButacas butacas={butacas} />
            </div>
            <div className="mt-6 rounded-lg border p-4">
              {usuario ? (
                <p className="text-sm">
                  Estás con una cuenta del equipo del cine. Las entradas se compran con una cuenta de
                  usuario.
                </p>
              ) : (
                <>
                  <p className="text-sm">Para elegir tus butacas y comprar, ingresá con tu cuenta.</p>
                  <Button asChild className="mt-3 w-full sm:w-auto">
                    <Link href={urlDeIngreso(`/funciones/${funcion.id}`)}>Ingresá para comprar</Link>
                  </Button>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
