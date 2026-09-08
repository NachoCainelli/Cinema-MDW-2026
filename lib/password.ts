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
 * `verificarPassword` todavía no lo usa nadie: entra en la clase 6, cuando el
 * provider de credenciales de Auth.js tenga que comparar lo que escribió la
 * persona contra el hash guardado.
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

export async function verificarPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}
