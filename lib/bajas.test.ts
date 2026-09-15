import { describe, expect, it } from "vitest";

import {
  detalleDeFuncionesQueImpiden,
  funcionesQueImpidenBaja,
  type FuncionParaBaja,
} from "@/lib/bajas";

function funcion(overrides: Partial<FuncionParaBaja> = {}): FuncionParaBaja {
  return {
    id: "funcion-1",
    titulo: "Una película",
    inicio: new Date("2026-09-15T20:00:00.000Z"),
    duracionMinutos: 120,
    ...overrides,
  };
}

describe("funcionesQueImpidenBaja", () => {
  const ahora = new Date("2026-09-15T20:00:00.000Z");

  it("funciona: si todas las funciones ya terminaron, no hay impedimento", () => {
    const funciones = [
      funcion({ id: "f1", inicio: new Date("2026-09-10T20:00:00.000Z"), duracionMinutos: 90 }),
      funcion({ id: "f2", inicio: new Date("2026-09-12T10:00:00.000Z"), duracionMinutos: 60 }),
    ];

    expect(funcionesQueImpidenBaja(funciones, ahora)).toEqual([]);
  });

  it("falla: una función programada para mañana impide la baja", () => {
    const funcionFutura = funcion({
      id: "f-futura",
      inicio: new Date("2026-09-16T20:00:00.000Z"),
      duracionMinutos: 120,
    });

    expect(funcionesQueImpidenBaja([funcionFutura], ahora)).toEqual([funcionFutura]);
  });

  it("borde: una función que empezó hace 10 minutos y dura 120 sigue en curso", () => {
    const funcionEnCurso = funcion({
      id: "f-en-curso",
      inicio: new Date(ahora.getTime() - 10 * 60 * 1000),
      duracionMinutos: 120,
    });

    expect(funcionesQueImpidenBaja([funcionEnCurso], ahora)).toEqual([funcionEnCurso]);
  });

  it("borde: una función que terminó hace un minuto no impide la baja", () => {
    // Empezó hace 61 minutos y dura 60: terminó hace exactamente 1 minuto.
    const funcionTerminada = funcion({
      id: "f-terminada",
      inicio: new Date(ahora.getTime() - 61 * 60 * 1000),
      duracionMinutos: 60,
    });

    expect(funcionesQueImpidenBaja([funcionTerminada], ahora)).toEqual([]);
  });

  it("borde: sin funciones asociadas, no hay impedimento", () => {
    expect(funcionesQueImpidenBaja([], ahora)).toEqual([]);
  });
});

describe("detalleDeFuncionesQueImpiden", () => {
  it("lista hasta 5 funciones y siempre incluye la cantidad total", () => {
    const funciones = Array.from({ length: 7 }, (_, indice) =>
      funcion({
        id: `f${indice}`,
        titulo: `Película ${indice}`,
        inicio: new Date(2026, 8, 16 + indice, 20, 0),
      }),
    );

    const detalle = detalleDeFuncionesQueImpiden(funciones);

    expect(detalle).toContain("(7 en total)");
    expect(detalle).toContain("Película 0");
    expect(detalle).toContain("Película 4");
    expect(detalle).not.toContain("Película 5");
  });

  it("con una sola función, el total es 1", () => {
    const detalle = detalleDeFuncionesQueImpiden([funcion({ titulo: "Solita" })]);

    expect(detalle).toContain('"Solita"');
    expect(detalle).toContain("(1 en total)");
  });
});
