import { describe, expect, it } from "vitest";

import { linksDelRol, linksSinSesion, urlDeIngreso } from "@/lib/navegacion";

describe("linksDelRol", () => {
  it("le muestra la cartelera y sus compras a un USUARIO", () => {
    expect(linksDelRol("USUARIO")).toEqual([
      { href: "/cartelera", etiqueta: "Cartelera" },
      { href: "/compras", etiqueta: "Mis compras" },
    ]);
  });

  it.each(["ADMINISTRADOR", "GESTOR_CARTELERA"] as const)(
    "no le muestra 'Mis compras' a un %s, que no compra entradas",
    (rol) => {
      expect(linksDelRol(rol).map((link) => link.href)).not.toContain("/compras");
    },
  );

  it.each(["ADMINISTRADOR", "GESTOR_CARTELERA", "USUARIO"] as const)(
    "pone la cartelera primera para un %s, siempre en el mismo lugar",
    (rol) => {
      expect(linksDelRol(rol)[0]).toEqual({ href: "/cartelera", etiqueta: "Cartelera" });
    },
  );
});

describe("linksSinSesion", () => {
  it("muestra la cartelera primera y después Ingresar", () => {
    expect(linksSinSesion()).toEqual([
      { href: "/cartelera", etiqueta: "Cartelera" },
      { href: "/ingresar", etiqueta: "Ingresar" },
    ]);
  });
});

describe("urlDeIngreso", () => {
  it("manda al login propio con la vuelta codificada", () => {
    expect(urlDeIngreso("/compras/abc")).toBe("/ingresar?callbackUrl=%2Fcompras%2Fabc");
  });
});
