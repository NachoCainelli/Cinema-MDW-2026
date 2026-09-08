# Contrato de la API

Este documento especifica el contrato de la API REST para el sistema Cinema MDW 2026.

## Reglas generales de error
- **401 Unauthorized:** cuando la ruta requiere sesión y el usuario no está autenticado.
- **403 Forbidden:** cuando el usuario está autenticado pero su rol no corresponde (ej. Usuario intentando acceder a rutas de Administrador).
- **404 Not Found:** cuando el recurso solicitado por `:id` no existe, o si no pertenece al usuario que lo solicita.
- **409 Conflict:** cuando la operación genera un conflicto de estado o rompe una regla de negocio.

---

## Usuarios (H1)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/usuarios` | Registro de usuario (H1) | público | **400** contraseña < 8 caracteres<br>**409** email ya registrado |

## Salas y Butacas (H2, H5)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/salas` | Crear una sala y sus butacas (H2) | ADMINISTRADOR | **400** filas o columnas <= 0<br>**401** sin sesión<br>**403** rol incorrecto<br>**409** sala con nombre duplicado |
| `GET` | `/api/salas` | Listar salas y butacas | ADMINISTRADOR | **401** sin sesión<br>**403** rol incorrecto |
| `DELETE` | `/api/salas/:id` | Baja lógica de sala (H5) | ADMINISTRADOR | **401** sin sesión<br>**403** rol incorrecto<br>**404** no existe<br>**409** sala con funciones futuras |

## Películas (H6)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/peliculas` | Crear película | GESTOR_CARTELERA | **400** clasificación o categoría fuera de la lista, duración inválida<br>**401** sin sesión<br>**403** rol incorrecto |
| `GET` | `/api/peliculas` | Listar películas | GESTOR_CARTELERA | **400** `limite` fuera de rango (1 a 100, por defecto 50)<br>**401** sin sesión<br>**403** rol incorrecto |
| `PATCH` | `/api/peliculas/:id` | Editar película | GESTOR_CARTELERA | **400** campo inválido o body sin ningún campo conocido<br>**401** sin sesión<br>**403** rol incorrecto<br>**404** no existe o está fuera de cartelera |
| `DELETE` | `/api/peliculas/:id` | Sacar de cartelera (H6) | GESTOR_CARTELERA | **401** sin sesión<br>**403** rol incorrecto<br>**404** no existe o ya estaba dada de baja<br>**409** película con funciones futuras |

`DELETE` es una **baja lógica** (`bajaEn`) y responde **204** sin cuerpo. La película deja de
aparecer en `GET /api/peliculas` y en la cartelera pública, y no admite funciones nuevas
(`POST /api/funciones` la rechaza con 409), pero sus funciones pasadas y las compras que las
tienen quedan intactas: es lo que hace que el historial de H4 siga siendo legible. Dada de baja,
la película queda fuera de alcance también para el `PATCH` y para otra baja, y las dos responden
**404**, igual que un id que no existe.

El 409 de la baja cubre las funciones **futuras y las que todavía están en curso**: la gente ya
compró entradas para verlas. `GET /api/peliculas` es el catálogo del gestor y no la vitrina del
cine —esa es `GET /api/funciones`, pública—, por eso pide sesión.

## Funciones y Cartelera (H3)

| Método | Ruta | Qué hace | Rol autorizado | Errores (status + motivo) |
|---|---|---|---|---|
| `POST` | `/api/funciones` | Crear función (H3) | GESTOR_CARTELERA | **400** función con fecha/hora en el pasado<br>**401** sin sesión<br>**403** rol incorrecto<br>**404** película o sala inexistente<br>**409** solapamiento de funciones en la misma sala (margen de 15 min)<br>**409** película dada de baja<br>**409** sala eliminada |
| `GET` | `/api/funciones` | Ver cartelera pública | público | **400** `limite` fuera de rango (1 a 100, por defecto 50) |
| `GET` | `/api/funciones/:id/butacas` | Ver butacas de una función | público | **404** no existe |

La cartelera pública devuelve solo funciones **futuras**, de salas no eliminadas y de películas en
cartelera. En `/api/funciones/:id/butacas`, `ocupada` es un valor **calculado**: hay una Entrada de
una Compra `PAGADA` para esa butaca en esa función. No es un atributo de Butaca.

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
