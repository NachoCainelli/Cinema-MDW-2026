import { describe, expect, it } from "vitest";

import { funcionYaEmpezo, veredictoDeButacas } from "./butacas";

/** Butacas de la sala de la función. */
const sala = ["but_1", "but_2", "but_3", "but_4"];

describe("veredictoDeButacas", () => {
  it("funciona: tres butacas libres de la sala correcta dan las dos listas vacías", () => {
    expect(veredictoDeButacas(["but_1", "but_2", "but_3"], sala, [])).toEqual({
      fueraDeSala: [],
      ocupadas: [],
    });
  });

  it("falla: una butaca ya vendida para esa función aparece en ocupadas", () => {
    expect(veredictoDeButacas(["but_1", "but_2"], sala, ["but_2"])).toEqual({
      fueraDeSala: [],
      ocupadas: ["but_2"],
    });
  });

  it("borde: una butaca de otra sala y una vendida en el mismo pedido van cada una a su lista", () => {
    expect(veredictoDeButacas(["but_1", "otra_sala", "but_3"], sala, ["but_3"])).toEqual({
      fueraDeSala: ["otra_sala"],
      ocupadas: ["but_3"],
    });
  });

  it("devuelve todas las ocupadas, no la primera nomás", () => {
    expect(veredictoDeButacas(["but_1", "but_2", "but_3"], sala, ["but_1", "but_3"])).toEqual({
      fueraDeSala: [],
      ocupadas: ["but_1", "but_3"],
    });
  });
});

describe("funcionYaEmpezo", () => {
  const ahora = new Date(Date.UTC(2030, 0, 1, 20));

  it("una función que empieza más tarde admite compra", () => {
    expect(funcionYaEmpezo(new Date(ahora.getTime() + 60 * 1000), ahora)).toBe(false);
  });

  it("borde: la función que empieza exactamente ahora ya no admite compra", () => {
    expect(funcionYaEmpezo(new Date(ahora), ahora)).toBe(true);
  });

  it("una función que empezó antes no admite compra", () => {
    expect(funcionYaEmpezo(new Date(ahora.getTime() - 60 * 1000), ahora)).toBe(true);
  });
});
