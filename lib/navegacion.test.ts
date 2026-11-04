import { describe, expect, it } from "vitest";

import { linksDelRol, linksSinSesion, urlDeIngreso, urlDeRegistro } from "@/lib/navegacion";

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

  it("le muestra la cartelera y 'Nueva función' a un GESTOR_CARTELERA", () => {
    expect(linksDelRol("GESTOR_CARTELERA")).toEqual([
      { href: "/cartelera", etiqueta: "Cartelera" },
      { href: "/gestion/funciones/nueva", etiqueta: "Nueva función" },
    ]);
  });

  it.each(["ADMINISTRADOR", "USUARIO"] as const)(
    "no le muestra 'Nueva función' a un %s, que no programa la cartelera",
    (rol) => {
      expect(linksDelRol(rol).map((link) => link.href)).not.toContain("/gestion/funciones/nueva");
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

describe("urlDeRegistro", () => {
  it("manda al registro con la misma vuelta que el login", () => {
    expect(urlDeRegistro("/funciones/abc")).toBe("/registrarse?callbackUrl=%2Ffunciones%2Fabc");
  });
});
