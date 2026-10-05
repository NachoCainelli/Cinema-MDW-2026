/**
 * Bucket público de Supabase Storage, para el póster de la Película (spec,
 * sección 8): guarda el archivo y devuelve su URL pública. El archivo no se
 * guarda en la base de datos, solo la URL (`imagenUrl` en `lib/schemas/pelicula.ts`).
 *
 * La subida es desde el servidor: quien llama a `subirImagen` ya pasó por
 * `requerirUsuario("GESTOR_CARTELERA")` y por el schema del archivo
 * (`lib/schemas/imagen.ts`), así que la `service_role key` —la que puede
 * escribir en el bucket— nunca sale del servidor ni llega al cliente. Es la
 * única variable de este módulo que lee esa clave: ningún otro archivo la lee.
 *
 * No usa el SDK de Supabase: un solo POST a la API REST de Storage alcanza
 * para esto y evita sumar una dependencia nueva para un caso de uso mínimo.
 *
 * Las cuatro reglas de un módulo de `lib/servicios/` (clase 7):
 * 1. Timeout siempre — ningún `await` a un tercero espera indefinido.
 * 2. Devuelve, no lanza — la falla es un valor (`null`), no una excepción que
 *    el que llama tiene que saber atrapar.
 * 3. Sin configuración no es un bug, es "no disponible" — `null`, no `throw`.
 * 4. Loguea la falla acá, una sola vez, con contexto — quien llama no tiene
 *    el detalle interno para loguearlo mejor.
 */

const BUCKET = "posters";
const TIMEOUT_MS = 5_000;

const EXTENSION_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function nombreDeArchivo(archivo: File) {
  const extension = EXTENSION_POR_TIPO[archivo.type] ?? "jpg";
  return `${crypto.randomUUID()}.${extension}`;
}

/**
 * Sube un archivo ya validado (`lib/schemas/imagen.ts`) al bucket público y
 * devuelve su URL pública, o `null` si no se pudo: falta la configuración,
 * Storage respondió con un error, no respondió a tiempo, o falló la red. En
 * todos los casos la falla se loguea acá; quien llama solo decide qué hacer
 * con un `null` (en `POST /api/peliculas/imagen`, hoy, un 502).
 */
export async function subirImagen(archivo: File): Promise<string | null> {
  const url = process.env.SUPABASE_URL?.trim();
  const claveDeServicio = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !claveDeServicio) {
    console.error("storage: no se pudo subir la imagen", "faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }

  const nombre = nombreDeArchivo(archivo);

  try {
    const respuesta = await fetch(`${url}/storage/v1/object/${BUCKET}/${nombre}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${claveDeServicio}`,
        "Content-Type": archivo.type,
      },
      body: archivo,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      throw new Error(`Supabase Storage respondió ${respuesta.status}: ${await respuesta.text()}`);
    }

    return `${url}/storage/v1/object/public/${BUCKET}/${nombre}`;
  } catch (error) {
    console.error("storage: no se pudo subir la imagen", error);
    return null;
  }
}
