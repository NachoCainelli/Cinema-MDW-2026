/**
 * El formulario de ingreso con email y contraseña.
 *
 * Un login rechazado (`estado.mensaje`) va ARRIBA: no es un error de un campo
 * —no se dice cuál de los dos falló— y ponerlo debajo de uno sugeriría que sí.
 *
 * El error que trae la URL (`?error=`, p. ej. un login con Google que falló)
 * entra como `mensajeInicial` y es el estado inicial: se pinta en el mismo
 * lugar, y el primer envío lo reemplaza, así nunca hay dos avisos a la vez.
 *
 * Si la acción falla, React resetea el formulario y los campos vuelven a su
 * `defaultValue`: el email sale de `estado.valores` y se conserva. La
 * contraseña no vuelve —la acción no la devuelve— y hay que escribirla de
 * nuevo.
 */
"use client";

import { useActionState } from "react";

import Campo from "@/components/Campo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SIN_ENVIAR, type EstadoDelFormulario } from "@/lib/formularios";

type Props = {
  /** `ingresarAction` con el destino ya atado por la página. */
  ingresar: (estado: EstadoDelFormulario, formData: FormData) => Promise<EstadoDelFormulario>;
  /** El error con el que volvió una redirección de Auth.js (`?error=`), ya traducido. */
  mensajeInicial: string | null;
};

export default function FormularioIngreso({ ingresar, mensajeInicial }: Props) {
  const estadoInicial: EstadoDelFormulario = mensajeInicial
    ? { ok: false, mensaje: mensajeInicial }
    : SIN_ENVIAR;
  const [estado, enviar, pendiente] = useActionState(ingresar, estadoInicial);

  return (
    <form action={enviar} className="space-y-4">
      {estado.mensaje ? (
        <Alert variant="destructive">
          <AlertTitle>No pudiste ingresar</AlertTitle>
          <AlertDescription>
            <p>{estado.mensaje}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <Campo
        etiqueta="Email"
        nombre="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={estado.valores?.email}
      />
      <Campo
        etiqueta="Contraseña"
        nombre="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <Button
        type="submit"
        // Deshabilitado mientras corre: evita el doble envío.
        disabled={pendiente}
        className="w-full"
      >
        {pendiente ? "Ingresando…" : "Ingresar con email"}
      </Button>
    </form>
  );
}
