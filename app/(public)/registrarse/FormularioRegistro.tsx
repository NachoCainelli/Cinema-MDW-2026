/**
 * El formulario de registro.
 *
 * Los dos errores van en dos lugares: el email repetido (`estado.mensaje`, el
 * 409) ARRIBA, con un link para ingresar, porque no se arregla corrigiendo un
 * campo; los de validación (`estado.errores`, el 400) DEBAJO de cada campo,
 * con `Campo`.
 *
 * Si la acción falla, React resetea el formulario y los campos vuelven a su
 * `defaultValue`, que sale de `estado.valores`: nombre y email se conservan.
 * La contraseña no vuelve —la acción no la devuelve— y hay que escribirla de
 * nuevo.
 */
"use client";

import Link from "next/link";
import { useActionState } from "react";

import Campo from "@/components/Campo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SIN_ENVIAR, type EstadoDelFormulario } from "@/lib/formularios";

type Props = {
  /** `registrarseAction` con el destino ya atado por la página. */
  registrarse: (estado: EstadoDelFormulario, formData: FormData) => Promise<EstadoDelFormulario>;
};

export default function FormularioRegistro({ registrarse }: Props) {
  const [estado, enviar, pendiente] = useActionState(registrarse, SIN_ENVIAR);

  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.mensaje ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo crear la cuenta</AlertTitle>
          <AlertDescription>
            <p>{estado.mensaje}</p>
            {estado.enlace ? (
              <Link href={estado.enlace.href} className="font-medium underline underline-offset-4">
                {estado.enlace.texto}
              </Link>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Campo
        etiqueta="Nombre"
        nombre="nombre"
        autoComplete="name"
        required
        defaultValue={estado.valores?.nombre}
        errores={estado.errores?.nombre}
      />
      <Campo
        etiqueta="Email"
        nombre="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={estado.valores?.email}
        errores={estado.errores?.email}
      />
      <Campo
        etiqueta="Contraseña"
        nombre="password"
        type="password"
        autoComplete="new-password"
        required
        ayuda="Al menos 8 caracteres."
        errores={estado.errores?.password}
      />

      <Button
        type="submit"
        // Deshabilitado mientras guarda: un doble clic no crea dos cuentas.
        disabled={pendiente}
        className="w-full"
      >
        {pendiente ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
