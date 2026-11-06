/**
 * Registro público (H1, paso 3 del mapa de pantallas, docs/spec.md §5).
 *
 * Para cualquiera sin sesión. Con sesión no hay nada que registrar: vuelve a
 * donde iba, igual que `/ingresar`. Toda cuenta que se crea acá nace
 * `USUARIO`; las de staff las crea un administrador.
 *
 * Comparte el `callbackUrl` con `/ingresar`: quien llegó desde "Ingresá para
 * comprar" y no tenía cuenta se registra y vuelve a la función.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerUsuario } from "@/lib/auth";
import { urlDeIngreso } from "@/lib/navegacion";
import { callbackUrlSchema } from "@/lib/schemas/usuario";

import { registrarseAction } from "./acciones";
import FormularioRegistro from "./FormularioRegistro";

export const metadata: Metadata = {
  title: "Crear cuenta · Interamericana Cines",
};

type Parametros = Promise<{ callbackUrl?: string | string[] }>;

export default async function Registrarse({ searchParams }: { searchParams: Parametros }) {
  const { callbackUrl } = await searchParams;
  const destino = callbackUrlSchema.parse(callbackUrl);

  if (await obtenerUsuario()) redirect(destino);

  return (
    <main className="mx-auto max-w-sm p-4 sm:p-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Crear cuenta</h1>
          </CardTitle>
          <CardDescription>Para comprar entradas y ver tus compras.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormularioRegistro registrarse={registrarseAction.bind(null, destino)} />
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link
              href={urlDeIngreso(destino)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Ingresá
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
