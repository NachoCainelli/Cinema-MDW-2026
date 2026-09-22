# AGENTS.md — reglas de este proyecto

Este archivo lo lee tu asistente de IA (Cursor, Copilot, Claude Code, etc.) antes de escribir código. Manténlo actualizado: si el equipo cambia una convención y esto no lo refleja, la IA va a seguir escribiendo con la convención vieja.

> **Cómo se escribe una regla acá:** verificable, no aspiracional. "Escribir código limpio" no es una regla. "Un componente por archivo, en PascalCase" sí lo es.

## Qué es este proyecto

<Completar en la clase 1: qué hace el sistema, quiénes son los dos roles y cuál es el flujo principal.>

## Stack

- Next.js (App Router) + TypeScript
- Postgres + Prisma (o MongoDB Atlas + Prisma, si el equipo lo eligió y lo documentó en un ADR)
- Zod para validación
- Auth.js para sesión y roles
- Tailwind + shadcn/ui
- Deploy en Vercel

## Comandos

```bash
pnpm dev                         # desarrollo
pnpm build                       # build de producción
pnpm typecheck                   # chequeo de tipos
pnpm test                        # tests
pnpm db:migrate --name <nombre>  # migración de Prisma
```

Después de tocar `prisma/schema.prisma`, siempre generar una migración. Nunca editar SQL de migraciones ya aplicadas.

## Estructura y dónde va cada cosa

| Si vas a escribir… | Va en… |
|---|---|
| Una página | `app/(public)/` si es sin sesión, `app/(app)/` si requiere sesión |
| Un endpoint | `app/api/<recurso>/route.ts` |
| Un componente reutilizable | `components/` |
| Una consulta a la base | `lib/db/<entidad>.ts` |
| Un schema de validación | `lib/schemas/<entidad>.ts` |
| Una regla de negocio pura | `lib/<dominio>.ts`, sin `import` de Prisma ni de Next |
| Un error de negocio | `lib/errores.ts` |
| Algo compartido por todos los endpoints | `lib/api/<tema>.ts` |
| Un helper sin dependencias | `lib/utils.ts` |

## Reglas

### Datos
- **Todo acceso a la base pasa por `lib/db/`.** Está prohibido importar el cliente de Prisma en componentes o en `app/`.
- El cliente de Prisma se importa solo desde `lib/db/client.ts`.
- Toda consulta que devuelva listas tiene paginación o límite explícito.
- Las funciones de `lib/db/` **no conocen `Request` ni `Response`**: reciben datos ya validados y, si hace falta saber quién pregunta, el `usuarioId` por parámetro. Nada de headers, cookies ni status codes ahí adentro.
- **Ninguna consulta que pueda devolver datos de un usuario sale sin su id adentro del `where`.** Si aparece un `if` comparando ids adentro de un `route.ts` (o en cualquier otro lado) para decidir si un dato es del usuario que pregunta, está mal: la pertenencia se filtra en la consulta misma (`where: { usuarioId }`, como `listarComprasDeUsuario` en `lib/db/compras.ts`), no después con una comparación aparte. Un `if` de ese tipo es indistinguible, en el commit siguiente, de un bug que se olvidó de comparar contra algo.
- Para modificar un recurso que le pertenece a alguien, usar `updateMany({ where: { id, usuarioId } })` en vez de `update({ where: { id } })` seguido de un chequeo de dueño aparte: `update` exige un `where` único (el id) y dejaría la comprobación de pertenencia para un `if` posterior — exactamente el patrón que el punto anterior prohíbe. (Hoy ningún endpoint edita un recurso propiedad de un usuario —las compras son inmutables una vez creadas—, así que esta regla no tiene todavía un caso real en el código; aplica desde el primer endpoint que lo necesite.)
- Toda consulta lleva `select` explícito. Sin `select`, un `findUnique` de Usuario devuelve también el `passwordHash`.
- **El `select` de un endpoint público es una decisión, no un reuso.** No compartir el mismo objeto de `select` entre la respuesta de un endpoint protegido y la de uno público, aunque hoy tengan los mismos campos: si mañana alguien le agrega un campo al primero para una pantalla interna, ese campo se termina publicando sin que nadie lo haya decidido. Ver `camposDeFuncionParaGestor` vs. `camposDeFuncionPublicos` en `lib/db/funciones.ts`.
- Las reglas que dependen del estado de la base (butaca vendida, función superpuesta, email repetido) se validan en `lib/db/` —no en Zod, que no ve la base— y se comunican lanzando un error de `lib/errores.ts`.
- `lib/db/` sigue siendo el único que consulta la base: lee los datos, se los pasa a la regla pura de `lib/<dominio>.ts` y traduce su veredicto a un error de `lib/errores.ts`. La regla pura devuelve un veredicto (un array vacío, un booleano), no lanza.

