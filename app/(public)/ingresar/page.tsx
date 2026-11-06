/**
 * Login propio (paso 3 del mapa de pantallas, docs/spec.md §5), en lugar de la
 * página genérica de Auth.js. `lib/auth.ts` la declara en `pages.signIn`, así
 * que cualquier redirección de Auth.js termina acá.
 *
 * Server Component sin `"use client"`: el botón de Google es un formulario con
 * una Server Action inline, y el de email y contraseña es `FormularioIngreso`
 * con `ingresarAction`, que devuelve el error sin vaciar el email. Ninguno
 * manda `rol` ni nada parecido: el rol sale de la base al iniciar sesión
 * (ADR 0003, `AGENTS.md` Seguridad).
 *
 * El `?error=` de la URL sigue haciendo falta: con él vuelven las
 * redirecciones de Auth.js, p. ej. un login con Google que falló. No se pinta
 * acá: es el estado inicial de `FormularioIngreso`, así que hay un solo aviso
 * y el primer intento con email lo reemplaza en vez de sumarse.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerUsuario, signIn } from "@/lib/auth";
import { urlDeRegistro } from "@/lib/navegacion";
import { callbackUrlSchema } from "@/lib/schemas/usuario";

import { ingresarAction } from "./acciones";
import FormularioIngreso from "./FormularioIngreso";
import { mensajeDeErrorDeIngreso } from "./mensajes";

export const metadata: Metadata = {
  title: "Ingresar · Interamericana Cines",
};

type Parametros = Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;

export default async function Ingresar({ searchParams }: { searchParams: Parametros }) {
  const { callbackUrl, error } = await searchParams;
  const destino = callbackUrlSchema.parse(callbackUrl);

  if (await obtenerUsuario()) redirect(destino);

  const mensajeDeError = error ? mensajeDeErrorDeIngreso(String(error)) : null;

  // `destino` viaja en el cierre de la acción, no en un campo oculto: Next
  // lo cifra, así que el formulario no lo puede cambiar.
  async function ingresarConGoogle() {
    "use server";
    await signIn("google", { redirectTo: destino });
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Ingresar</h1>
          </CardTitle>
          <CardDescription>Con tu cuenta de Google o con tu email y contraseña.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={ingresarConGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              Ingresar con Google
            </Button>
          </form>

          <FormularioIngreso
            ingresar={ingresarAction.bind(null, destino)}
            mensajeInicial={mensajeDeError}
          />

          <p className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link
              href={urlDeRegistro(destino)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Creá una
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
