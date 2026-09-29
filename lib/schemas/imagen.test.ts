import { describe, expect, it } from "vitest";

import { imagenSchema } from "./imagen";

function archivo(bytes: number, tipo = "image/png") {
  return new File([new Uint8Array(bytes)], "poster.png", { type: tipo });
}

describe("imagenSchema", () => {
  it("acepta un JPEG, PNG o WEBP dentro del tamaño permitido", () => {
    expect(imagenSchema.safeParse(archivo(1000, "image/jpeg")).success).toBe(true);
    expect(imagenSchema.safeParse(archivo(1000, "image/png")).success).toBe(true);
    expect(imagenSchema.safeParse(archivo(1000, "image/webp")).success).toBe(true);
  });

  it("rechaza algo que no es un archivo", () => {
    const resultado = imagenSchema.safeParse("no-es-un-archivo");

    expect(resultado.success).toBe(false);
  });

  it("rechaza un archivo vacío", () => {
    const resultado = imagenSchema.safeParse(archivo(0));

    expect(resultado.success).toBe(false);
  });

  it("rechaza un archivo de más de 5 MB", () => {
    const resultado = imagenSchema.safeParse(archivo(5 * 1024 * 1024 + 1));

    expect(resultado.success).toBe(false);
  });

  it("rechaza un tipo que no es imagen permitida, como PDF", () => {
    const resultado = imagenSchema.safeParse(archivo(1000, "application/pdf"));

    expect(resultado.success).toBe(false);
  });
});
