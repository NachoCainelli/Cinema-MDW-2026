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
| **Administrador** | Configura la estructura del cine | Crear/editar salas y butacas, definir horarios generales de funcionamiento, crear cuentas de gestor de cartelera |
| **Gestor de cartelera** | Arma la programación | Crear películas, asignarlas a salas con horario (crear funciones), publicar/despublicar la cartelera |
| **Usuario** | Público que compra entradas | Ver la cartelera publicada, comprar entradas con selección de butaca, ver su historial de compras |

Todo comprador necesita cuenta: no hay compra como invitado.

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos.

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **Usuario** | Persona con cuenta; su `rol` define qué puede hacer | Compra (1‑N, como comprador) |
| **Sala** | Espacio físico del cine, con sus filas y columnas de butacas | Butaca (1‑N) · Función (1‑N) |
| **Butaca** | Una posición (fila, columna) dentro de una Sala. Todas las butacas son iguales, sin tipos diferenciados | Sala (N‑1) · Entrada (1‑N) |
| **Película** | Título, sinopsis, duración, clasificación | Función (1‑N) |
| **Función** | La proyección de una Película en una Sala, en un horario | Película (N‑1) · Sala (N‑1) · Entrada (1‑N) |
| **Compra** | La operación de compra de un Usuario: agrupa una o más Entradas y tiene un estado de pago | Usuario (N‑1) · Entrada (1‑N) |
| **Entrada** | Una Butaca reservada para una Función, dentro de una Compra | Función (N‑1) · Butaca (N‑1) · Compra (N‑1) |

El precio de la entrada es único y fijo para todo el cine (no varía por función ni por tipo de
butaca).

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <acción>, **para** <beneficio>.
Cada historia lleva su criterio de aceptación: cómo se verifica que está terminada.

### H1 — Configurar una sala y sus butacas
**Como** administrador, **quiero** crear una sala definiendo sus filas y columnas de butacas,
**para** tener el espacio físico listo antes de programar funciones.

Criterios de aceptación:
- [ ] Cuando el administrador crea una sala indicando nombre, filas y columnas, entonces el
      sistema genera automáticamente todas las butacas de esa sala.
- [ ] Dado que ya existe una sala con ese nombre, cuando se intenta crear otra igual, el sistema
      rechaza la creación e informa el motivo.
- [ ] Caso de error: si la cantidad de filas o columnas es cero o negativa, no se crea la sala y
      se muestra el motivo.

### H2 — Publicar una función en la cartelera
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

### H3 — Comprar entradas
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

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1. El gestor de cartelera crea una función: asigna una película a una sala en una fecha y
   horario (respetando el margen de 15 min con otras funciones de esa sala).
2. La función queda publicada en la cartelera pública.
3. El usuario entra al sistema, ve la cartelera y elige una función.
4. El usuario selecciona una o más butacas libres de esa función.
5. El usuario confirma la compra; el sistema procesa el pago (simulado).
6. Si el pago es aprobado, se genera la Compra con sus Entradas y esas butacas quedan ocupadas
   para esa función.
7. El usuario ve su compra confirmada, con sus entradas, en su historial.

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
pago rechazado de H3) sin depender de una pasarela real.

**Qué pasa si se cae:** al ser un mock local no depende de un servicio externo; simula un rechazo
ocasional para poder probar el caso de error de H3.

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
