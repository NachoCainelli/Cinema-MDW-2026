# Especificación del sistema

> Este documento **es** el relevamiento de requerimientos del proyecto (eje metodológico, clase 2).
> Se completa en la clase 2 y se mantiene actualizado todo el cuatrimestre.
> Regla práctica: si una funcionalidad no está acá, no se implementa.

## 1. El problema

**Para quién:** <a quién le sirve este sistema>
**Qué hace hoy sin el sistema:** <cómo resuelve hoy ese problema — planilla, papel, WhatsApp>
**Qué mejora:** <en una oración>

## 2. Roles

| Rol | Quién es | Qué puede hacer que el otro no |
|---|---|---|
| <rol A> | | |
| <rol B> | | |

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos.

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| | | |

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <acción>, **para** <beneficio>.
Cada historia lleva su criterio de aceptación: cómo se verifica que está terminada.

### H1 — <título>
**Como** …, **quiero** …, **para** …

Criterios de aceptación:
- [ ] Dado <contexto>, cuando <acción>, entonces <resultado esperado>
- [ ] Caso de error: cuando <situación inválida>, el sistema <qué hace>

### H2 — <título>
…

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1.
2.
3.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que revisar a mano.

- <ej: un turno no puede superponerse con otro del mismo profesional>
- <ej: solo el creador o un administrador puede cancelar>

## 7. Integración externa

**Cuál:** <storage / email / pagos / mapas / IA>
**Para qué:** <qué resuelve en el producto>
**Qué pasa si se cae:** <plan de contingencia>

## 8. Fuera de alcance

Lo que decidimos **no** hacer, para no volver a discutirlo en la clase 12.

-
