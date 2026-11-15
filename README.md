# Proyecto MDW 2026 — Interamericana Cines

**Equipo:**

- Ignacio Cainelli ([NachoCainelli](https://github.com/NachoCainelli)) — responsable del repositorio
- Rodolfo Meroi ([RodoM](https://github.com/RodoM))
- Alejandro Santini ([AlejandroSantini](https://github.com/AlejandroSantini))
- Gastón Pisana ([jvnaufrago](https://github.com/jvnaufrago))

**Producción:** https://cinema-mdw-2026.vercel.app/

**De qué se trata:** mejorar la gestión de cartelera y venta de entradas en los cines, ya que los sistemas actuales se están quedando obsoletos y todavía hay mucha operación manual. El sistema permite desde la creación y configuración de salas hasta la gestión de cartelera y la compra de entradas para el público.

**Roles** ([`docs/spec.md`](docs/spec.md), sección 2): administrador (crea y edita salas y butacas, y crea las cuentas de administrador y de gestor de cartelera), gestor de cartelera (crea películas, las asigna a salas con horario creando funciones y las saca de cartelera) y usuario (se registra por su cuenta, ve la cartelera, compra entradas eligiendo butaca y ve su historial).

**Flujo principal:** el gestor de cartelera publica una función (película, sala y horario) y un usuario la elige en la cartelera, selecciona butacas libres, paga (pago simulado) y ve la compra con sus entradas en su historial (detalle paso a paso en [`docs/spec.md`](docs/spec.md), sección 5).

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

### Si la cartelera de producción aparece vacía

Producción y desarrollo usan **la misma base de Supabase**, y la cartelera solo muestra funciones futuras. Las del seed arrancan mañana y cubren 30 días, así que se vencen si nadie lo vuelve a correr. Para reponerlas:

```bash
pnpm db:seed
```

Es seguro re-correrlo: no duplica funciones y saltea los horarios que se pisan con funciones cargadas a mano. Ojo: también vuelve a fijar la contraseña (`SEED_PASSWORD`) y el rol de las cuentas de prueba.

Si en vez de una lista vacía la API responde 500, lo más probable es que el proyecto de Supabase esté pausado: el plan gratuito lo pausa tras ~7 días sin actividad. Se reanuda desde el dashboard de Supabase (**Restore project**) y tarda unos minutos.

Vercel detecta pnpm mediante `pnpm-lock.yaml`. Para que use exactamente la versión declarada en `package.json`, configurar la variable de entorno `ENABLE_EXPERIMENTAL_COREPACK=1` en el proyecto de Vercel; no hace falta sobrescribir el comando de instalación.

## Comandos

| Comando | Para qué |
|---|---|
| `pnpm dev` | Levantar en desarrollo |
| `pnpm build` | Build de producción (lo mismo que corre Vercel) |
| `pnpm lint` | Lint |
| `pnpm typecheck` | Chequeo de tipos sin emitir |
| `pnpm test` | Tests de dominio (Vitest) |
| `pnpm test:e2e` | Pruebas de punta a punta (Playwright), contra la base local — ver [Pruebas](#pruebas) |
| `pnpm e2e:preparar` | Borrar y volver a sembrar la base local de pruebas |
| `pnpm db:generate` | Generar el cliente de Prisma |
| `pnpm db:migrate --name <nombre>` | Crear y aplicar una migración |
| `pnpm db:studio` | Abrir Prisma Studio |
| `pnpm db:seed` | Cargar datos de ejemplo |
| `pnpm security:audit` | Buscar vulnerabilidades conocidas |

## Pruebas

Hay dos capas:

- **Dominio** (`pnpm test`, Vitest): los `*.test.ts` de `lib/`. No levantan la app ni tocan ninguna base.
- **Punta a punta** (`pnpm test:e2e`, Playwright): los `*.spec.ts` de `e2e/`. Compilan la app, la levantan y la usan con un navegador, contra una **Postgres local**.

> **Las e2e nunca corren contra la base de producción.** `playwright.config.ts` carga `.env.e2e` y se niega a arrancar si `DATABASE_URL` o `DIRECT_URL` apuntan a un host que no sea `localhost`/`127.0.0.1` (por ejemplo, si quedó exportada en la terminal la URL de Supabase). Las variables de `.env.local` que no están en `.env.e2e` se vacían, así ninguna credencial de producción llega al servidor de pruebas.

Requisitos: Docker (con Compose) y, una sola vez, el navegador de Playwright:

```bash
pnpm exec playwright install chromium
```

Correrlas:

```bash
docker compose up -d --wait      # Postgres local en 127.0.0.1:5433
pnpm test                        # dominio
pnpm test:e2e                    # todas las e2e
pnpm test:e2e -- concurrencia    # solo los archivos que coinciden con el filtro
docker compose down              # apagar la base al terminar
```

Qué hace `pnpm test:e2e`, en orden:

1. Compila la app en `.next-e2e` (aparte de `.next`, para no pisar `pnpm dev`) y la levanta con `next start` en http://localhost:3100.
2. `e2e/preparar.ts` **borra la base local entera**, aplica las migraciones y corre el seed: cada corrida arranca de los mismos datos.
3. Corre las pruebas, de a una (comparten la base).

Las sesiones no pasan por el formulario de login: `e2e/sesiones.ts` fabrica la cookie de Auth.js de las cuentas del seed (una por rol) firmada con el `AUTH_SECRET` de prueba de `.env.e2e`. La app no tiene ningún modo prueba: recibe la misma cookie que después de un login.

```ts
import { iniciarSesionComo } from "./sesiones";

test("…", async ({ context, page }) => {
  await iniciarSesionComo(context, "GESTOR_CARTELERA");
  await page.goto("/gestion/funciones/nueva");
});
```

Si una prueba falla, el trace queda en `test-results/` y se abre con `pnpm exec playwright show-trace <archivo>.zip`.

## Estructura

```
app/                      rutas (App Router)
  (public)/               páginas sin sesión
  (app)/                  páginas con sesión
  api/                    Route Handlers
components/               componentes de UI
lib/
  db/                     acceso a datos — ÚNICO lugar que habla con Prisma
  schemas/                schemas de Zod (validación + tipos)
  auth.ts                 configuración de sesión y roles
e2e/                      pruebas de punta a punta (Playwright) — ver Pruebas
prisma/
  schema.prisma           modelo de datos
  seed.ts                 datos de ejemplo
docs/
  spec.md                 qué hace el sistema (requerimientos)
  api.md                  contrato de la API y catálogo de errores
  permisos.md             matriz de permisos por rol
  despliegue.md           diagrama de despliegue, con protocolos y puertos
  trazabilidad.md         un requisito seguido de la historia a la pantalla
  verificacion-compra.md  lo probado a mano en la pantalla de compra
  adr/                    decisiones técnicas y por qué
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
