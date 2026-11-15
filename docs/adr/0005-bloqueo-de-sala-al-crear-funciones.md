# ADR 0005 — Funciones superpuestas: bloqueo de la sala, no restricción `EXCLUDE`

**Estado:** aceptado
**Fecha:** 2026-11-11
**Decide:** equipo de desarrollo

---

## Contexto

Una función no puede solaparse con otra de la misma sala: entre el fin de una y el inicio de la siguiente tienen que quedar al menos 15 minutos (`docs/spec.md` §6, H3).

`crearFuncion` (`lib/db/funciones.ts`) lo chequeaba así: buscaba las funciones de la sala que podían pisarse, le pasaba esa lista a la regla pura `funcionesEnConflicto` (`lib/cartelera.ts`) y, si no había conflicto, hacía el `create`. Esos dos pasos no eran atómicos. Dos pedidos simultáneos para la misma sala veían la sala libre y los dos creaban su función.

`e2e/concurrencia.spec.ts` lo confirma: lanza 10 pedidos con horarios que se pisan en cada una de 5 salas, 50 en total. Sin el arreglo, en 5 corridas se crearon **entre 27 y 40 funciones**, cuando tendrían que haber sido 5 (una por sala).

La regla no se puede expresar con un `@@unique`, como sí pasa con la butaca vendida (`@@unique([funcionId, butacaId])` en `Entrada`). Dos funciones se pisan según **la duración de la película**, y el fin de una función no es una columna de la tabla.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| **Bloqueo sobre la sala**: el chequeo y el `create` van en una `$transaction` que empieza con `SELECT ... FROM "Sala" WHERE id = ... FOR UPDATE` | No necesita migración. La regla sigue en un solo lugar (`lib/cartelera.ts`), con su mensaje de hoy. Pedidos para salas distintas no se esperan entre sí | Solo protege a quien pasa por `crearFuncion`: un `INSERT` hecho a mano o desde otro camino no se entera. Los pedidos para la misma sala se encolan |
| **Restricción `EXCLUDE`** con `btree_gist` sobre el rango horario de la función | La base rechaza la superposición venga de donde venga | Requiere migración con SQL a mano y la extensión `btree_gist` en Supabase. Hay que guardar el fin de la función (o la duración con margen) como columna, **duplicando** la regla de `lib/cartelera.ts` en SQL. Si cambia la duración de una película, ese rango queda viejo. El mensaje del 409 hay que reconstruirlo con otra consulta |

## Decisión

Elegimos **el bloqueo sobre la sala**.

Porque cierra la carrera sin duplicar la regla en otro lenguaje ni agregar una columna derivada que puede quedar desactualizada. Además, las dos puertas por las que alguien da de alta una función pasan hoy por `crearFuncion`: la Server Action de `/gestion/funciones/nueva` y `POST /api/funciones`. El seed (`prisma/seed.ts`) inserta directo con `prisma.funcion.create`, pero aplica la misma regla (`funcionesEnConflicto`) y corre solo, sin nadie que compita con él.

Cómo queda en `lib/db/funciones.ts`:

- La película se sigue validando fuera de la transacción: no participa de la carrera.
- `prisma.$transaction(async (tx) => …)`:
  1. `bloquearSala(tx, salaId)`: `SELECT "id" FROM "Sala" WHERE "id" = $1 FOR UPDATE`, con el id como parámetro y no concatenado.
  2. Lee la sala (404 o 409 si está eliminada), busca las candidatas con `tx` y aplica `funcionesEnConflicto`.
  3. `create` con `tx`.
- Un segundo pedido para la misma sala queda esperando en el paso 1 hasta que el primero confirme. Cuando busca candidatas, ya ve la función nueva y responde el 409 de siempre.

## Consecuencias

- `e2e/concurrencia.spec.ts` queda en verde: una función por sala, 45 respuestas 409 y ningún 500, en 5 de 5 corridas.
- No hay migración, así que no hace falta `prisma migrate deploy` en producción para este cambio.
- Las altas de funciones en **la misma sala** quedan en fila. Con una sola persona programando la cartelera, eso no se nota. La transacción usa los plazos por defecto de Prisma (2 s para conseguir conexión, 5 s de duración). Si alguna vez se cargaran funciones en lote para una sala, esa es la primera cuenta que hay que revisar.
- **No cubre otro camino que inserte funciones sin pasar por `crearFuncion`.** Si aparece uno, tiene que usar el mismo bloqueo o hay que reconsiderar el `EXCLUDE`.
- **Carrera relacionada que queda abierta:** `eliminarSalaLogico` (`lib/db/salas.ts`) chequea que la sala no tenga funciones futuras y después la da de baja, sin bloquear la sala. Una función creada justo en el medio podría quedar en una sala eliminada. No es parte de este cambio. Si se quiere cerrar, alcanza con que `eliminarSalaLogico` tome el mismo bloqueo antes de su chequeo.
