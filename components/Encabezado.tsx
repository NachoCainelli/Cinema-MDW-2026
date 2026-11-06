/**
 * El marco del encabezado, igual en las pantallas con y sin sesión: el logo
 * a la izquierda (siempre lleva a la home) y, a la derecha, lo que le pase cada
 * grupo de rutas. Así el logo y la salida no cambian de lugar entre una
 * pantalla y otra.
 *
 * Hay dos versiones del logo porque el tema sigue la preferencia del sistema:
 * la clara se ve con tema claro y la de negativo, con tema oscuro.
 */
import Image from "next/image";
import Link from "next/link";

export default function Encabezado({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-8 py-3">
        <Link
          href="/"
          aria-label="Interamericana Cines, ir al inicio"
          className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Image
            src="/branding/logo-horizontal.png"
            alt=""
            width={2500}
            height={509}
            priority
            className="h-9 w-auto dark:hidden"
          />
          <Image
            src="/branding/logo-horizontal-oscuro.png"
            alt=""
            width={2455}
            height={530}
            priority
            className="hidden h-9 w-auto dark:block"
          />
        </Link>
        {children}
      </div>
    </header>
  );
}
