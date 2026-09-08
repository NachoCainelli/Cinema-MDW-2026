import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto } from "@/lib/errores";
import { hashearPassword } from "@/lib/password";
import type { RegistrarUsuarioInput } from "@/lib/schemas/usuario";

/**
 * Lo único que sale de esta capa hacia afuera. `passwordHash` queda adentro a
 * propósito: sin este `select`, un `findUnique` de Usuario lo devolvería.
 */
const camposPublicos = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
} as const;

/** Código de Prisma para "violaste una restricción de unicidad". */
const VIOLACION_DE_UNICIDAD = "P2002";

export async function buscarUsuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({
    where: { email },
    select: camposPublicos,
  });
}

/**
 * Registro público (H1). El rol es siempre USUARIO y está fijo acá, no llega
 * por parámetro: las cuentas de ADMINISTRADOR y GESTOR_CARTELERA las crea un
 * administrador (docs/spec.md, sección 6). Aunque el body del request trajera
 * un `rol`, el schema de Zod lo descarta y esta función ni lo mira.
 *
 * El email duplicado se detecta por el error de la base y no con un
 * `findUnique` previo: entre el "no existe" y el `create` pueden entrar dos
 * registros a la vez y los dos verían el email libre. La restricción `@unique`
 * es la única que no se puede ganar por carrera.
 */
export async function registrarUsuario(datos: RegistrarUsuarioInput) {
  const passwordHash = await hashearPassword(datos.password);

  try {
    return await prisma.usuario.create({
      data: {
        email: datos.email,
        nombre: datos.nombre,
        passwordHash,
        rol: "USUARIO",
      },
      select: camposPublicos,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === VIOLACION_DE_UNICIDAD
    ) {
      throw new ErrorDeConflicto("Ya existe una cuenta registrada con ese email");
    }

    throw error;
  }
}
