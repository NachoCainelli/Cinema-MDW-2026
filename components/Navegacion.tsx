/**
 * Barra de las pantallas con sesión: dónde estoy, quién soy acá y cómo me voy.
 *
 * Server Component entero, sin `"use client"`: "Salir" es un formulario con
 * una Server Action, así que no necesita un evento del navegador y funciona
 * aun sin JavaScript.
 */
import Link from "next/link";

import Encabezado from "@/components/Encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut, type UsuarioSesion } from "@/lib/auth";
import { ETIQUETA_DE_ROL, linksDelRol } from "@/lib/navegacion";

export default function Navegacion({ usuario }: { usuario: UsuarioSesion }) {
  async function salir() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <Encabezado>
      <nav aria-label="Principal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {linksDelRol(usuario.rol).map((link) => (
          <Button key={link.href} asChild variant="link" className="px-0">
            <Link href={link.href}>{link.etiqueta}</Link>
          </Button>
        ))}

        <span className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate">{usuario.nombre || usuario.email}</span>
          <Badge variant="secondary">{ETIQUETA_DE_ROL[usuario.rol]}</Badge>
        </span>

        <form action={salir}>
          <Button type="submit" variant="outline" size="sm">
            Salir
          </Button>
        </form>
      </nav>
    </Encabezado>
  );
}
