import { describe, expect, it } from "vitest";

import { desdeHoraDelCine, formatearPrecio } from "@/lib/utils";

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
  it("muestra pesos con separador de miles y sin centavos", () => {
    // `toLocaleString` separa el signo con un espacio duro (U+00A0).
    expect(formatearPrecio(10000).replace(/\s/g, " ")).toBe("$ 10.000");
  });
});
