/**
 * Crear función (H3, paso 1 del flujo en `docs/spec.md` §5).
 *
 * El Server Component resuelve quién mira y trae las películas en cartelera y
 * las salas no eliminadas, las mismas que `GET /api/peliculas` y
 * `GET /api/salas`. El formulario recibe solo lo que necesita para armar los
 * selects: id y texto.
 *
 * Sin sesión se va al login; un rol que no es `GESTOR_CARTELERA` ve un 404,
 * con el mismo criterio que `/sistema`: no hay nada que explicarle y así no se
 * revela que la ruta existe. Esto es para no mostrarle un formulario que no
 * puede enviar; quien defiende la escritura es la acción.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import SinDatos from "@/components/SinDatos";
import { obtenerUsuario } from "@/lib/auth";
import { listarPeliculas } from "@/lib/db/peliculas";
import { listarSalas } from "@/lib/db/salas";
import { urlDeIngreso } from "@/lib/navegacion";

import FormularioNuevaFuncion from "./FormularioNuevaFuncion";

export const metadata: Metadata = {
  title: "Nueva función · Cinema MDW 2026",
};

// El máximo que aceptan `peliculasQuerySchema` y `salasQuerySchema`.
const LIMITE_DE_OPCIONES = 100;

export default async function NuevaFuncion() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(urlDeIngreso("/gestion/funciones/nueva"));
  if (usuario.rol !== "GESTOR_CARTELERA") notFound();

  const [peliculas, salas] = await Promise.all([
    listarPeliculas({ limite: LIMITE_DE_OPCIONES }),
    listarSalas({ limite: LIMITE_DE_OPCIONES }),
  ]);

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Nueva función</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Elegí la película, la sala y el horario. Apenas la guardes, la función aparece en la
        cartelera.
      </p>

      <div className="mt-6">
        {peliculas.length === 0 || salas.length === 0 ? (
          <SinDatos
            titulo={
              peliculas.length === 0 ? "No hay películas en cartelera" : "No hay salas disponibles"
            }
            explicacion="Para crear una función hace falta al menos una película en cartelera y una sala. Pedile al equipo que las cargue."
          />
        ) : (
          <FormularioNuevaFuncion
            peliculas={peliculas.map((pelicula) => ({
              id: pelicula.id,
              texto: `${pelicula.titulo} · ${pelicula.duracionMinutos} min`,
            }))}
            salas={salas.map((sala) => ({ id: sala.id, texto: sala.nombre }))}
          />
        )}
      </div>
    </main>
  );
}
