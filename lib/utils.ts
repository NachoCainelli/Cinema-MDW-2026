/**
 * Helpers sin dependencias, compartidos por cualquier capa.
 */

/** Une clases de Tailwind resolviendo conflictos. Lo usan los componentes de shadcn/ui. */
export { cn } from "cn";

/** La zona horaria del cine: con ella se muestran y se interpretan los horarios. */
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

/**
 * Fecha y hora en formato argentino, con la zona horaria explícita: sin ella,
 * el servidor (UTC en Vercel) y el navegador mostrarían horas distintas para
 * el mismo instante.
 */
export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convierte lo que manda un `<input type="datetime-local">` ("2026-11-10T20:30",
 * sin zona) en el instante que eso significa en el cine, en ISO con zona.
 *
 * Sin esto, `new Date("2026-11-10T20:30")` se interpreta en la zona del
 * proceso que lo lea: en Vercel (UTC) la función quedaría tres horas antes de
 * lo que el gestor eligió. El desfasaje se calcula con `Intl` para esa fecha y
 * no se fija en -03:00, para que siga andando si vuelve el horario de verano.
 *
 * Lo que no tiene ese formato vuelve tal cual: decidir si es válido le toca al
 * schema, que es el que sabe qué mensaje dar.
 */
export function desdeHoraDelCine(valor: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!partes) return valor;

  const [, anio, mes, dia, hora, minuto] = partes;
  // La misma hora de pared, pero leída como si fuera UTC; restándole el
  // desfasaje de la zona en ese momento queda el instante real.
  const comoSiFueraUtc = Date.UTC(
    Number(anio),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
  );
  const desfasaje = minutosDeDesfasaje(new Date(comoSiFueraUtc));
  return new Date(comoSiFueraUtc - desfasaje * 60 * 1000).toISOString();
}

/** Minutos que la zona del cine está corrida de UTC en ese instante (-180 en Argentina). */
function minutosDeDesfasaje(instante: Date): number {
  const nombre = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    timeZoneName: "longOffset",
  })
    .formatToParts(instante)
    .find((parte) => parte.type === "timeZoneName")?.value;

  // "GMT-03:00", o "GMT" a secas cuando la zona coincide con UTC.
  const desfasaje = /GMT([+-])(\d{2}):(\d{2})/.exec(nombre ?? "");
  if (!desfasaje) return 0;
  const [, signo, horas, minutos] = desfasaje;
  return (signo === "-" ? -1 : 1) * (Number(horas) * 60 + Number(minutos));
}
