/**
 * Login propio (paso 3 del mapa de pantallas, docs/spec.md §5), en lugar de la
 * página genérica de Auth.js. `lib/auth.ts` la declara en `pages.signIn`, así
 * que cualquier redirección de Auth.js termina acá.
 *
 * Server Component sin `"use client"`: los dos botones son formularios con
 * Server Actions. El formulario no manda `rol` ni nada parecido: el rol sale
 * de la base al iniciar sesión (ADR 0003, `AGENTS.md` Seguridad).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obtenerUsuario, signIn } from "@/lib/auth";
import { urlDeIngreso } from "@/lib/navegacion";
import { callbackUrlSchema } from "@/lib/schemas/usuario";

export const metadata: Metadata = {
  title: "Ingresar · Cinema MDW 2026",
};

// El `error` de la URL elige uno de estos textos y nunca se muestra tal cual:
// lo escribe cualquiera que arme el link. Credenciales mal no dice cuál de las
// dos falló, para no confirmar qué emails tienen cuenta.
const MENSAJE_DE_ERROR: Record<string, string> = {
  CredentialsSignin: "El email o la contraseña no son correctos.",
};
const MENSAJE_DE_ERROR_GENERICO = "No pudimos iniciar sesión. Probá de nuevo.";

type Parametros = Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;

export default async function Ingresar({ searchParams }: { searchParams: Parametros }) {
  const { callbackUrl, error } = await searchParams;
  const destino = callbackUrlSchema.parse(callbackUrl);

  if (await obtenerUsuario()) redirect(destino);

  const mensajeDeError = error
    ? (MENSAJE_DE_ERROR[String(error)] ?? MENSAJE_DE_ERROR_GENERICO)
    : null;

  // `destino` viaja en el cierre de las acciones, no en un campo oculto: Next
  // lo cifra, así que el formulario no lo puede cambiar.
  async function ingresarConGoogle() {
    "use server";
    await signIn("google", { redirectTo: destino });
  }

  async function ingresarConEmail(formData: FormData) {
    "use server";
    try {
      // `authorize` (lib/auth.ts) valida el email y la contraseña con
      // `credencialesSchema`: un formato inválido es un login fallido más.
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: destino,
      });
    } catch (error) {
      // El login exitoso también "lanza" (el redirect de Next): solo se
      // atrapa el error de Auth.js y se vuelve a esta misma pantalla.
      if (error instanceof AuthError) redirect(`${urlDeIngreso(destino)}&error=${error.type}`);
      throw error;
    }
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
          {mensajeDeError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {mensajeDeError}
            </p>
          )}

          <form action={ingresarConGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              Ingresar con Google
            </Button>
          </form>

          <form action={ingresarConEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Ingresar con email
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
