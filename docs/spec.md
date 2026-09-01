# Especificación del sistema — Cinema MDW 2026

> Este documento **es** el relevamiento de requerimientos del proyecto (eje metodológico, clase 2).
> Se completa en la clase 2 y se mantiene actualizado todo el cuatrimestre.
> Regla práctica: si una funcionalidad no está acá, no se implementa.

## 1. El problema

**Para quién:** el público que quiere ver la cartelera y comprar entradas, y el personal del
cine (administrador y gestor de cartelera) que configura salas, funciones y películas.

**Qué hace hoy sin el sistema:** la venta se hace con un sistema de boletería viejo que no se
comunica con la gestión de cartelera — la programación de películas y horarios se arma aparte
(planillas, WhatsApp) y después se carga a mano en el sistema de venta. Ese doble paso genera
desfasajes: butacas que figuran libres y ya fueron vendidas, y una cartelera pública que no
siempre refleja los horarios reales. Además, el público solo puede comprar yendo presencialmente
a la boletería, sin poder elegir butaca de antemano ni ver la cartelera actualizada desde afuera.

**Qué mejora:** unifica la gestión de cartelera y la venta de entradas en un solo sistema, con
disponibilidad de butacas en tiempo real (elimina la sobreventa) y compra online con selección de
butaca, sin depender de ir presencialmente.

## 2. Roles

| Rol | Quién es | Qué puede hacer que el otro no |
|---|---|---|
| **Administrador** | Configura la estructura del cine | Crear/editar salas y butacas, crear cuentas de administrador y de gestor de cartelera |
| **Gestor de cartelera** | Arma la programación | Crear películas, asignarlas a salas con horario (crear funciones), sacar películas de cartelera |
| **Usuario** | Público que compra entradas | Registrarse por su cuenta, ver la cartelera publicada, comprar entradas con selección de butaca, ver su historial de compras |

Todo comprador necesita cuenta. Un Usuario se registra por su cuenta (autoservicio); las cuentas
de administrador y gestor de cartelera las crea siempre un administrador — nadie se autoregistra
con esos dos roles. No hay compra como invitado.

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos.

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **Usuario** | Persona con cuenta; su `rol` define qué puede hacer | Compra (1‑N, como comprador) |
| **Sala** | Espacio físico del cine, con sus filas y columnas de butacas | Butaca (1‑N) · Función (1‑N) |
| **Butaca** | Una posición (fila, columna) dentro de una Sala. Todas las butacas son iguales, sin tipos diferenciados | Sala (N‑1) · Entrada (1‑N) |
| **Película** | Título, sinopsis, duración, clasificación por edad (lista cerrada), categoría o género (lista cerrada), imagen (opcional, URL pública en el bucket de Supabase Storage) y si está en cartelera o dada de baja | Función (1‑N) |
| **Función** | La proyección de una Película en una Sala, en un horario | Película (N‑1) · Sala (N‑1) · Entrada (1‑N) |
| **Compra** | La operación de compra de un Usuario: agrupa una o más Entradas y tiene un estado (`PAGADA` o `RECHAZADA`) | Usuario (N‑1) · Entrada (1‑N) |
| **Entrada** | Una Butaca reservada para una Función, dentro de una Compra | Función (N‑1) · Butaca (N‑1) · Compra (N‑1) |

Una Compra solo se guarda si el pago (simulado) se resuelve: si es aprobado queda en estado
`PAGADA`; si es rechazado, no llega a crearse (no hay estado "pendiente" — el pago mock resuelve
al instante).

Que una butaca esté **libre** u **ocupada** no es un atributo propio de la Butaca: se calcula
según si existe o no una Entrada de una Compra `PAGADA` para esa Butaca en esa Función puntual —
la misma butaca está libre para una función y ocupada para otra.

El precio de la entrada es único y fijo para todo el cine (no varía por función ni por tipo de
butaca). Es un valor de configuración del sistema, no un atributo de ninguna entidad de este
listado.

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <acción>, **para** <beneficio>.
Cada historia lleva su criterio de aceptación: cómo se verifica que está terminada.

> **Todas las historias asumen que el usuario inició sesión con el rol indicado**, salvo la H1,
> que es pública. No se repite en cada criterio: el *Dado* se reserva para las condiciones que,
> si fueran distintas, cambiarían el resultado.

