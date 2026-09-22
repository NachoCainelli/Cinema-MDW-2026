# Contrato de la API

Este documento especifica el contrato de la API REST para el sistema Cinema MDW 2026.

## Reglas generales de error
- **401 Unauthorized:** cuando la ruta requiere sesión y el usuario no está autenticado.
- **403 Forbidden:** cuando el usuario está autenticado pero su rol no corresponde (ej. Usuario intentando acceder a rutas de Administrador).
- **404 Not Found:** cuando el recurso solicitado por `:id` no existe, o si no pertenece al usuario que lo solicita.
- **409 Conflict:** cuando la operación genera un conflicto de estado o rompe una regla de negocio.

En una ruta protegida, estas verificaciones corren en este orden: sesión (401) → rol (403) →
validación del body/query (400) → regla de negocio (404/409). La autorización va antes que la
validación de datos —no depende de ellos—, así que una request sin sesión o con el rol equivocado
corta ahí, sin importar si el body que mandó era válido o no (ver `AGENTS.md`, sección "Capa API",
para el razonamiento completo y la única excepción: el 404 de una baja lógica, que sigue saliendo
después del 400 porque "existe" y "aplicar el cambio" son una sola escritura a la base).

---

## Usuarios (H1)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/usuarios` | Registro de usuario (H1) | público | **400** contraseña < 8 caracteres<br>**409** email ya registrado |

## Salas y Butacas (H2, H5)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/salas` | Crear una sala y sus butacas (H2) | ADMINISTRADOR | **400** filas o columnas <= 0<br>**401** sin sesión<br>**403** rol incorrecto<br>**409** sala con nombre duplicado |
| `GET` | `/api/salas` | Listar salas vigentes | ADMINISTRADOR | **400** `limite` fuera de rango (1 a 100, por defecto 50)<br>**401** sin sesión<br>**403** rol incorrecto |
| `DELETE` | `/api/salas/:id` | Baja lógica de sala (H5) | ADMINISTRADOR | **401** sin sesión<br>**403** rol incorrecto<br>**404** no existe<br>**409** sala con funciones futuras o en curso |

## Películas (H6)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/peliculas` | Crear película | GESTOR_CARTELERA | **400** clasificación o categoría fuera de la lista, duración inválida<br>**401** sin sesión<br>**403** rol incorrecto |
| `GET` | `/api/peliculas` | Listar películas | GESTOR_CARTELERA | **400** `limite` fuera de rango (1 a 100, por defecto 50)<br>**401** sin sesión<br>**403** rol incorrecto |
| `PATCH` | `/api/peliculas/:id` | Editar película | GESTOR_CARTELERA | **400** campo inválido o body sin ningún campo conocido<br>**401** sin sesión<br>**403** rol incorrecto<br>**404** no existe o está fuera de cartelera |
| `DELETE` | `/api/peliculas/:id` | Sacar de cartelera (H6) | GESTOR_CARTELERA | **401** sin sesión<br>**403** rol incorrecto<br>**404** no existe o ya estaba dada de baja<br>**409** película con funciones futuras o en curso |

`DELETE` es una **baja lógica** (`bajaEn`) y responde **204** sin cuerpo. La película deja de
aparecer en `GET /api/peliculas` y en la cartelera pública, y no admite funciones nuevas
(`POST /api/funciones` la rechaza con 409), pero sus funciones pasadas y las compras que las
tienen quedan intactas: es lo que hace que el historial de H4 siga siendo legible. Dada de baja,
la película queda fuera de alcance también para el `PATCH` y para otra baja, y las dos responden
**404**, igual que un id que no existe.

El 409 de la baja cubre las funciones **futuras y las que todavía están en curso**: la gente ya
compró entradas para verlas. `GET /api/peliculas` es el catálogo del gestor y no la vitrina del
cine —esa es `GET /api/funciones`, pública—, por eso pide sesión.

Esta regla —qué funciones impiden una baja— es una sola implementación, compartida por H5 y H6:
`funcionesQueImpidenBaja` en `lib/bajas.ts`, sin dependencias de Prisma ni de Next. `lib/db/salas.ts`
y `lib/db/peliculas.ts` solo consultan las funciones candidatas y delegan el veredicto. El 409 de
las dos operaciones enumera hasta 5 funciones (título y horario) y la cantidad total, en vez de un
mensaje genérico que no dice cuáles.

