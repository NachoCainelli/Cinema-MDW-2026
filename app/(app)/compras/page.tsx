/**
 * Mis compras (H4): historial del usuario de la sesión.
 *
 * Server Component que lee directo de `lib/db/`, con el mismo criterio que
 * `GET /api/compras`: sin sesión se va al login, y un rol que no es `USUARIO`
 * ve un 404 (la API le da 403; una página no tiene nada que explicarle a
 * quien no compra entradas y así no revela que la ruta existe para otros).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import FiltroCompras, { type CompraDelListado } from "@/components/FiltroCompras";
import SinDatos from "@/components/SinDatos";
import { Button } from "@/components/ui/button";
import { obtenerUsuario } from "@/lib/auth";
import { funcionYaEmpezo } from "@/lib/butacas";
import { listarComprasDeUsuario } from "@/lib/db/compras";
import { urlDeIngreso } from "@/lib/navegacion";
import { historialQuerySchema } from "@/lib/schemas/compra";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mis compras · Cinema MDW 2026",
};

export default async function MisCompras() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(urlDeIngreso("/compras"));
  if (usuario.rol !== "USUARIO") notFound();

  // El id sale de la sesión, nunca de la URL.
  const compras = await listarComprasDeUsuario(usuario.id, historialQuerySchema.parse({}));

  // Todo lo que cruza al componente cliente va ya formateado y serializable:
  // fechas como string y "si ya pasó" resuelto acá, con el reloj del servidor.
  const ahora = new Date();
  const listado: CompraDelListado[] = compras.map((compra) => {
    // Una compra es siempre de una sola función (`crearCompraSchema` tiene un
    // único `funcionId`), así que alcanza con la de la primera entrada.
    const funcion = compra.entradas[0]?.funcion;
    return {
      id: compra.id,
      fechaCompra: formatearFecha(compra.creadaEn),
      peliculas: [...new Set(compra.entradas.map((e) => e.funcion.pelicula.titulo))].join(", "),
      sala: funcion?.sala.nombre ?? "—",
      horario: funcion ? formatearFecha(funcion.inicio) : "—",
      cantidadEntradas: compra.entradas.length,
      esProxima: funcion ? !funcionYaEmpezo(funcion.inicio, ahora) : false,
    };
  });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Button asChild variant="link" className="px-0">
        <Link href="/">← Volver al inicio</Link>
      </Button>
      <h1 className="mt-4 text-2xl font-bold">Mis compras</h1>

      {listado.length === 0 ? (
        <div className="mt-6">
          <SinDatos
            titulo="Todavía no compraste entradas"
            explicacion="Cuando compres, tus entradas van a aparecer acá."
          />
        </div>
      ) : (
        <FiltroCompras compras={listado} />
      )}
    </main>
  );
}
