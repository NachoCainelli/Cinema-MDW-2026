/**
 * Qué muestra la barra de navegación según quién está mirando.
 *
 * Los links son cortesía, no seguridad: esconder "Mis compras" a un gestor no
 * le impide escribir la dirección. Quien decide qué se permite sigue siendo
 * cada página y cada endpoint en el servidor (`AGENTS.md`, Seguridad).
 *
 * Sin `import` de Prisma ni de Next: recibe el rol ya leído de la sesión.
 */
import type { Rol } from "@/lib/schemas/usuario";

export type LinkDeNavegacion = { href: string; etiqueta: string };

export const ETIQUETA_DE_ROL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR_CARTELERA: "Gestor de cartelera",
  USUARIO: "Usuario",
};

// La cartelera es el primer link para todos, con o sin sesión: así está "a un
// clic desde la home y siempre en el mismo lugar" (docs/spec.md §7, Recuerdo).
const CARTELERA: LinkDeNavegacion = { href: "/cartelera", etiqueta: "Cartelera" };

// Las pantallas de gestión (`/gestion/…`, ver el mapa de pantallas en
// docs/spec.md §5) se agregan acá a medida que existen, y no en la barra.
const LINKS_DE_ROL: Record<Rol, LinkDeNavegacion[]> = {
  ADMINISTRADOR: [],
  GESTOR_CARTELERA: [{ href: "/gestion/funciones/nueva", etiqueta: "Nueva función" }],
  USUARIO: [{ href: "/compras", etiqueta: "Mis compras" }],
};

export function linksDelRol(rol: Rol): LinkDeNavegacion[] {
  return [CARTELERA, ...LINKS_DE_ROL[rol]];
}

export function linksSinSesion(): LinkDeNavegacion[] {
  return [CARTELERA, { href: "/ingresar", etiqueta: "Ingresar" }];
}

/** La dirección del login propio, con la vuelta a donde estaba la persona. */
export function urlDeIngreso(volverA: string): string {
  return `/ingresar?callbackUrl=${encodeURIComponent(volverA)}`;
}