## Funciones y Cartelera (H3)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/funciones` | Crear función (H3) | GESTOR_CARTELERA | **400** función con fecha/hora en el pasado<br>**401** sin sesión<br>**403** rol incorrecto<br>**404** película o sala inexistente<br>**409** solapamiento de funciones en la misma sala (margen de 15 min)<br>**409** película dada de baja<br>**409** sala eliminada |
| `GET` | `/api/funciones` | Ver cartelera pública | público | **400** `limite` fuera de rango (1 a 100, por defecto 50) |
| `GET` | `/api/funciones/:id/butacas` | Ver butacas de una función | público | **404** no existe |

La cartelera pública devuelve solo funciones **futuras**, de salas no eliminadas y de películas en
cartelera. En `/api/funciones/:id/butacas`, `ocupada` es un valor **calculado**: hay una Entrada de
una Compra `PAGADA` para esa butaca en esa función. No es un atributo de Butaca.

Los dos endpoints públicos de esta sección usan un `select` propio (`camposDeFuncionPublicos` en
`lib/db/funciones.ts`), distinto del que recibe el gestor al crear la función. Aunque hoy
coincidan campo por campo, son dos decisiones separadas: agregar un campo para la respuesta del
gestor no lo publica acá automáticamente.

## Compras y Flujo Principal (H4)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/compras` | Comprar entradas (H4) | USUARIO | **400** sin butacas seleccionadas<br>**401** sin sesión<br>**402** pago rechazado (la compra no se persiste)<br>**403** rol incorrecto<br>**404** función inexistente<br>**409** butaca ya vendida para esa función<br>**409** butaca que no pertenece a la sala de esa función<br>**409** función ya empezada |
| `GET` | `/api/compras` | Historial de compras | USUARIO | **400** `limite` fuera de rango (1 a 100, por defecto 50)<br>**401** sin sesión<br>**403** rol incorrecto |

La compra es la operación del flujo principal, por eso tiene ruta propia con sustantivo y no es el
alta de un CRUD. No hay reserva temporal: la disponibilidad se valida recién al confirmar, y la
Compra con sus Entradas se escribe en una transacción. Lo que evita la sobreventa cuando dos
compras llegan a la vez es la restricción `@@unique([funcionId, butacaId])` de Entrada; las
verificaciones previas están para no cobrarle a quien va a perder esa carrera.

El pago es simulado (`lib/pagos.ts`): resuelve al instante, así que no existe el estado
"pendiente". Aprobado, la Compra queda `PAGADA`; rechazado, no se persiste nada y responde **402**.

El `usuarioId` sale siempre de la sesión: el del body y el de la query string se ignoran. Por eso
`GET /api/compras` devuelve solo las compras propias y no hace falta un 404 por compra ajena. El
historial muestra las funciones pasadas aunque la sala esté eliminada o la película dada de baja.
`listarComprasDeUsuario` filtra por `usuarioId` en el `where` de la consulta, no con un chequeo
aparte sobre el resultado (ver `AGENTS.md`, sección "Datos").

---

## Los errores, en detalle

Todo error de la API devuelve el mismo cuerpo, sin importar el endpoint:

```json
{ "error": "<mensaje para la persona>", "detalles": [{ "campo": "...", "mensaje": "..." }] }
```

Son dos audiencias distintas en el mismo cuerpo. `error` es el mensaje pensado para mostrarse tal
cual a quien usa la aplicación. `detalles` solo aparece en los 400 de validación de Zod: es el dato
que un cliente puede usar para marcar el campo con error en un formulario — cada entrada trae el
`campo` (la ruta dentro del body, p. ej. `"filas"`) y el `mensaje` puntual de esa regla. Cuando la
regla es sobre el body entero y no sobre un campo —el `PATCH /api/peliculas/:id` sin ningún campo
conocido—, `campo` llega vacío (`""`).

