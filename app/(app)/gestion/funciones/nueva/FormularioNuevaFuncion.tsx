/**
 * El formulario de creación de una función.
 *
 * Los dos errores van en dos lugares: el rechazo de la regla de negocio
 * (`estado.mensaje`, el solapamiento con otra función de la sala) ARRIBA, en
 * un `Alert`, porque puede que no se arregle tocando un campo; los errores de
 * validación (`estado.errores`, el 400), DEBAJO de cada campo, con `Campo`.
 *
 * Si la acción falla, React resetea el formulario y los controles vuelven a
 * su `defaultValue`, que sale de `estado.valores`: así no se vacía. El `key`
 * con el estado hace que el `Select` de Radix —que guarda su valor adentro—
 * se vuelva a montar con el valor devuelto en vez de quedarse con el reseteo.
 */
"use client";

import Link from "next/link";
import { useActionState } from "react";

import Campo from "@/components/Campo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SIN_ENVIAR } from "@/lib/formularios";

import { crearFuncionAction } from "./acciones";

export type Opcion = { id: string; texto: string };

export default function FormularioNuevaFuncion({
  peliculas,
  salas,
}: {
  peliculas: Opcion[];
  salas: Opcion[];
}) {
  const [estado, enviar, pendiente] = useActionState(crearFuncionAction, SIN_ENVIAR);

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {estado.mensaje ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo crear la función</AlertTitle>
          <AlertDescription>
            <p>{estado.mensaje}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <Campo
        etiqueta="Película"
        nombre="peliculaId"
        required
        errores={estado.errores?.peliculaId}
        ayuda="Solo se listan las películas en cartelera."
        control={({ name, ...conexiones }) => (
          <Select
            key={`pelicula-${estado.valores?.peliculaId ?? ""}`}
            name={name}
            defaultValue={estado.valores?.peliculaId || undefined}
            required
          >
            <SelectTrigger {...conexiones} className="w-full">
              <SelectValue placeholder="Elegí una película" />
            </SelectTrigger>
            <SelectContent>
              {peliculas.map((pelicula) => (
                <SelectItem key={pelicula.id} value={pelicula.id}>
                  {pelicula.texto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <Campo
        etiqueta="Sala"
        nombre="salaId"
        required
        errores={estado.errores?.salaId}
        control={({ name, ...conexiones }) => (
          <Select
            key={`sala-${estado.valores?.salaId ?? ""}`}
            name={name}
            defaultValue={estado.valores?.salaId || undefined}
            required
          >
            <SelectTrigger {...conexiones} className="w-full">
              <SelectValue placeholder="Elegí una sala" />
            </SelectTrigger>
            <SelectContent>
              {salas.map((sala) => (
                <SelectItem key={sala.id} value={sala.id}>
                  {sala.texto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <Campo
        etiqueta="Inicio"
        nombre="inicio"
        type="datetime-local"
        required
        defaultValue={estado.valores?.inicio}
        errores={estado.errores?.inicio}
        ayuda="Hora de Buenos Aires. Entre una función y la siguiente de la misma sala tienen que quedar al menos 15 minutos."
      />

      <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" disabled={pendiente} className="w-full sm:w-auto">
          {pendiente ? "Guardando…" : "Crear función"}
        </Button>
        <Button asChild variant="ghost" className="w-full sm:w-auto">
          <Link href="/cartelera">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
