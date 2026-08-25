/**
 * Home del proyecto.
 *
 * Placeholder mientras se construye la cartelera pública (H3/H4, ver
 * docs/spec.md). El ejemplo de Nota que vivía acá se borró en la clase 3
 * junto con el resto de ese scaffolding (lib/db/notas.ts, lib/schemas/nota.ts,
 * app/api/notas/route.ts).
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Cinema MDW 2026</h1>
      <p className="mt-2 text-sm opacity-70">
        Equipo: completar en el README y acá.
      </p>

      <section className="mt-8 rounded-lg border border-dashed p-6">
        <h2 className="text-lg font-semibold">Cartelera pública — próximamente</h2>
        <p className="mt-2 text-sm opacity-80">
          Acá va a verse la cartelera de funciones (H3) y la compra de entradas
          (H4) una vez que estén implementadas.
        </p>
      </section>
    </main>
  );
}
