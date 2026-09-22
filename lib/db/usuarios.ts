import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { ErrorDeConflicto } from "@/lib/errores";
import { hashearPassword, verificarPassword } from "@/lib/password";
import type { CredencialesInput, RegistrarUsuarioInput } from "@/lib/schemas/usuario";

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

/**
 * Login por email y contraseña (provider Credentials). Devuelve el usuario si
 * la contraseña coincide y `null` en cualquier otro caso.
 *
 * Email inexistente, cuenta de Google sin contraseña y contraseña incorrecta
 * dan el mismo `null`, y tardan lo mismo (ver `verificarPassword`): la
 * respuesta no confirma qué emails tienen cuenta.
 *
 * Es la única consulta que pide `passwordHash`, y no lo deja salir.
 */
export async function verificarCredenciales(datos: CredencialesInput) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: datos.email },
    select: { ...camposPublicos, passwordHash: true },
  });

  const coincide = await verificarPassword(datos.password, usuario?.passwordHash ?? null);
  if (!usuario || !coincide) return null;

  return { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol };
}

/**
 * Primer paso de cada login con Google: trae la fila por email o la crea.
 *
 * `update: {}` a propósito: si la persona ya existe, lo que diga Google no
 * pisa nuestra base. Con un `update` que copiara datos, un GESTOR_CARTELERA
 * podría perder su rol en el login siguiente.
 *
 * `create` con `rol: "USUARIO"` fijo, el de menor privilegio, y sin
 * `passwordHash`: la cuenta de Google no tiene contraseña y por eso tampoco
 * entra por Credentials. Upsert y no find-o-create por lo mismo que el
 * registro: dos primeros logins a la vez no pueden duplicar la fila.
 */
export async function obtenerOCrearUsuarioDeGoogle(datos: { email: string; nombre: string }) {
  return prisma.usuario.upsert({
    where: { email: datos.email },
    update: {},
    create: { email: datos.email, nombre: datos.nombre, rol: "USUARIO" },
    select: camposPublicos,
  });
}