Un **500** nunca devuelve el `message` real del error: el detalle queda en el log del servidor
(`console.error` en `respuestaDeError`, `lib/api/respuestas.ts`) y quien llama solo recibe "Error
interno del servidor". Es a propósito — el mensaje de una excepción no controlada puede filtrar
detalles internos (una ruta de archivo, una versión de librería, un stack trace) que no le sirven a
un cliente y sí le sirven a quien esté mirando la respuesta con otra intención.

### Errores transversales

Los siguientes status se repiten en varios endpoints con el mismo mecanismo. No se repiten fila por
fila en el catálogo de abajo; el catálogo solo lista lo que cada operación agrega de propio.

| Situación | Status | Mensaje al usuario | Nota |
|---|---|---|---|
| El body o la query no pasan algún schema de Zod (campo faltante, fuera de rango, formato inválido, etc.) | 400 | "Los datos enviados no son válidos" | Viene con `detalles`, un `{ campo, mensaje }` por cada regla de Zod que falló. Es el único caso con `detalles` en el cuerpo. En una ruta protegida corre después de la sesión y el rol: sin sesión, un body inválido responde 401, no 400 (ver "Reglas generales de error" al principio de este documento). |
| El body no es JSON válido (vacío o mal formado) | 400 | "El cuerpo del request no es JSON válido" | `request.json()` lanza `SyntaxError` antes de llegar al schema; es un error de quien llama, no un 500. En una ruta protegida, igual que el 400 de Zod: si no hay sesión, la respuesta es 401, porque la sesión se verifica antes de intentar leer el body. |
| No hay sesión iniciada en una ruta que la requiere | 401 | "Necesitás iniciar sesión" | `requerirUsuario()`, `lib/auth.ts`. Es la primera verificación de cada handler protegido, antes de validar nada del request. |
| Hay sesión, pero el rol no es el que la ruta exige | 403 | "No tenés permiso para hacer esto" | `requerirUsuario(rol)`, mismo origen que el 401. |
| El recurso de `:id` no existe, o existe pero no pertenece a quien pregunta | 404 | Mensaje propio de cada entidad (p. ej. "No se encontró la sala con id `<id>`") | Un recurso ajeno responde exactamente lo mismo que uno inexistente — nunca 403 — para que no se puedan confirmar ids probando de a uno (ver "Reglas generales de error" al principio de este documento). |
| El pago simulado no se aprueba (`POST /api/compras`) | 402 | El motivo que devuelve `lib/pagos.ts`, p. ej. "El pago fue rechazado por la entidad emisora" | Es 402 y no 409: no hay nada en la base que reintentar cambie — con otro medio de pago la misma compra sale bien. Solo lo dispara este endpoint, pero comparte el mecanismo de esta tabla: mensaje fijo, sin `detalles`. |
| Cualquier error no contemplado por las clases de `lib/errores.ts` | 500 | "Error interno del servidor" | El error real se loguea en el servidor y nunca sale en la respuesta. |

### Catálogo por operación

Los errores de negocio: los que dependen del estado de la base y están atados a un criterio de
aceptación puntual de `docs/spec.md`. Cada mensaje sale tal cual del código — de las clases de
`lib/errores.ts` y de los `throw` de `lib/db/` —, no se resume ni se inventa.

Quedan afuera de esta tabla los endpoints cuyos errores son enteramente transversales: los `GET` de
listados y de la cartelera (solo el 400 de `limite`), `GET /api/funciones/:id/butacas` (solo el 404
genérico) y `PATCH /api/peliculas/:id` (400 de Zod y 404 genérico — no hay una historia de usuario
de "editar película" en el spec).