### Capa API
- **Un Route Handler hace cuatro cosas y en este orden: autorizar → validar → delegar → responder.** La lógica vive en `lib/db/`; el handler traduce HTTP.
  - **Por qué autorizar va primero:** la sesión y el rol no dependen de nada del request —ni del body, ni de la query, ni del id de la ruta—, así que verificarlos no exige mirar si esos datos son válidos. Autorizar antes de validar significa que una request sin sesión corta con 401 sin importar qué tan roto venga el body; si se validara primero, alguien sin sesión podría enterarse de si su body pasa o no las reglas de Zod (nombres de campo, rangos, formatos) antes de que el sistema le diga que ni siquiera puede estar ahí. El orden completo que enseña la clase es sesión (401) → rol (403) → body/query (400) → regla de negocio (404/409).
  - **Por qué el 404 de `PATCH /api/peliculas/:id` no se adelanta al 400:** ahí "el recurso existe y está en el estado correcto" y "aplicar el cambio" se resuelven en una sola escritura a la base (`where: { id, bajaEn: null }` + `update`, con el error de Prisma traducido a 404). Partir eso en dos pasos —un `findUnique` para el 404 y después, ya con el body validado, el `update`— agregaría una consulta que solo existe para cumplir el orden, y abriría una ventana entre "chequeé que existe" y "escribí" que hoy no existe. Se prioriza no crear esa ventana por sobre el orden literal; el 404 de este endpoint sigue saliendo del mismo `catch` que hoy, después de validar el body.
  - `DELETE /api/peliculas/:id` y `DELETE /api/salas/:id` son distintos, y no entran en el punto anterior: `darDeBajaPelicula` y `eliminarSalaLogico` (`lib/db/peliculas.ts`, `lib/db/salas.ts`) hacen un `findUnique`, chequean el estado con un `if` y recién después escriben —no una sola escritura condicionada—. No hace falta la excepción ahí porque no hay ningún 400 de body con el que competir: estos DELETE no tienen body, así que lo único que se valida antes de delegar es el id de la ruta, y el orden real es sesión (401) → rol (403) → id (400) → existe/estado (404) → regla de negocio (409), sin ventana nueva que evitar.
  - Esta decisión se tomó explícitamente en la revisión de permisos posterior a integrar Auth.js (ver `docs/permisos.md`), después de confirmar que ningún 409 de negocio es alcanzable sin pasar antes por la autorización en ninguno de los endpoints del contrato.
- El status code lo decide **un solo lugar**: `respuestaDeError` en `lib/api/respuestas.ts`. Ningún handler inventa el suyo.
- Los errores de negocio se lanzan con las clases de `lib/errores.ts` (`ErrorNoAutenticado` 401, `ErrorNoAutorizado` 403, `ErrorNoEncontrado` 404, `ErrorDeConflicto` 409). Nunca `new Error("no existe")`: identificar un error por su mensaje se rompe con la primera corrección de texto.
- Un 500 nunca devuelve el `message` del error al cliente; el detalle va al log del servidor.
- Un recurso que no existe y uno ajeno responden **lo mismo** (404). Si el ajeno respondiera 403, se podría averiguar qué ids existen probando de a uno.

Plantilla de endpoint:

