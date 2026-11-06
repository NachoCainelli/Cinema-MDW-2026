import { describe, expect, it } from "vitest";

import { categoriaSchema, clasificacionSchema } from "@/lib/schemas/pelicula";
import {
  desdeHoraDelCine,
  ETIQUETAS_DE_CATEGORIA,
  ETIQUETAS_DE_CLASIFICACION,
  formatearPrecio,
} from "@/lib/utils";

describe("desdeHoraDelCine", () => {
  it("interpreta la hora del datetime-local en hora argentina (UTC-3)", () => {
    expect(desdeHoraDelCine("2026-11-10T20:30")).toBe("2026-11-10T23:30:00.000Z");
  });

  it("pasa al día siguiente en UTC cuando la función es de noche", () => {
    expect(desdeHoraDelCine("2026-12-31T22:00")).toBe("2027-01-01T01:00:00.000Z");
  });

  it("no depende de la zona del proceso que lo ejecuta", () => {
    // El mismo valor da el mismo instante en cualquier fecha del año: la
    // Argentina no tiene horario de verano hoy.
    expect(desdeHoraDelCine("2026-07-01T00:00")).toBe("2026-07-01T03:00:00.000Z");
  });

  it.each(["", "mañana", "2026-11-10", "2026-11-10T20:30:00Z"])(
    "devuelve %j tal cual para que lo rechace el schema",
    (valor) => {
      expect(desdeHoraDelCine(valor)).toBe(valor);
    },
  );
});

describe("formatearPrecio", () => {
  it("muestra pesos con separador de miles y un espacio duro (U+00A0) después del signo", () => {
    expect(formatearPrecio(10000)).toBe("$\u00a010.000");
  });

  it.each([
    [0, "$\u00a00"],
    [999, "$\u00a0999"],
    [1000, "$\u00a01.000"],
    [1234567, "$\u00a01.234.567"],
  ])("formatea %d como %s", (monto, esperado) => {
    expect(formatearPrecio(monto)).toBe(esperado);
  });

  it("redondea a pesos enteros", () => {
    expect(formatearPrecio(9999.6)).toBe("$\u00a010.000");
  });
});

describe("ETIQUETAS_DE_CLASIFICACION", () => {
  it("muestra cada clasificación como se lee en un cine", () => {
    expect(ETIQUETAS_DE_CLASIFICACION).toEqual({
      ATP: "ATP",
      MAS_13: "+13",
      MAS_16: "+16",
      MAS_18: "+18",
    });
  });

  it("tiene un texto para cada valor del enum", () => {
    expect(Object.keys(ETIQUETAS_DE_CLASIFICACION).sort()).toEqual([...clasificacionSchema.options].sort());
  });
});

describe("ETIQUETAS_DE_CATEGORIA", () => {
  it("muestra cada género con mayúscula inicial y tildes", () => {
    expect(ETIQUETAS_DE_CATEGORIA).toEqual({
      ACCION: "Acción",
      COMEDIA: "Comedia",
      DRAMA: "Drama",
      TERROR: "Terror",
      CIENCIA_FICCION: "Ciencia ficción",
      ANIMACION: "Animación",
      DOCUMENTAL: "Documental",
      ROMANCE: "Romance",
      SUSPENSO: "Suspenso",
    });
  });

  it("tiene un texto para cada valor del enum", () => {
    expect(Object.keys(ETIQUETAS_DE_CATEGORIA).sort()).toEqual([...categoriaSchema.options].sort());
  });
});
