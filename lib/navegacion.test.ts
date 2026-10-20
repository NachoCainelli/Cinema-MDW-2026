import { describe, expect, it } from "vitest";

import { linksDelRol, urlDeIngreso } from "@/lib/navegacion";

describe("linksDelRol", () => {
  it("le muestra sus compras a un USUARIO", () => {
    expect(linksDelRol("USUARIO")).toEqual([{ href: "/compras", etiqueta: "Mis compras" }]);
  });

  it.each(["ADMINISTRADOR", "GESTOR_CARTELERA"] as const)(
    "no le muestra 'Mis compras' a un %s, que no compra entradas",
    (rol) => {
      expect(linksDelRol(rol).map((link) => link.href)).not.toContain("/compras");
    },
  );
});

describe("urlDeIngreso", () => {
  it("manda al login propio con la vuelta codificada", () => {
    expect(urlDeIngreso("/compras/abc")).toBe("/ingresar?callbackUrl=%2Fcompras%2Fabc");
  });
});
