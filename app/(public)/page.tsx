/**
 * Home del proyecto.
 *
 * La home no es la cartelera (mapa de pantallas, `docs/spec.md` §5): la
 * cartelera tiene su propia dirección, `/cartelera`, y la home la ofrece como
 * acción principal. El link fijo del encabezado lleva al mismo lugar desde
 * cualquier pantalla.
 */
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Cinema MDW 2026</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mirá las próximas funciones y comprá tus entradas eligiendo la butaca.
      </p>

      <Button asChild className="mt-6 w-full sm:w-auto">
        <Link href="/cartelera">Ver la cartelera</Link>
      </Button>
    </main>
  );
}
