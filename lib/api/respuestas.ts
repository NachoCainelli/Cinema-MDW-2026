import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  ErrorDeConflicto,
  ErrorNoAutenticado,
  ErrorNoAutorizado,
  ErrorNoEncontrado,
} from "@/lib/errores";

export type CuerpoDeError = {
  error: string;
  detalles?: { campo: string; mensaje: string }[];
};

export function respuestaDeError(error: unknown): NextResponse<CuerpoDeError> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Los datos enviados no son válidos",
        detalles: error.issues.map((issue) => ({
          campo: issue.path.join("."),
          mensaje: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (error instanceof ErrorNoAutenticado) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ErrorNoAutorizado) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof ErrorNoEncontrado) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof ErrorDeConflicto) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  console.error("Error no contemplado en un endpoint:", error);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}