### H1 — Registrarse como usuario
**Como** persona del público sin cuenta, **quiero** registrarme con mi email y una contraseña,
**para** poder comprar entradas.

Criterios de aceptación:
- [ ] Cuando alguien se registra con email, nombre y contraseña válidos, entonces se crea su
      cuenta con rol `USUARIO` y queda con la sesión iniciada.
- [ ] Dado que ya existe una cuenta con ese email, cuando alguien intenta registrarse con el mismo
      email, el sistema rechaza el registro e informa el motivo.
- [ ] Caso de error: si la contraseña tiene menos de 8 caracteres, no se crea la cuenta y se
      muestra el motivo.

### H2 — Configurar una sala y sus butacas
**Como** administrador, **quiero** crear una sala definiendo sus filas y columnas de butacas,
**para** tener el espacio físico listo antes de programar funciones.

Criterios de aceptación:
- [ ] Cuando el administrador crea una sala indicando nombre, filas y columnas, entonces el
      sistema genera automáticamente todas las butacas de esa sala.
- [ ] Dado que ya existe una sala con ese nombre, cuando se intenta crear otra igual, el sistema
      rechaza la creación e informa el motivo.
- [ ] Caso de error: si la cantidad de filas o columnas es cero o negativa, no se crea la sala y
      se muestra el motivo.

### H3 — Publicar una función en la cartelera
**Como** gestor de cartelera, **quiero** asignar una película a una sala en un horario, **para**
que el público la vea publicada y pueda comprar entradas.

Criterios de aceptación:
- [ ] Cuando el gestor crea una función indicando película, sala, fecha y hora, entonces la
      función queda publicada y visible en la cartelera pública.
- [ ] Dado que la sala ya tiene otra función cuyo horario se superpone (considerando la duración
      de la película más 15 minutos de margen), cuando se intenta crear la nueva función, el
      sistema la rechaza e informa el conflicto.
- [ ] Caso de error: si la fecha/hora de la función es anterior a la actual, no se crea y se
      informa el motivo.
- [ ] Caso de error: si la película está dada de baja (ver H6), no se crea la función y se informa
      el motivo.

### H4 — Comprar entradas
**Como** usuario, **quiero** elegir una función y seleccionar mis butacas, **para** asegurarme un
lugar en la sala sin sobreventa.

Criterios de aceptación:
- [ ] Dado que la función tiene butacas libres, cuando el usuario selecciona una o más y confirma,
      entonces se genera una Compra con sus Entradas asociadas y esas butacas pasan a ocupadas.
- [ ] Dado que dos usuarios intentan reservar la misma butaca al mismo tiempo, cuando el segundo
      confirma, entonces el sistema le informa que ya no está disponible y no se le cobra.
- [ ] Caso de error: si el pago (simulado) es rechazado, la compra no se confirma y las butacas
      vuelven a estar libres.
- [ ] Caso de error: si no seleccionó ninguna butaca, el sistema no permite confirmar la compra.

### H5 — Eliminar una sala
**Como** administrador, **quiero** eliminar una sala que ya no se usa, **para** que deje de estar
disponible para programar funciones nuevas sin perder el historial de las que ya se dieron ahí.

