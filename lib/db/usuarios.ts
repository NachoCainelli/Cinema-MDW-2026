import { prisma } from "@/lib/db/client";

const camposPublicos = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
} as const;

export async function buscarUsuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({
    where: { email },
    select: camposPublicos,
  });
}
