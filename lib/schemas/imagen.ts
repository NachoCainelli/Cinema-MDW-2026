/**
 * Schema del archivo que sube `POST /api/peliculas/imagen`.
 *
 * `formData.get("archivo")` devuelve `File | string | null` — un campo de
 * texto con el mismo nombre pasaría el `.get()` pero no es un archivo—, por
 * eso el primer chequeo es `instanceof File` y no algo específico del
 * contenido.
 */
import { z } from "zod";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANIO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

export const imagenSchema = z
  .instanceof(File, { message: "Falta el archivo de imagen" })
  .refine((archivo) => archivo.size > 0, { message: "El archivo está vacío" })
  .refine((archivo) => archivo.size <= TAMANIO_MAXIMO_BYTES, {
    message: "La imagen no puede superar los 5 MB",
  })
  .refine((archivo) => TIPOS_PERMITIDOS.includes(archivo.type), {
    message: "La imagen tiene que ser JPEG, PNG o WEBP",
  });
