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