El borrado es **lógico**: la sala se marca como eliminada, nunca se borra la fila (ver "Reglas de
borrado" en la sección 6) — así una función pasada sigue pudiendo mostrar en qué sala se dio.

Criterios de aceptación:
- [ ] Dado que la sala no tiene funciones futuras, cuando el administrador la elimina, entonces
      queda marcada como eliminada, no aparece para programar funciones nuevas, y sus butacas
      dejan de listarse como disponibles.
- [ ] Dado que la sala tiene una o más funciones futuras, cuando el administrador intenta
      eliminarla, el sistema rechaza la operación e informa el motivo.
- [ ] Una sala eliminada sigue apareciendo, con su nombre, en las funciones pasadas que se dieron
      en ella y en el historial de compras de esas funciones.
- [ ] Caso de error: si la sala no existe, se informa el motivo.

### H6 — Sacar una película de cartelera
**Como** gestor de cartelera, **quiero** sacar de cartelera una película que ya no se va a
programar, **para** que deje de estar disponible para nuevas funciones sin perder el historial de
las que ya se dieron.

El borrado es **lógico**, igual criterio que H5 (Sala): la película se marca como dada de baja,
nunca se borra la fila — así una función pasada sigue mostrando título, imagen y demás datos de la
película que se proyectó.

Criterios de aceptación:
- [ ] Dado que la película no tiene funciones futuras, cuando el gestor la saca de cartelera,
      entonces queda marcada como dada de baja, no aparece en la cartelera pública y no se puede
      usar para crear funciones nuevas.
- [ ] Dado que la película tiene una o más funciones futuras, cuando el gestor intenta sacarla de
      cartelera, el sistema rechaza la operación e informa el motivo.
- [ ] Una película dada de baja sigue apareciendo, con sus datos, en las funciones pasadas que se
      dieron con ella y en el historial de compras de esas funciones.
- [ ] Caso de error: si la película no existe, se informa el motivo.

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1. El gestor de cartelera crea una función: asigna una película a una sala en una fecha y
   horario (respetando el margen de 15 min con otras funciones de esa sala).
2. La función queda publicada en la cartelera pública.
3. El usuario se registra (o inicia sesión si ya tiene cuenta).
4. El usuario ve la cartelera y elige una función.
5. El usuario selecciona una o más butacas libres de esa función.
6. El usuario confirma la compra; el sistema procesa el pago (simulado).
7. Si el pago es aprobado, se genera la Compra con sus Entradas y esas butacas quedan ocupadas
   para esa función.
8. El usuario ve su compra confirmada, con sus entradas, en su historial.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que
revisar a mano.

- Una función no puede solaparse en horario con otra función de la misma sala, con un margen
  mínimo de 15 minutos entre el fin de una y el inicio de la siguiente.
- Una butaca no puede estar en más de una Entrada activa para la misma función (evita la
  sobreventa); se valida de forma atómica al confirmar la compra.
- El precio de la entrada es único y fijo para todo el cine, configurado por el administrador.
- Las butacas de una sala se generan automáticamente al crearla, según filas y columnas.
- Un usuario solo puede ver sus propias compras.
- Solo el administrador crea salas y cuentas de gestor de cartelera; nadie se autoregistra con
  esos roles.
- Una función no se puede crear con fecha/hora en el pasado.
- Una compra confirmada no se puede cancelar ni reembolsar (ver Fuera de alcance).
- No existe una reserva temporal ("hold") de butaca mientras el usuario elige o paga: la
  disponibilidad se valida recién al confirmar la compra. Por eso dos personas pueden llegar a
  ver la misma butaca como libre a la vez, y a la segunda que confirma el sistema se lo informa.
- Una Compra con el pago rechazado no se persiste: no hay estado "pendiente" a la espera de un
  pago, porque el mock resuelve al instante.
- Una sala no se puede eliminar si tiene una o más funciones futuras programadas. Si solo tiene
  funciones pasadas (o ninguna), se puede eliminar.
- Eliminar una sala es un borrado lógico: la fila nunca se borra de la base, se marca
  `eliminadaEn`. Una sala eliminada no admite funciones nuevas, pero sus butacas y sus funciones
  pasadas se conservan tal cual para no romper el historial de ventas (ver H5 y Reglas de borrado).
- Una película no se puede sacar de cartelera si tiene una o más funciones futuras programadas. Si
  solo tiene funciones pasadas (o ninguna), se puede sacar.
- Sacar una película de cartelera es un borrado lógico, mismo criterio que la sala: la fila nunca
  se borra, se marca `bajaEn`. Una película dada de baja no admite funciones nuevas, pero sus
  funciones pasadas y el historial de ventas asociado se conservan tal cual (ver H6 y Reglas de
  borrado).

### Reglas de borrado

Salvo la Sala (H5) y la Película (H6) —ambas con borrado lógico—, no hay más funcionalidad de
borrado en las historias de usuario de este alcance (ninguna otra entidad se elimina desde la
aplicación). Aun así, el modelo de datos (`prisma/schema.prisma`) define qué pasa si se borra una
fila a mano o en una migración futura, para no perder historial de ventas. Criterio general (según
la guía de la clase 3): lo que es historia no se borra nunca; lo demás, borrado físico hasta que
haga falta otra cosa.

- **Sala:** borrado **lógico**, no físico (`eliminadaEn`, ver H5). Una sala que ya tuvo funciones es
  historia — borrarla de verdad le haría perder a esas funciones el dato de en qué sala se dieron.
  Por eso la relación Sala → Función se deja en `Restrict` (no en cascada ni en `SetNull`): es un
  freno de seguridad para que un borrado físico accidental de la fila nunca sea posible mientras
  tenga funciones asociadas.
- **Sala → Butaca:** en cascada. Solo se ejecutaría si alguna vez se borra la fila de Sala a mano
  (la app nunca lo hace, ver el punto anterior). Una butaca no existe sin su sala.
- **Película:** borrado **lógico**, no físico (`bajaEn`, ver H6). Mismo razonamiento que Sala: una
  película que ya tuvo funciones es historia. Por eso **Película → Función** también se deja en
  `Restrict`, como freno de seguridad — no por sí sola justificaría el borrado físico, ya que la
  app nunca borra la fila.
- **Función → Entrada** y **Butaca → Entrada:** restringido. Protege el historial: no se puede
  borrar una función o una butaca que ya tiene entradas vendidas.
- **Compra → Entrada:** en cascada. Una entrada no existe sin su compra.
- **Usuario → Compra:** restringido. No se pierde el historial de compras de un usuario.

## 7. Requisitos no funcionales

### Usabilidad

- **Eficiencia:** comprar una entrada (función → butaca(s) → confirmar) se hace en **4
  interacciones o menos**.
- **Errores:** si una butaca deja de estar disponible o falta un campo, se señala claro y **no se
  pierde la selección ya hecha**.
- **Aprendizaje:** un usuario que nunca vio el sistema compra una entrada sin que le expliquen.
- **Recuerdo:** la cartelera está a un clic desde la home y siempre en el mismo lugar.
- **Satisfacción:** se prueba con alguien de afuera del equipo antes del Demo Day.

### Accesibilidad

Esta lista es **igual para todos los proyectos**: no hay que adaptarla, hay que cumplirla.

- [ ] Todo se puede operar **con el teclado**, y se ve dónde está el foco.
- [ ] Los campos de formulario tienen `label` asociado, no solo *placeholder*.
- [ ] Las imágenes que informan tienen texto alternativo; las decorativas, alternativo vacío.
- [ ] El **contraste** entre texto y fondo llega a **4,5:1** (3:1 si la letra es grande).
- [ ] El error nunca se comunica **solo con color**: siempre hay texto.

## 8. Integración externa

**Cuál:** pasarela de pago simulada (mock).

**Para qué:** aprueba o rechaza el pago de una Compra al instante, sin credenciales ni
dependencias externas reales. Permite probar el flujo completo de compra (incluido el caso de
pago rechazado de H4) sin depender de una pasarela real.

**Qué pasa si se cae:** al ser un mock local no depende de un servicio externo; simula un rechazo
ocasional para poder probar el caso de error de H4.

**Cuál:** bucket público de Supabase Storage, para el póster de la Película.

**Para qué:** guardar la imagen y servirla directo desde su URL pública (campo `imagenUrl`,
opcional). No se guarda el archivo en la base de datos, solo la URL.

**Qué pasa si se cae:** la película se sigue mostrando sin imagen (el campo es opcional); no
bloquea ninguna otra funcionalidad del sistema.

## 9. Fuera de alcance

Lo que decidimos **no** hacer, para no volver a discutirlo en la clase 12.

- **Recomendación de películas con IA.** Quedó anotada como posible extensión, no como parte de
  este alcance.
- **Pagos reales** con una pasarela externa (Mercado Pago, Stripe, etc.). Se usa un mock.
- **Cancelación y reembolso de compras.** Una vez confirmada, la compra queda firme.
- **Múltiples sedes / cadena de cines.** El sistema modela un solo cine.
- **Tipos de butaca diferenciados** (VIP, discapacidad) **y precios variables por función.** Todas
  las butacas son iguales y el precio es único para todo el cine.
- **Una persona con más de un rol a la vez.**
- **Editar o eliminar una función ya publicada.** Una vez creada, una función no se modifica ni se
  borra en este alcance — si hay un error, se resuelve fuera del sistema.
- **Reserva temporal de butacas** mientras el usuario está eligiendo o pagando. La disponibilidad
  se valida solo al confirmar la compra (ver sección 6).
