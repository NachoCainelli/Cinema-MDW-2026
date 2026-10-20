/**
 * Detalle de una compra del usuario de la sesión (H4).
 *
 * Mismo orden y mismo criterio que `GET /api/compras/:id`: sesión (login),
 * rol (404, ver `app/(app)/compras/page.tsx`), id (404) y recién ahí la
 * consulta, con el id del usuario adentro del `where`. Una compra ajena no se
 * lee y después se rechaza con un `if`: para esta consulta no existe, y se ve
 * exactamente igual que una inexistente.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import EstadoCompra from "@/components/EstadoCompra";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obtenerUsuario } from "@/lib/auth";
import { obtenerCompraDeUsuario } from "@/lib/db/compras";
import { ErrorNoEncontrado } from "@/lib/errores";
import { compraIdSchema } from "@/lib/schemas/compra";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalle de compra · Cinema MDW 2026",
};

async function buscarCompra(id: string, usuarioId: string) {
  try {
    return await obtenerCompraDeUsuario(id, usuarioId);
  } catch (error) {
    // Solo el 404 de negocio se vuelve `notFound()`; cualquier otra falla
    // (base caída, etc.) sigue de largo hasta el error del framework.
    if (error instanceof ErrorNoEncontrado) notFound();
    throw error;
  }
}

export default async function DetalleCompra({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const usuario = await obtenerUsuario();
  if (!usuario) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/compras/${id}`)}`);
  }
  if (usuario.rol !== "USUARIO") notFound();

  const compraId = compraIdSchema.safeParse(id);
  if (!compraId.success) notFound();

  const compra = await buscarCompra(compraId.data, usuario.id);
  const funcion = compra.entradas[0]?.funcion;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Button asChild variant="link" className="px-0">
        <Link href="/compras">← Volver a mis compras</Link>
      </Button>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">{funcion?.pelicula.titulo ?? "Compra"}</CardTitle>
          <CardDescription>Comprada el {formatearFecha(compra.creadaEn)}</CardDescription>
          <CardAction>
            <EstadoCompra estado={compra.estado} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Sala</dt>
            <dd>{funcion?.sala.nombre ?? "—"}</dd>
            <dt className="text-muted-foreground">Función</dt>
            <dd>{funcion ? formatearFecha(funcion.inicio) : "—"}</dd>
          </dl>

          <h2 className="mt-6 font-semibold">Entradas ({compra.entradas.length})</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {compra.entradas.map((entrada) => (
              <li key={entrada.id}>
                <Badge variant="outline">
                  Fila {entrada.butaca.fila} · Butaca {entrada.butaca.columna}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
