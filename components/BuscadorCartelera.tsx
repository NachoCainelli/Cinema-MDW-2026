"use client";

/**
 * Listado de la cartelera con búsqueda por título de película.
 *
 * Es el único componente cliente de la pantalla porque es lo único que
 * reacciona a lo que se escribe sin ir al servidor: las funciones ya llegaron
 * con el HTML (con el límite de `listarCartelera`), así que filtrar no hace
 * ningún request.
 *
 * Resuelve el estado "sin resultados", que no es el vacío: el vacío (no hay
 * funciones) lo decide la página antes de renderizar esto; acá hay funciones
 * pero ninguna coincide con lo buscado, y eso solo lo sabe este componente.
 */
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FuncionDeCartelera = {
  id: string;
  titulo: string;
  sala: string;
  horario: string;
  clasificacion: string;
  categoria: string;
  imagenUrl: string | null;
};

export default function BuscadorCartelera({ funciones }: { funciones: FuncionDeCartelera[] }) {
  const [texto, setTexto] = useState("");
  const idBusqueda = useId();

  const termino = texto.trim().toLowerCase();
  const visibles = termino
    ? funciones.filter((funcion) => funcion.titulo.toLowerCase().includes(termino))
    : funciones;

  return (
    <div className="mt-6">
      <div className="space-y-2">
        <Label htmlFor={idBusqueda}>Buscar por película</Label>
        <Input
          id={idBusqueda}
          type="search"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Título de la película"
        />
      </div>

      {visibles.length === 0 ? (
        <div className="mt-6 space-y-3" role="status">
          <p className="text-sm">
            Ninguna función coincide con <strong>“{texto.trim()}”</strong>.
          </p>
          <Button variant="outline" size="sm" onClick={() => setTexto("")}>
            Ver toda la cartelera
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visibles.map((funcion) => (
            <li key={funcion.id}>
              {/* `pt-0`: la tarjeta siempre arranca con el póster (o su lugar vacío), pegado al borde. */}
              <Card className="h-full pt-0">
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
                  <CardTitle className="line-clamp-2">{funcion.titulo}</CardTitle>
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
      )}
    </div>
  );
}
