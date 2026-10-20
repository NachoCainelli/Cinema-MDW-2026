/**
 * Sistema visual (issue #74): cada componente con todos sus estados al lado.
 *
 * Es una pantalla interna del equipo, fuera del flujo principal: sirve para
 * revisar contraste, foco visible y "ningún estado solo con color" en un solo
 * lugar. Todo es con datos fijos; no consulta la base ni hace fetch.
 *
 * Solo la abre el staff. Sin sesión se va al login; un `USUARIO` ve un 404 y
 * no un 403, con el mismo criterio que `/compras` (ver
 * `app/(app)/compras/page.tsx`): no hay nada que explicarle a quien no es del
 * equipo, y así no se revela que la ruta existe.
 */
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import EstadoCompra, { ESTADOS_DE_COMPRA } from "@/components/EstadoCompra";
import SinDatos from "@/components/SinDatos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { obtenerUsuario } from "@/lib/auth";
import { formatearFecha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sistema visual · Cinema MDW 2026",
};

const VARIANTES_DE_BUTTON = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;
const TAMANOS_DE_BUTTON = ["xs", "sm", "default", "lg"] as const;
const TAMANOS_DE_BUTTON_ICONO = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const;
const VARIANTES_DE_BADGE = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
] as const;

// Datos fijos: el segundo caso existe para ver que un texto larguísimo (con
// y sin espacios) no rompe el layout a 375px.
const COMPRAS_DE_EJEMPLO = [
  {
    pelicula: "El secreto de sus ojos",
    sala: "Sala 1",
    horario: new Date("2026-11-14T21:30:00-03:00"),
    cantidadEntradas: 2,
    estado: "PAGADA",
  },
  {
    pelicula:
      "La increíble y triste historia de la cándida Eréndira y de su abuela desalmada, versión extendida del director con escenas inéditas Supercalifragilisticoespialidosoextraordinariamentelarguísimo",
    sala: "Sala 3 — Gran formato con sonido envolvente",
    horario: new Date("2026-11-15T18:00:00-03:00"),
    cantidadEntradas: 1,
    estado: "PAGADA",
  },
] as const;

export default async function Sistema() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/sistema")}`);
  if (usuario.rol !== "ADMINISTRADOR" && usuario.rol !== "GESTOR_CARTELERA") notFound();

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Sistema visual</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cada componente con todos sus estados, con datos fijos.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Button</h2>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {VARIANTES_DE_BUTTON.map((variante) => (
              <Button key={variante} variant={variante}>
                {variante}
              </Button>
            ))}
            <Button disabled>disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TAMANOS_DE_BUTTON.map((tamano) => (
              <Button key={tamano} size={tamano}>
                {tamano}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TAMANOS_DE_BUTTON_ICONO.map((tamano) => (
              <Button key={tamano} size={tamano} aria-label={`Agregar (${tamano})`}>
                <Plus />
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Badge</h2>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {VARIANTES_DE_BADGE.map((variante) => (
              <Badge key={variante} variant={variante}>
                {variante}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ESTADOS_DE_COMPRA.map((estado) => (
              <EstadoCompra key={estado} estado={estado} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Skeleton</h2>
        <Card className="mt-4" aria-hidden="true">
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">SinDatos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SinDatos
            titulo="Todavía no compraste entradas"
            explicacion="Cuando compres, tus entradas van a aparecer acá."
          />
          <SinDatos
            titulo="Todavía no compraste entradas"
            explicacion="Cuando compres, tus entradas van a aparecer acá."
            accion={{ etiqueta: "Volver al inicio", href: "/" }}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Alert</h2>
        <div className="mt-4 space-y-4">
          <Alert>
            <AlertTitle>Compra confirmada</AlertTitle>
            <AlertDescription>Tus entradas ya figuran en Mis compras.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No pudimos cargar las compras. No se perdió nada; probá de nuevo.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Input</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="sistema-input-normal" className="text-sm font-medium">
              Normal
            </label>
            <Input id="sistema-input-normal" defaultValue="Ana Pérez" />
          </div>
          <div className="space-y-1">
            <label htmlFor="sistema-input-placeholder" className="text-sm font-medium">
              Con placeholder
            </label>
            <Input id="sistema-input-placeholder" placeholder="nombre@ejemplo.com" />
          </div>
          <div className="space-y-1">
            <label htmlFor="sistema-input-disabled" className="text-sm font-medium">
              Deshabilitado
            </label>
            <Input id="sistema-input-disabled" defaultValue="No editable" disabled />
          </div>
          <div className="space-y-1">
            <label htmlFor="sistema-input-invalido" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="sistema-input-invalido"
              defaultValue="ana@"
              aria-invalid="true"
              aria-describedby="sistema-input-invalido-error"
            />
            <p id="sistema-input-invalido-error" className="text-sm text-destructive">
              El email no es válido.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Card de compra</h2>
        <ul className="mt-4 space-y-4">
          {COMPRAS_DE_EJEMPLO.map((compra) => (
            <li key={compra.pelicula}>
              <Card>
                <CardHeader>
                  <CardTitle className="min-w-0 wrap-anywhere">{compra.pelicula}</CardTitle>
                  <CardDescription className="min-w-0 wrap-anywhere">
                    {compra.sala} · {formatearFecha(compra.horario)}
                  </CardDescription>
                  <CardAction>
                    <EstadoCompra estado={compra.estado} />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {compra.cantidadEntradas}{" "}
                    {compra.cantidadEntradas === 1 ? "entrada" : "entradas"}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
