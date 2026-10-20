/**
 * El marco del encabezado, igual en las pantallas con y sin sesión: el nombre
 * del sistema a la izquierda (siempre lleva a la home) y, a la derecha, lo que
 * le pase cada grupo de rutas. Así el nombre y la salida no cambian de lugar
 * entre una pantalla y otra.
 */
import Link from "next/link";

export default function Encabezado({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-8 py-3">
        <Link
          href="/"
          className="rounded-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Cinema MDW 2026
        </Link>
        {children}
      </div>
    </header>
  );
}
