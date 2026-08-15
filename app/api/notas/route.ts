/**
 * Endpoint de ejemplo: muestra el patrón que sigue toda la API del proyecto.
 *
 *   1. Se valida la entrada con un schema de Zod.
 *   2. Se verifica quién es el usuario (clase 6).
 *   3. Se delega el acceso a datos a `lib/db/`.
 *   4. Se responde con el status code correcto.
 *
 * Se completa en las clases 4, 5 y 6.
 */
import { NextResponse } from "next/server";
import { crearNotaSchema } from "@/lib/schemas/nota";
import { crearNota, listarNotas } from "@/lib/db/notas";

export async function GET() {
  const notas = await listarNotas();
  return NextResponse.json(notas);
}

export async function POST(request: Request) {
  // 1. Validar. Nunca confiar en el body: puede venir de cualquier lado,
  //    no solo del formulario propio.
  const body: unknown = await request.json();
  const resultado = crearNotaSchema.safeParse(body);

  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: resultado.error.flatten() },
      { status: 400 }, // 400 = el cliente mandó algo mal
    );
  }

  // 2. Autorizar. El autor sale de la sesión del servidor, NUNCA del body.
  //    TODO (clase 6): reemplazar por el usuario real de la sesión y
  //    devolver 401 si no hay sesión.
  const autorId = "usuario-de-ejemplo";

  // 3. Delegar el acceso a datos.
  const nota = await crearNota(resultado.data, autorId);

  // 4. 201 = se creó un recurso nuevo.
  return NextResponse.json(nota, { status: 201 });
}
