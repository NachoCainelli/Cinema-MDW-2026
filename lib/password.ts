/**
 * Hasheo de contraseñas.
 *
 * Único lugar del proyecto que sabe con qué algoritmo se guardan las
 * contraseñas. Si mañana se cambia bcrypt por otra cosa, se cambia acá y nada
 * más: el resto del código solo ve un `passwordHash` opaco.
 *
 * bcrypt genera un salt distinto por contraseña y lo guarda dentro del propio
 * hash, así que no hace falta una columna aparte para el salt. Por eso también
 * dos usuarios con la misma contraseña terminan con hashes distintos.
 *
 * `verificarPassword` la usa el provider Credentials de Auth.js (a través de
 * `verificarCredenciales` en `lib/db/usuarios.ts`) para comparar lo que
 * escribió la persona contra el hash guardado.
 */
import { compare, hash } from "bcryptjs";

/**
 * Cuántas veces se duplica el trabajo del algoritmo: cada +1 tarda el doble.
 * 10 es el valor por defecto de bcrypt (~50-100 ms), un punto razonable entre
 * "no frenar el request" y "que un ataque de fuerza bruta sea caro".
 */
const VUELTAS = 10;

export async function hashearPassword(password: string): Promise<string> {
  return hash(password, VUELTAS);
}

/**
 * Hash de una contraseña al azar que nadie conoce. Se compara contra él cuando
 * no hay hash real (el email no existe, o la cuenta se creó con Google y no
 * tiene contraseña) para que esa respuesta tarde lo mismo que una contraseña
 * incorrecta: si "no existe" contestara en 1 ms y "contraseña mal" en 80 ms,
 * el tiempo de respuesta confirmaría qué emails tienen cuenta.
 */
const HASH_DE_RELLENO = "$2b$10$X0sejuU7IQbr1XKDK8G/FezRQJJUh8WIcFVb7MANbY6cbTFCnOSsq";

export async function verificarPassword(
  password: string,
  passwordHash: string | null,
): Promise<boolean> {
  if (!passwordHash) {
    await compare(password, HASH_DE_RELLENO);
    return false;
  }

  return compare(password, passwordHash);
}
