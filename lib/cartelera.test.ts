import { describe, expect, it } from "vitest";

import {
  funcionesEnConflicto,
  MARGEN_ENTRE_FUNCIONES_MINUTOS,
  seSolapan,
  type FuncionProgramada,
} from "./cartelera";

/** Un horario fijo del 1/1/2030, para no depender del reloj. */
function alas(hora: number, minutos = 0) {
  return new Date(Date.UTC(2030, 0, 1, hora, minutos));
}

/** Función programada en la sala: empieza a las 20:00 y dura 120 minutos. */
const duna: FuncionProgramada = {
  id: "fun_1",
  titulo: "Duna",
  inicio: alas(20),
  duracionMinutos: 120,
};

/** Otra función de la misma sala: 22:30 a 00:00. */
const alien: FuncionProgramada = {
  id: "fun_2",
  titulo: "Alien",
  inicio: alas(22, 30),
  duracionMinutos: 90,
};

describe("seSolapan (regla de los 15 minutos)", () => {
  // La existente ocupa la sala de 20:00 a 22:00, más el margen: 22:15.
  const enSala = { inicio: alas(20), duracionMinutos: 120 };

  it("deja pasar una función que arranca exactamente 15 minutos después", () => {
    expect(seSolapan(enSala, { inicio: alas(22, 15), duracionMinutos: 90 })).toBe(false);
  });

  it("rechaza una función que arranca 14 minutos después: falta un minuto de margen", () => {
    expect(seSolapan(enSala, { inicio: alas(22, 14), duracionMinutos: 90 })).toBe(true);
  });

  it("rechaza una función que arranca justo cuando termina la anterior", () => {
    expect(seSolapan(enSala, { inicio: alas(22), duracionMinutos: 90 })).toBe(true);
  });

  it("rechaza una función que empieza en el medio de la anterior", () => {
    expect(seSolapan(enSala, { inicio: alas(21), duracionMinutos: 90 })).toBe(true);
  });

  it("aplica el margen también hacia atrás: la nueva termina 14 minutos antes", () => {
    // Termina a las 19:46 (19:46 + 14 = 20:00), le falta un minuto de margen.
    expect(seSolapan(enSala, { inicio: alas(18, 46), duracionMinutos: 60 })).toBe(true);
  });

  it("deja pasar una función que termina 15 minutos antes", () => {
    expect(seSolapan(enSala, { inicio: alas(18, 45), duracionMinutos: 60 })).toBe(false);
  });

  it("deja pasar funciones de horarios lejanos", () => {
    expect(seSolapan(enSala, { inicio: alas(10), duracionMinutos: 120 })).toBe(false);
  });

  it("usa el margen que declara el módulo", () => {
    expect(MARGEN_ENTRE_FUNCIONES_MINUTOS).toBe(15);
  });
});

describe("funcionesEnConflicto", () => {
  describe("funciona", () => {
    it("con la sala vacía no hay conflictos", () => {
      expect(funcionesEnConflicto({ inicio: alas(21), duracionMinutos: 90 }, [])).toEqual([]);
    });

    it("con funciones lo bastante separadas no hay conflictos", () => {
      // 16:00 a 17:30: termina mucho antes de Duna y de Alien.
      const nueva = { inicio: alas(16), duracionMinutos: 90 };

      expect(funcionesEnConflicto(nueva, [duna, alien])).toEqual([]);
    });
  });

  describe("falla", () => {
    it("devuelve la función que se pisa: la nueva arranca 30 minutos después del inicio de una de 120", () => {
      const nueva = { inicio: alas(20, 30), duracionMinutos: 90 };

      expect(funcionesEnConflicto(nueva, [duna])).toEqual([duna]);
    });

    it("devuelve los datos para explicar el conflicto, no un booleano", () => {
      const [conflicto] = funcionesEnConflicto({ inicio: alas(20, 30), duracionMinutos: 90 }, [duna]);

      expect(conflicto).toEqual({
        id: "fun_1",
        titulo: "Duna",
        inicio: alas(20),
        duracionMinutos: 120,
      });
    });
  });

  describe("bordes del margen", () => {
    // Duna termina a las 22:00; con el margen, la sala se libera a las 22:15.

    it("con exactamente 15 minutos de margen entra", () => {
      const nueva = { inicio: alas(22, 15), duracionMinutos: 60 };

      expect(funcionesEnConflicto(nueva, [duna])).toEqual([]);
    });

    it("con 14 minutos de margen no entra", () => {
      const nueva = { inicio: alas(22, 14), duracionMinutos: 60 };

      expect(funcionesEnConflicto(nueva, [duna])).toEqual([duna]);
    });

    it("una función que arranca justo cuando termina la anterior (0 minutos de margen) no entra", () => {
      const nueva = { inicio: alas(22), duracionMinutos: 60 };

      expect(funcionesEnConflicto(nueva, [duna])).toEqual([duna]);
    });
  });

  describe("varios conflictos", () => {
    it("con dos funciones en conflicto devuelve las dos, no la primera nomás", () => {
      // 21:00 a 23:00: arranca en medio de Duna y termina en medio de Alien.
      const nueva = { inicio: alas(21), duracionMinutos: 120 };

      expect(funcionesEnConflicto(nueva, [duna, alien])).toEqual([duna, alien]);
    });

    it("deja afuera las que no se pisan aunque vengan en la misma lista", () => {
      const temprano: FuncionProgramada = {
        id: "fun_0",
        titulo: "Matrix",
        inicio: alas(14),
        duracionMinutos: 130,
      };
      const nueva = { inicio: alas(21), duracionMinutos: 120 };

      expect(funcionesEnConflicto(nueva, [temprano, duna, alien])).toEqual([duna, alien]);
    });
  });
});
