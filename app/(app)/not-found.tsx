import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * El 404 de todas las pantallas con sesión, dibujado adentro del grupo para
 * que lleve la barra y la persona tenga a dónde ir.
 *
 * Mismo texto para lo que no existe y para lo que es de otro: igual que el 404
 * de `GET /api/compras/:id`, no tiene que haber forma de distinguirlos. Por
 * eso no dice "permiso": "no tenés permiso para ver esta compra" contaría que
 * la compra existe.
 */
export default function NoEncontrado() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">No encontramos lo que buscás</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La dirección no existe o ya no está disponible.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">← Volver al inicio</Link>
      </Button>
    </main>
  );
}
