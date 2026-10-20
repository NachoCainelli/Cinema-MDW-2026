/**
 * Helpers sin dependencias, compartidos por cualquier capa.
 */

/** Une clases de Tailwind resolviendo conflictos. Lo usan los componentes de shadcn/ui. */
export { cn } from "cn";

/**
 * Fecha y hora en formato argentino, con la zona horaria explícita: sin ella,
 * el servidor (UTC en Vercel) y el navegador mostrarían horas distintas para
 * el mismo instante.
 */
export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
