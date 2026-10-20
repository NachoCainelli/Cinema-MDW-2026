import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Mismo contenido para la compra que no existe y para la ajena: igual que el
 * 404 de `GET /api/compras/:id`, no tiene que haber forma de distinguirlas.
 */
export default function CompraNoEncontrada() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Compra no encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">La compra que buscás no existe.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/compras">← Volver a mis compras</Link>
      </Button>
    </main>
  );
}
