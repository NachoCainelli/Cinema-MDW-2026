/**
 * El estado vacío, escrito una sola vez.
 *
 * La estructura y el estilo vienen de `Empty` (`components/ui/empty.tsx`);
 * `SinDatos` fija la API —título, explicación y una acción opcional— para que
 * todas las pantallas lo usen igual. Una lista vacía no es una pantalla en
 * blanco: dice qué falta y, si hay algo que hacer al respecto, lo ofrece como
 * un link. La acción es siempre una navegación (no un `onClick`), así el
 * componente sigue siendo de servidor.
 */
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

type Props = {
  titulo: string;
  explicacion: string;
  accion?: { etiqueta: string; href: string };
};

export default function SinDatos({ titulo, explicacion, accion }: Props) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{titulo}</EmptyTitle>
        <EmptyDescription>{explicacion}</EmptyDescription>
      </EmptyHeader>
      {accion && (
        <EmptyContent>
          <Button asChild size="sm">
            <Link href={accion.href}>{accion.etiqueta}</Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
