# Contrato de la API

Este documento especifica el contrato de la API REST para el sistema Cinema MDW 2026.

## Reglas generales de error
- **401 Unauthorized:** cuando la ruta requiere sesion y el usuario no esta autenticado.
- **403 Forbidden:** cuando el usuario esta autenticado pero su rol no corresponde (ej. Usuario intentando acceder a rutas de Administrador).
- **404 Not Found:** cuando el recurso solicitado por `:id` no existe, o si no pertenece al usuario que lo solicita.
- **409 Conflict:** cuando la operacion genera un conflicto de estado o rompe una regla de negocio.

---

## Usuarios (H1)

| Metodo | Ruta | Que hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/usuarios` | Registro de usuario (H1) | publico | **400** contraseña < 8 caracteres<br>**409** email ya registrado |

## Salas y Butacas (H2, H5)

| Metodo | Ruta | Que hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/salas` | Crear una sala y sus butacas (H2) | ADMINISTRADOR | **400** filas o columnas <= 0<br>**401** sin sesion<br>**403** rol incorrecto<br>**409** sala con nombre duplicado |
| `GET` | `/api/salas` | Listar salas vigentes | ADMINISTRADOR | **400** `limite` fuera de rango (1 a 100, por defecto 50)<br>**401** sin sesion<br>**403** rol incorrecto |
| `DELETE` | `/api/salas/:id` | Baja logica de sala (H5) | ADMINISTRADOR | **401** sin sesion<br>**403** rol incorrecto<br>**404** no existe<br>**409** sala con funciones futuras o en curso |

## Peliculas (H6)

| Metodo | Ruta | Que hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/peliculas` | Crear pelicula | GESTOR_CARTELERA | **400** clasificacion o categoria fuera de la lista, duracion invalida<br>**401** sin sesion<br>**403** rol incorrecto |
| `GET` | `/api/peliculas` | Listar peliculas | GESTOR_CARTELERA | **400** `limite` fuera de rango (1 a 100, por defecto 50)<br>**401** sin sesion<br>**403** rol incorrecto |
| `PATCH` | `/api/peliculas/:id` | Editar pelicula | GESTOR_CARTELERA | **400** campo invalido o body sin ningun campo conocido<br>**401** sin sesion<br>**403** rol incorrecto<br>**404** no existe o esta fuera de cartelera |
| `DELETE` | `/api/peliculas/:id` | Sacar de cartelera (H6) | GESTOR_CARTELERA | **401** sin sesion<br>**403** rol incorrecto<br>**404** no existe o ya estaba dada de baja<br>**409** pelicula con funciones futuras o en curso |

`DELETE` es una **baja logica** (`bajaEn`) y responde **204** sin cuerpo. La pelicula deja de
aparecer en `GET /api/peliculas` y en la cartelera publica, y no admite funciones nuevas
(`POST /api/funciones` la rechaza con 409), pero sus funciones pasadas y las compras que las
tienen quedan intactas: es lo que hace que el historial de H4 siga siendo legible. Dada de baja,
la pelicula queda fuera de alcance tambien para el `PATCH` y para otra baja, y las dos responden
**404**, igual que un id que no existe.

El 409 de la baja cubre las funciones **futuras y las que todavia estan en curso**: la gente ya
compro entradas para verlas. `GET /api/peliculas` es el catalogo del gestor y no la vitrina del
cine —esa es `GET /api/funciones`, publica—, por eso pide sesion.

Esta regla —que funciones impiden una baja— es una sola implementacion, compartida por H5 y H6:
`funcionesQueImpidenBaja` en `lib/bajas.ts`, sin dependencias de Prisma ni de Next. `lib/db/salas.ts`
y `lib/db/peliculas.ts` solo consultan las funciones candidatas y delegan el veredicto. El 409 de
las dos operaciones enumera hasta 5 funciones (titulo y horario) y la cantidad total, en vez de un
mensaje generico que no dice cuales.

## Funciones y Cartelera (H3)

| Metodo | Ruta | Que hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/funciones` | Crear funcion (H3) | GESTOR_CARTELERA | **400** funcion con fecha/hora en el pasado<br>**401** sin sesion<br>**403** rol incorrecto<br>**404** pelicula o sala inexistente<br>**409** solapamiento de funciones en la misma sala (margen de 15 min)<br>**409** pelicula dada de baja<br>**409** sala eliminada |
| `GET` | `/api/funciones` | Ver cartelera publica | publico | **400** `limite` fuera de rango (1 a 100, por defecto 50) |
| `GET` | `/api/funciones/:id/butacas` | Ver butacas de una funcion | publico | **404** no existe |

La cartelera publica devuelve solo funciones **futuras**, de salas no eliminadas y de peliculas en
cartelera. En `/api/funciones/:id/butacas`, `ocupada` es un valor **calculado**: hay una Entrada de
una Compra `PAGADA` para esa butaca en esa funcion. No es un atributo de Butaca.

## Compras y Flujo Principal (H4)

