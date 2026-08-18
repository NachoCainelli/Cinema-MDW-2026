# Proyecto MDW 2026 — <NOMBRE DEL SISTEMA>

> Reemplazá este bloque en la clase 1.

**Equipo:**

- Nombre Apellido — responsable del repositorio (creó el repo y tiene la cuenta de Vercel)
- Nombre Apellido
- Nombre Apellido
- Nombre Apellido

**Producción:** https://<tu-proyecto>.vercel.app
**Problema que resuelve:** una oración.
**Flujo principal:** una oración.

---

## Puesta en marcha

Requisitos: Node 22.13+, Corepack y una base de datos: **Postgres** (Supabase) o **MongoDB** (Atlas). Las dos tienen plan gratuito.

Activar la versión de pnpm declarada por el proyecto:

```bash
corepack enable
corepack install
```

Instalar y configurar el proyecto:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local     # completar DATABASE_URL y AUTH_SECRET
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed
pnpm dev                        # http://localhost:3000
```

Generar el `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Copiar el valor generado en `AUTH_SECRET` dentro de `.env.local`.

> Usen **pnpm** en todo el equipo y commiteen `pnpm-lock.yaml`. No generen lockfiles de otros gestores: las instalaciones dejarían de ser reproducibles.
>
> Las dependencias nuevas que necesiten scripts de instalación quedan bloqueadas hasta que el equipo revise y ejecute `pnpm approve-builds`.

Vercel detecta pnpm mediante `pnpm-lock.yaml`. Para que use exactamente la versión declarada en `package.json`, configurar la variable de entorno `ENABLE_EXPERIMENTAL_COREPACK=1` en el proyecto de Vercel; no hace falta sobrescribir el comando de instalación.

## Comandos

| Comando | Para qué |
|---|---|
| `pnpm dev` | Levantar en desarrollo |
| `pnpm build` | Build de producción (lo mismo que corre Vercel) |
| `pnpm lint` | Lint |
| `pnpm typecheck` | Chequeo de tipos sin emitir |
| `pnpm test` | Tests |
| `pnpm db:generate` | Generar el cliente de Prisma |
| `pnpm db:migrate --name <nombre>` | Crear y aplicar una migración |
| `pnpm db:studio` | Abrir Prisma Studio |
| `pnpm db:seed` | Cargar datos de ejemplo |
| `pnpm security:audit` | Buscar vulnerabilidades conocidas |

## Estructura

```
app/                    rutas (App Router)
  (public)/             páginas sin sesión
  (app)/                páginas con sesión
  api/                  Route Handlers
components/             componentes de UI
lib/
  db/                   acceso a datos — ÚNICO lugar que habla con Prisma
  schemas/              schemas de Zod (validación + tipos)
  auth.ts               configuración de sesión y roles
prisma/
  schema.prisma         modelo de datos
  seed.ts               datos de ejemplo
docs/
  spec.md               qué hace el sistema (requerimientos)
  adr/                  decisiones técnicas y por qué
```

## Reglas del equipo

- Nadie pushea a `main`. Todo entra por Pull Request con al menos 1 aprobación.
- Las convenciones de código están en [`AGENTS.md`](./AGENTS.md) — mantenerlo al día es responsabilidad del equipo.
- Una decisión técnica que cueste revertir se documenta como ADR en `docs/adr/`.

## Definition of Done

Una tarea está terminada cuando:

- [ ] Funciona en el preview deployment, no solo en la máquina de quien la escribió.
- [ ] La validación está en el servidor, no solo en el cliente.
- [ ] Los estados de carga y error están resueltos en la UI.
- [ ] `pnpm build` y `pnpm typecheck` pasan.
- [ ] Alguien más del equipo la revisó y puede explicarla.