| Operación | Situación | Status | Mensaje al usuario | Criterio (spec) |
|---|---|---|---|---|
| `POST /api/usuarios` | La contraseña tiene menos de 8 caracteres | 400 | "La contraseña necesita al menos 8 caracteres" | H1, criterio 3 |
| `POST /api/usuarios` | Ya existe una cuenta con ese email | 409 | "Ya existe una cuenta registrada con ese email" | H1, criterio 2 |
| `POST /api/salas` | La cantidad de filas o de columnas es cero o negativa | 400 | "La sala necesita al menos 1 fila" (o el mensaje equivalente para columnas) | H2, criterio 3 |
| `POST /api/salas` | Ya existe una sala con ese nombre (incluida una eliminada: el nombre queda reservado) | 409 | 'Ya existe una sala con el nombre "`<nombre>`". Si fue eliminada, su nombre queda reservado y no se puede reutilizar.' | H2, criterio 2 |
| `DELETE /api/salas/:id` | La sala no existe | 404 | "No se encontró la sala con id `<id>`" | H5, criterio 4 |
| `DELETE /api/salas/:id` | La sala tiene una o más funciones futuras o en curso | 409 | 'No se puede eliminar la sala "`<nombre>`" porque tiene funciones en curso o programadas: `<hasta 5 funciones, con título y horario>` (`<n>` en total).' | H5, criterio 2 |
| `DELETE /api/peliculas/:id` | La película no existe, o ya estaba dada de baja | 404 | "No se encontró la película con id `<id>`" | H6, criterio 4 |
| `DELETE /api/peliculas/:id` | La película tiene una o más funciones futuras o en curso | 409 | 'No se puede sacar de cartelera "`<título>`" porque tiene funciones en curso o programadas: `<hasta 5 funciones, con título y horario>` (`<n>` en total). Hay que esperar a que terminen o darlas de baja primero.' | H6, criterio 2 |
| `POST /api/funciones` | La fecha/hora de la función es anterior a la actual | 400 | "La función no puede empezar en el pasado" | H3, criterio 3 |
| `POST /api/funciones` | La sala ya tiene otra función que se superpone en horario (margen de 15 min) | 409 | 'La sala `<nombre>` ya tiene la función de "`<título>`" a las `<inicio>` (`<duración>` min). Entre una función y la siguiente tienen que quedar al menos 15 minutos' — `<inicio>` es la fecha y hora completas en ISO 8601 y en UTC (p. ej. `2026-09-16T21:04:52.813Z`), no solo la hora | H3, criterio 2 |
| `POST /api/funciones` | La película está dada de baja | 409 | 'La película "`<título>`" está fuera de cartelera: no admite funciones nuevas' | H3, criterio 4 |
| `POST /api/funciones` | La sala está eliminada | 409 | 'La sala `<nombre>` está eliminada: no admite funciones nuevas' | H5, criterio 1* |
| `POST /api/compras` | No se seleccionó ninguna butaca | 400 | "Tenés que seleccionar al menos una butaca" | H4, criterio 4 |
| `POST /api/compras` | El pago simulado es rechazado | 402 | El motivo de `lib/pagos.ts` (p. ej. "El pago fue rechazado por la entidad emisora") | H4, criterio 3 |
| `POST /api/compras` | Una o más butacas ya fueron vendidas para esa función (chequeo previo, o carrera resuelta por el índice único) | 409 | "Una de las butacas que elegiste ya fue vendida para esta función. No se te cobró nada" (o la variante en plural, "`<n>` de las butacas...") | H4, criterio 2 |

\* H3 no tiene un criterio propio para este caso; se cita H5 porque es ahí donde el spec lo dice
explícitamente: una sala eliminada "no aparece para programar funciones nuevas" (H5, criterio 1) y
"no admite funciones nuevas" (spec, sección 6).

**Errores reales del código sin criterio de aceptación en `docs/spec.md`** — se documentan acá
porque existen y se pueden probar, pero no entran en la tabla de arriba porque no hay una fila de
`docs/spec.md` que citar sin inventarla:

- `POST /api/compras` responde **409** ("Alguna de las butacas elegidas no pertenece a la sala de
  esta función") si alguna butaca del pedido no es de la sala de la función. Protege la relación
  Butaca–Sala (spec, sección 3), pero ningún criterio de H4 lo pide explícitamente.
- `POST /api/compras` responde **409** ('La función de "`<título>`" ya empezó: no se pueden comprar
  entradas') si la función ya arrancó. Ni H4 ni la sección 6 de reglas de negocio lo mencionan hoy.

Se abre una issue aparte para sumar estos dos casos como criterios de H4 en `docs/spec.md`.
