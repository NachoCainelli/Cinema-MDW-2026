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

Requisitos: Node 20+, npm, y una base de datos: **Postgres** (Supabase) o **MongoDB** (Atlas). Las dos tienen plan gratuito.

```bash
npm install
cp .env.example .env.local     # completar DATABASE_URL y AUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev                       # http://localhost:3000
```

Generar el `AUTH_SECRET`:

```bash
npx auth secret
```

> Usen **npm** en todo el equipo y commiteen el `package-lock.json`. Si alguien instala con otro gestor aparece un segundo lockfile y las instalaciones dejan de ser reproducibles.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Levantar en desarrollo |
| `npm run build` | Build de producción (lo mismo que corre Vercel) |
| `npm run lint` | Lint |
| `npm run typecheck` | Chequeo de tipos sin emitir |
| `npm test` | Tests |
| `npx prisma migrate dev` | Crear y aplicar una migración |
| `npx prisma studio` | Ver y editar los datos a mano |
| `npm run db:seed` | Cargar datos de ejemplo |

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
- [ ] `npm run build` y `npm run typecheck` pasan.
- [ ] Alguien más del equipo la revisó y puede explicarla.
