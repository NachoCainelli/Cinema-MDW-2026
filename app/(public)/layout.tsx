/**
 * Pantallas que se ven con o sin sesión (home, privacidad, ingresar).
 *
 * El encabezado no tiene barra de usuario ni "Salir": una pantalla que se
 * puede abrir sin sesión no promete una salida. Con sesión muestra los links
 * del rol para volver a su parte del sistema; sin sesión, "Ingresar".
 */
import Link from "next/link";

import Encabezado from "@/components/Encabezado";
import { Button } from "@/components/ui/button";
import { obtenerUsuario } from "@/lib/auth";
import { linksDelRol } from "@/lib/navegacion";

export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  const usuario = await obtenerUsuario();
  const links = usuario ? linksDelRol(usuario.rol) : [{ href: "/ingresar", etiqueta: "Ingresar" }];

  return (
    <>
      <Encabezado>
        <nav aria-label="Principal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {links.map((link) => (
            <Button key={link.href} asChild variant="link" className="px-0">
              <Link href={link.href}>{link.etiqueta}</Link>
            </Button>
          ))}
        </nav>
      </Encabezado>
      {children}
    </>
  );
}
