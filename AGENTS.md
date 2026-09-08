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
| Un error de negocio | `lib/errores.ts` |
| Algo compartido por todos los endpoints | `lib/api/<tema>.ts` |
| Un helper sin dependencias | `lib/utils.ts` |

## Reglas

### Datos
- **Todo acceso a la base pasa por `lib/db/`.** Está prohibido importar el cliente de Prisma en componentes o en `app/`.
- El cliente de Prisma se importa solo desde `lib/db/client.ts`.
- Toda consulta que devuelva listas tiene paginación o límite explícito.
- Las funciones de `lib/db/` **no conocen `Request` ni `Response`**: reciben datos ya validados y, si hace falta saber quién pregunta, el `usuarioId` por parámetro. Nada de headers, cookies ni status codes ahí adentro.
- Toda consulta lleva `select` explícito. Sin `select`, un `findUnique` de Usuario devuelve también el `passwordHash`.
- Las reglas que dependen del estado de la base (butaca vendida, función superpuesta, email repetido) se validan en `lib/db/` —no en Zod, que no ve la base— y se comunican lanzando un error de `lib/errores.ts`.

### Capa API
- **Un Route Handler hace cuatro cosas y en este orden: validar → autorizar → delegar → responder.** La lógica vive en `lib/db/`; el handler traduce HTTP.
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

### Seguridad
- **La autorización se verifica siempre en el servidor**, en cada Route Handler y cada Server Action. Que la UI esconda un botón no es una medida de seguridad.
- Nunca confiar en un `userId` o un `role` que venga del cliente: se leen de la sesión con `obtenerUsuario()` / `requerirUsuario(rol)` de `lib/auth.ts`, y bajan a `lib/db/` por parámetro.
- Hasta la clase 6 hay un stub de sesión en `lib/auth.ts` (header `x-usuario-prueba`) que solo funciona con `AUTH_STUB_HABILITADO="true"` y jamás en producción. No setear esa variable en Vercel; se borra cuando entre Auth.js.
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
