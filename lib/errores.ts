export class ErrorDeNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ErrorNoAutenticado extends ErrorDeNegocio {
  constructor(mensaje = "Necesitás iniciar sesión") {
    super(mensaje);
  }
}

export class ErrorNoAutorizado extends ErrorDeNegocio {
  constructor(mensaje = "No tenés permiso para hacer esto") {
    super(mensaje);
  }
}

export class ErrorNoEncontrado extends ErrorDeNegocio {
  constructor(mensaje = "No se encontró el recurso") {
    super(mensaje);
  }
}

export class ErrorDeConflicto extends ErrorDeNegocio {
  constructor(mensaje: string) {
    super(mensaje);
  }
}

/**
 * El pago (simulado) se rechazó: la operación es válida, lo que falló es el
 * cobro. Es 402 y no 409 porque no hay nada en la base que reintentar cambie:
 * con otro medio de pago la misma compra sale bien.
 */
export class ErrorDePagoRechazado extends ErrorDeNegocio {
  constructor(mensaje = "El pago fue rechazado") {
    super(mensaje);
  }
}

/**
 * Un servicio externo del que depende la operación no respondió o respondió
 * con error (ej. el bucket de Storage al subir el póster de una película). Es
 * 502 y no 500: lo que falló no es nuestro código, es un tercero — la
 * distinción importa para quien lee el log y para decidir si tiene sentido
 * reintentar.
 *
 * Quién la lanza depende de si el servicio era esencial o accesorio para esa
 * operación (`docs/spec.md`, sección 8): el módulo de `lib/servicios/` nunca
 * lanza esto — devuelve un resultado (`null`, por convención) y loguea el
 * detalle técnico ahí mismo — así que es el `route.ts` que lo llama quien
 * decide qué hacer con esa falla. Si el servicio era esencial para esa
 * operación puntual, la traduce a este error (ver `subirImagen` en
 * `lib/servicios/storage.ts` y cómo lo usa `POST /api/peliculas/imagen`); si
 * era accesorio, ni siquiera llega a lanzarlo, sigue con la respuesta normal
 * degradada.
 *
 * El `mensaje` es lo único de la falla que sale del servidor: `respuestaDeError`
 * no loguea el 502 (no es un incidente, es una respuesta esperada del
 * contrato), así que tiene que ser un texto seguro para mostrarle tal cual a
 * quien usa la aplicación — nunca el body o el status crudo que devolvió el
 * tercero.
 */
export class ErrorDeServicioExterno extends ErrorDeNegocio {
  constructor(mensaje = "No pudimos completar la operación. Probá de nuevo en unos minutos") {
    super(mensaje);
  }
}