```ts
// app/api/salas/route.ts
export async function POST(request: Request) {
  try {
    const usuario = await requerirUsuario("ADMINISTRADOR"); // 401 / 403
    const datos = crearSalaSchema.parse(await request.json()); // 400
    const sala = await crearSala(datos, usuario.id); // 404 / 409
    return NextResponse.json(sala, { status: 201 });
  } catch (error) {
    return respuestaDeError(error);
  }
}
```

### Validación
- **Toda entrada externa se valida con un schema de Zod** definido en `lib/schemas/`. Entrada externa = body de un request, params, query string, formulario, respuesta de una API de terceros.
- El mismo schema se usa en el cliente y en el servidor. No duplicar reglas de validación.
- Prohibido `any`. Si no se conoce el tipo, usar `unknown` y validar.
- **`usuarioId` y `rol` no son campos que mande el cliente sobre sí mismo.** Ningún schema de `lib/schemas/` acepta un `usuarioId` (la identidad sale siempre de la sesión, nunca del body ni de la query — ver `crearCompraSchema`), y el registro público (`registrarUsuarioSchema`) no acepta `rol` (toda cuenta nueva nace `USUARIO`, sin excepción — ver `lib/db/usuarios.ts`). La única excepción real es `crearCuentaStaffSchema`, que sí tiene un campo `rol`: ahí no es la identidad de quien llama, es el rol que un `ADMINISTRADOR` ya autenticado le asigna a la cuenta *que está creando* — la regla que importa no es "rol nunca en un schema", es "el rol o el id de quien hace el request no puede venir del cliente", y esa sigue sin violarse.

### Seguridad
- **La autorización se verifica siempre en el servidor**, en cada Route Handler y cada Server Action. Que la UI esconda un botón no es una medida de seguridad.
- Nunca confiar en un `userId` o un `role` que venga del cliente: se leen de la sesión con `obtenerUsuario()` / `requerirUsuario(rol)` de `lib/auth.ts`, y bajan a `lib/db/` por parámetro.
- La sesión es de Auth.js (`lib/auth.ts`), con Google y Credentials y `strategy: "jwt"`. El rol se lee de la base al iniciar sesión y viaja en el token: ningún camino de login ni de registro toma el rol de lo que manda el cliente, y una cuenta nueva siempre nace `USUARIO`.
- Los secretos van en variables de entorno. Ninguna variable con secretos lleva el prefijo `NEXT_PUBLIC_`.
- pnpm es el único gestor de paquetes permitido. No commitear `package-lock.json`, `yarn.lock` ni `bun.lock`.
- Toda dependencia nueva con scripts de instalación debe revisarse antes de aprobarla con `pnpm approve-builds`.
- No usar `pnpm dlx`: los ejecutables del proyecto se invocan mediante scripts declarados o `pnpm exec`.

### React / Next
- Los componentes son Server Components por defecto. `"use client"` solo si hay estado, efectos o eventos del navegador.
- Un componente por archivo, en PascalCase. Los archivos de utilidades, en camelCase.
- Los estados de carga y de error se resuelven siempre; no dejar la pantalla en blanco.

### Estilos
- Solo Tailwind. Nada de CSS suelto ni estilos inline salvo valores calculados en runtime.
- Los componentes de UI base salen de shadcn/ui y se editan en `components/ui/`.

### Git
- Ramas: `feat/<descripcion-corta>`, `fix/<descripcion-corta>`.
- Commits en imperativo y en español: "agrega validación de turnos superpuestos".
- Nunca commitear `.env.local` ni credenciales.

## Cómo quiero que trabajes

- Si la consigna es ambigua, **preguntá antes de escribir código**. No inventes reglas de negocio.
- Cambios chicos y enfocados. No refactorices archivos que no tienen que ver con la tarea.
- Antes de crear un helper nuevo, buscá si ya existe uno en `lib/`.
- Cuando toques algo de seguridad o del modelo de datos, explicá el porqué del cambio: son las dos áreas que se revisan línea por línea.
- No dejes comentarios `TODO (clase N)` una vez que el trabajo de esa clase ya está hecho: un TODO que ya no aplica es peor que no tener TODO, porque miente sobre el estado del código. `grep -rn "TODO (clase" .` tiene que devolver solo lo que realmente falta.
