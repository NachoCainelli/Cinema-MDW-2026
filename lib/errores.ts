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
 * Un servicio externo esencial para la operación no respondió o devolvió un
 * error (`lib/servicios/<cual>.ts` devuelve `null`). Es 502 y no 500: no se
 * rompió nada nuestro, falló una dependencia de la que dependemos — el
 * mensaje se lo dice a quien pregunta, no hay nada que el cliente pueda
 * corregir del lado suyo.
 *
 * TODO (clase 7, #58): puede quedar redefinido acá cuando se resuelva el
 * contrato de errores de la Fase A; este es el mínimo que necesita #59 para
 * no bloquearse mientras tanto.
 */
export class ErrorDeServicioExterno extends ErrorDeNegocio {
  constructor(mensaje = "No pudimos completar la operación. Probá de nuevo en unos minutos") {
    super(mensaje);
  }
}