| Metodo | Ruta | Que hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/compras` | Comprar entradas (H4) | USUARIO | **400** sin butacas seleccionadas<br>**401** sin sesion<br>**402** pago rechazado (la compra no se persiste)<br>**403** rol incorrecto<br>**404** funcion inexistente<br>**409** butaca ya vendida para esa funcion<br>**409** butaca que no pertenece a la sala de esa funcion<br>**409** funcion ya empezada |
| `GET` | `/api/compras` | Historial de compras | USUARIO | **400** `limite` fuera de rango (1 a 100, por defecto 50)<br>**401** sin sesion<br>**403** rol incorrecto |

La compra es la operacion del flujo principal, por eso tiene ruta propia con sustantivo y no es el
alta de un CRUD. No hay reserva temporal: la disponibilidad se valida recien al confirmar, y la
Compra con sus Entradas se escribe en una transaccion. Lo que evita la sobreventa cuando dos
compras llegan a la vez es la restriccion `@@unique([funcionId, butacaId])` de Entrada; las
verificaciones previas estan para no cobrarle a quien va a perder esa carrera.

El pago es simulado (`lib/pagos.ts`): resuelve al instante, asi que no existe el estado
"pendiente". Aprobado, la Compra queda `PAGADA`; rechazado, no se persiste nada y responde **402**.

El `usuarioId` sale siempre de la sesion: el del body y el de la query string se ignoran. Por eso
`GET /api/compras` devuelve solo las compras propias y no hace falta un 404 por compra ajena. El
historial muestra las funciones pasadas aunque la sala este eliminada o la pelicula dada de baja.

---

## Los errores, en detalle

Todo error de la API devuelve el mismo cuerpo, sin importar el endpoint:

```json
{ "error": "<mensaje para la persona>", "detalles": [{ "campo": "...", "mensaje": "..." }] }
```

Son dos audiencias distintas en el mismo cuerpo. `error` es el mensaje pensado para mostrarse tal
cual a quien usa la aplicacion. `detalles` solo aparece en los 400 de validacion de Zod: es el dato
que un cliente puede usar para marcar el campo con error en un formulario — cada entrada trae el
`campo` (la ruta dentro del body, p. ej. `"filas"`) y el `mensaje` puntual de esa regla.

Un **500** nunca devuelve el `message` real del error: el detalle queda en el log del servidor
(`console.error` en `respuestaDeError`, `lib/api/respuestas.ts`) y quien llama solo recibe "Error
interno del servidor". Es a proposito — el mensaje de una excepcion no controlada puede filtrar
detalles internos (una ruta de archivo, una version de libreria, un stack trace) que no le sirven a
un cliente y si le sirven a quien este mirando la respuesta con otra intencion.

### Errores transversales

Los siguientes status se repiten en varios endpoints con el mismo mecanismo. No se repiten fila por
fila en el catalogo de abajo; el catalogo solo lista lo que cada operacion agrega de propio.

| Situacion | Status | Mensaje al usuario | Nota |
|---|---|---|---|
| El body o la query no pasan algun schema de Zod (campo faltante, fuera de rango, formato invalido, etc.) | 400 | "Los datos enviados no son validos" | Viene con `detalles`, un `{ campo, mensaje }` por cada regla de Zod que fallo. Es el unico caso con `detalles` en el cuerpo. |
| El body no es JSON valido (vacio o mal formado) | 400 | "El cuerpo del request no es JSON valido" | `request.json()` lanza `SyntaxError` antes de llegar al schema; es un error de quien llama, no un 500. |
| No hay sesion iniciada en una ruta que la requiere | 401 | "Necesitas iniciar sesion" | `requerirUsuario()`, `lib/auth.ts`. |
| Hay sesion, pero el rol no es el que la ruta exige | 403 | "No tenes permiso para hacer esto" | `requerirUsuario(rol)`, mismo origen que el 401. |
| El recurso de `:id` no existe, o existe pero no pertenece a quien pregunta | 404 | Mensaje propio de cada entidad (p. ej. "No se encontro la sala con id `<id>`") | Un recurso ajeno responde exactamente lo mismo que uno inexistente — nunca 403 — para que no se puedan confirmar ids probando de a uno (ver "Reglas generales de error" al principio de este documento). |
| El pago simulado no se aprueba (`POST /api/compras`) | 402 | El motivo que devuelve `lib/pagos.ts`, p. ej. "El pago fue rechazado por la entidad emisora" | Es 402 y no 409: no hay nada en la base que reintentar cambie — con otro medio de pago la misma compra sale bien. Solo lo dispara este endpoint, pero comparte el mecanismo de esta tabla: mensaje fijo, sin `detalles`. |
| Cualquier error no contemplado por las clases de `lib/errores.ts` | 500 | "Error interno del servidor" | El error real se loguea en el servidor y nunca sale en la respuesta. |

### Catalogo por operacion

Los errores de negocio: los que dependen del estado de la base y estan atados a un criterio de
aceptacion puntual de `docs/spec.md`. Cada mensaje sale tal cual del codigo — de las clases de
`lib/errores.ts` y de los `throw` de `lib/db/` —, no se resume ni se inventa.

Quedan afuera de esta tabla los endpoints cuyos errores son enteramente transversales: los `GET` de
listados y de la cartelera (solo el 400 de `limite`), `GET /api/funciones/:id/butacas` (solo el 404
generico) y `PATCH /api/peliculas/:id` (400 de Zod y 404 generico — no hay una historia de usuario
de "editar pelicula" en el spec).

| Operacion | Situacion | Status | Mensaje al usuario | Criterio (spec) |
|---|---|---|---|---|
| `POST /api/usuarios` | La contraseña tiene menos de 8 caracteres | 400 | "La contraseña necesita al menos 8 caracteres" | H1, criterio 3 |
| `POST /api/usuarios` | Ya existe una cuenta con ese email | 409 | "Ya existe una cuenta registrada con ese email" | H1, criterio 2 |
| `POST /api/salas` | La cantidad de filas o de columnas es cero o negativa | 400 | "La sala necesita al menos 1 fila" (o el mensaje equivalente para columnas) | H2, criterio 3 |
| `POST /api/salas` | Ya existe una sala con ese nombre (incluida una eliminada: el nombre queda reservado) | 409 | 'Ya existe una sala con el nombre "`<nombre>`". Si fue eliminada, su nombre queda reservado y no se puede reutilizar.' | H2, criterio 2 |
| `DELETE /api/salas/:id` | La sala no existe | 404 | "No se encontro la sala con id `<id>`" | H5, criterio 4 |
| `DELETE /api/salas/:id` | La sala tiene una o mas funciones futuras o en curso | 409 | 'No se puede eliminar la sala "`<nombre>`" porque tiene funciones en curso o programadas: `<hasta 5 funciones, con titulo y horario>` (`<n>` en total).' | H5, criterio 2 |
| `DELETE /api/peliculas/:id` | La pelicula no existe, o ya estaba dada de baja | 404 | "No se encontro la pelicula con id `<id>`" | H6, criterio 4 |
| `DELETE /api/peliculas/:id` | La pelicula tiene una o mas funciones futuras o en curso | 409 | 'No se puede sacar de cartelera "`<titulo>`" porque tiene funciones en curso o programadas: `<hasta 5 funciones, con titulo y horario>` (`<n>` en total). Hay que esperar a que terminen o darlas de baja primero.' | H6, criterio 2 |
| `POST /api/funciones` | La fecha/hora de la funcion es anterior a la actual | 400 | "La funcion no puede empezar en el pasado" | H3, criterio 3 |
| `POST /api/funciones` | La sala ya tiene otra funcion que se superpone en horario (margen de 15 min) | 409 | 'La sala `<nombre>` ya tiene la funcion de "`<titulo>`" a las `<hora>` (`<duracion>` min). Entre una funcion y la siguiente tienen que quedar al menos 15 minutos' | H3, criterio 2 |
| `POST /api/funciones` | La pelicula esta dada de baja | 409 | 'La pelicula "`<titulo>`" esta fuera de cartelera: no admite funciones nuevas' | H3, criterio 4 |
| `POST /api/funciones` | La sala esta eliminada | 409 | 'La sala `<nombre>` esta eliminada: no admite funciones nuevas' | H5, criterio 1* |
| `POST /api/compras` | No se selecciono ninguna butaca | 400 | "Tenes que seleccionar al menos una butaca" | H4, criterio 4 |
| `POST /api/compras` | El pago simulado es rechazado | 402 | El motivo de `lib/pagos.ts` (p. ej. "El pago fue rechazado por la entidad emisora") | H4, criterio 3 |
| `POST /api/compras` | Una o mas butacas ya fueron vendidas para esa funcion (chequeo previo, o carrera resuelta por el indice unico) | 409 | "Una de las butacas que elegiste ya fue vendida para esta funcion. No se te cobro nada" (o la variante en plural, "`<n>` de las butacas...") | H4, criterio 2 |

\* H3 no tiene un criterio propio para este caso; se cita H5 porque es ahi donde el spec lo dice
explicitamente: una sala eliminada "no aparece para programar funciones nuevas" (H5, criterio 1) y
"no admite funciones nuevas" (spec, seccion 6).

**Errores reales del codigo sin criterio de aceptacion en `docs/spec.md`** — se documentan aca
porque existen y se pueden probar, pero no entran en la tabla de arriba porque no hay una fila de
`docs/spec.md` que citar sin inventarla:

- `POST /api/compras` responde **409** ("Alguna de las butacas elegidas no pertenece a la sala de
  esta funcion") si alguna butaca del pedido no es de la sala de la funcion. Protege la relacion
  Butaca–Sala (spec, seccion 3), pero ningun criterio de H4 lo pide explicitamente.
- `POST /api/compras` responde **409** ('La funcion de "`<titulo>`" ya empezo: no se pueden comprar
  entradas') si la funcion ya arranco. Ni H4 ni la seccion 6 de reglas de negocio lo mencionan hoy.

Se abre una issue aparte para sumar estos dos casos como criterios de H4 en `docs/spec.md`.
