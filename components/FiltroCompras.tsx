"use client";

/**
 * Filtro "todas / próximas / pasadas" del historial de compras.
 *
 * Es el único componente cliente porque es lo único de la pantalla que
 * reacciona a un click sin ir al servidor. Recibe las compras ya leídas y
 * formateadas por la página: no consulta la base, no mira la sesión y no
 * compara fechas (si la función ya pasó lo decide el servidor, `esProxima`).
 */
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type CompraDelListado = {
  id: string;
  fechaCompra: string;
  peliculas: string;
  sala: string;
  horario: string;
  cantidadEntradas: number;
  esProxima: boolean;
};

const FILTROS = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "proximas", etiqueta: "Próximas" },
  { valor: "pasadas", etiqueta: "Pasadas" },
] as const;

type Filtro = (typeof FILTROS)[number]["valor"];

export default function FiltroCompras({ compras }: { compras: CompraDelListado[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const visibles = compras.filter((compra) => {
    if (filtro === "proximas") return compra.esProxima;
    if (filtro === "pasadas") return !compra.esProxima;
    return true;
  });

  return (
    <div className="mt-6">
      <div className="flex gap-2" role="group" aria-label="Filtrar compras">
        {FILTROS.map(({ valor, etiqueta }) => (
          <Button
            key={valor}
            size="sm"
            variant={filtro === valor ? "default" : "outline"}
            onClick={() => setFiltro(valor)}
            aria-pressed={filtro === valor}
          >
            {etiqueta}
          </Button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No hay compras en este filtro.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {visibles.map((compra) => (
            <li key={compra.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{compra.peliculas}</CardTitle>
                  <CardDescription>
                    {compra.sala} · {compra.horario}
                  </CardDescription>
                  <CardAction>
                    <Badge variant={compra.esProxima ? "default" : "secondary"}>
                      {compra.esProxima ? "Próxima" : "Pasada"}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    {compra.cantidadEntradas}{" "}
                    {compra.cantidadEntradas === 1 ? "entrada" : "entradas"} · comprada el{" "}
                    {compra.fechaCompra}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/compras/${compra.id}`}>Ver detalle</Link>
                  </Button>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
