/**
 * Bucket público de Supabase Storage, para el póster de la Película (spec,
 * sección 8): guarda el archivo y devuelve su URL pública. El archivo no se
 * guarda en la base de datos, solo la URL (`imagenUrl` en `lib/schemas/pelicula.ts`).
 *
 * La subida es desde el servidor: quien llama a `subirImagen` ya pasó por
 * `requerirUsuario("GESTOR_CARTELERA")` y por el schema del archivo
 * (`lib/schemas/imagen.ts`), así que la `service_role key` —la que puede
 * escribir en el bucket— nunca sale del servidor ni llega al cliente.
 *
 * No usa el SDK de Supabase: un solo POST a la API REST de Storage alcanza
 * para esto y evita sumar una dependencia nueva para un caso de uso mínimo.
 */

const BUCKET = "posters";

const EXTENSION_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function configuracion() {
  const url = process.env.SUPABASE_URL?.trim();
  const claveDeServicio = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !claveDeServicio) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno: no se puede subir la imagen",
    );
  }

  return { url, claveDeServicio };
}

function nombreDeArchivo(archivo: File) {
  const extension = EXTENSION_POR_TIPO[archivo.type] ?? "jpg";
  return `${crypto.randomUUID()}.${extension}`;
}

/**
 * Sube un archivo ya validado (`lib/schemas/imagen.ts`) al bucket público y
 * devuelve su URL pública. Si Supabase Storage no responde o rechaza la
 * subida, tira un error genérico: no es una regla de negocio de las de
 * `lib/errores.ts`, es la infraestructura, y cae en el 500 de
 * `respuestaDeError` (ver spec, sección 8, "qué pasa si se cae").
 */
export async function subirImagen(archivo: File): Promise<string> {
  const { url, claveDeServicio } = configuracion();
  const nombre = nombreDeArchivo(archivo);

  const respuesta = await fetch(`${url}/storage/v1/object/${BUCKET}/${nombre}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${claveDeServicio}`,
      "Content-Type": archivo.type,
    },
    body: archivo,
  });

  if (!respuesta.ok) {
    throw new Error(
      `Supabase Storage respondió ${respuesta.status} al subir la imagen: ${await respuesta.text()}`,
    );
  }

  return `${url}/storage/v1/object/public/${BUCKET}/${nombre}`;
}
