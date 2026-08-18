# ADR 0002 — Adopción de pnpm y actualización segura de dependencias

**Estado:** aceptado
**Fecha:** 2026-08-15
**Decide:** equipo de desarrollo

---

## Contexto

El proyecto usaba npm 11.4.2 sin una política que impidiera a las dependencias ejecutar scripts durante la instalación. Una dependencia directa o transitiva comprometida podía ejecutar código con los permisos del desarrollador o del entorno de CI mediante `preinstall`, `install` o `postinstall`.

Necesitamos instalaciones reproducibles, compatibilidad con Next.js, Prisma y Vercel, y una política versionada que bloquee los scripts nuevos hasta que el equipo los revise. Vercel detecta el gestor mediante `pnpm-lock.yaml`; para una versión que todavía no tiene soporte nativo permite fijar el gestor mediante Corepack.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| Mantener npm y endurecer su configuración | No requiere migrar el lockfile ni los comandos del proyecto | La versión usada por el equipo no incluye el flujo de aprobación de scripts; exige actualizar y configurar varios controles que no son seguros por defecto |
| Migrar a pnpm 10.34.0 | Bloquea scripts de dependencias no aprobadas, ofrece `pnpm approve-builds`, permite demorar versiones nuevas y tiene soporte nativo en Vercel | Usa Node.js 20, que ya finalizó su ciclo de soporte, y no incorpora los controles predeterminados de pnpm 11 |
| Migrar a pnpm 11.20.0 y Node.js 22 | Incluye controles de cadena de suministro más estrictos, usa una versión LTS soportada de Node.js y mantiene la ventana de maduración de siete días | Requiere Corepack para desplegar en Vercel mientras pnpm 11 no tenga soporte nativo |

## Decisión

Elegimos **pnpm 11.20.0, Node.js 22.13 o posterior y una política explícita de seguridad**.

Porque permite bloquear scripts de instalación no revisados, evita depender de una versión de Node.js fuera de soporte y agrega la verificación de cadena de suministro de pnpm 11. La versión de pnpm se fija con número exacto e integridad SHA-512 en `packageManager`; en Vercel se selecciona mediante Corepack.

La configuración del repositorio:

- falla ante scripts de dependencias no revisados con `strictDepBuilds`;
- permite scripts únicamente para las versiones declaradas en `allowBuilds`;
- bloquea fuentes transitivas Git o tarballs mediante `blockExoticSubdeps`;
- espera siete días antes de resolver una versión publicada mediante `minimumReleaseAge`;
- guarda versiones exactas para las nuevas dependencias;
- hace fallar CI ante vulnerabilidades conocidas de severidad alta o crítica mediante `pnpm security:audit`.

La allowlist no implica que un paquete sea intrínsecamente seguro. Cada incorporación o actualización sigue requiriendo revisión del cambio en `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml`.

## Actualización de seguridad de Next.js

Al validar la migración con `pnpm audit`, el árbol de Next.js 15.5.23 presentó cinco avisos: cuatro correspondían a PostCSS 8.4.31 y uno agrupaba vulnerabilidades heredadas por sharp 0.34.5 desde libvips. Las versiones corregidas mínimas eran PostCSS 8.5.23 y sharp 0.35.0.

### Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| Mantener Next.js 15 y forzar PostCSS y sharp mediante `overrides` | Cambio reducido en la dependencia directa | Fuerza versiones fuera de los rangos declarados y probados por Next.js 15 |
| Actualizar a Next.js 16.3.0 | Declara PostCSS 8.5.23 y sharp 0.35.3, corrige los cinco avisos y cumple la espera de siete días | Requiere adaptar ESLint, la configuración de Next.js y la versión mínima de Node.js |
| Actualizar inmediatamente a Next.js 16.3.1 | Incorpora el parche más reciente de Next.js | Al momento de decidir tenía menos de siete días y violaba `minimumReleaseAge` |

Elegimos **Next.js 16.3.0**, `eslint-config-next` 16.3.0 y Node.js 22.13 o posterior.

Porque elimina las dependencias vulnerables respetando tanto los rangos soportados por Next.js como la ventana de maduración definida para paquetes nuevos. La migración reemplaza `next lint` por la CLI de ESLint y elimina la opción `eslint` de `next.config.ts`, ambas retiradas en Next.js 16. También elimina `@eslint/eslintrc` y su adaptador `FlatCompat`: `eslint-config-next` 16 ofrece configuración plana nativa y se importa directamente, sin quitar las reglas de Next.js, React, Core Web Vitals ni TypeScript.

## Consecuencias

- Las instalaciones locales, de CI y de Vercel usan `pnpm-lock.yaml`; Corepack fija pnpm 11.20.0 y verifica su integridad según `package.json`.
- Una dependencia nueva no puede ejecutar scripts de instalación hasta que el equipo la revise y apruebe.
- Los paquetes recién publicados quedan fuera de la resolución durante siete días, salvo una excepción explícita revisada por el equipo.
- Los comandos de npm y npx se reemplazan por scripts del proyecto o `pnpm exec`; no se usa `pnpm dlx`.
- Al actualizar una dependencia con scripts de instalación hay que aprobar explícitamente su nueva versión en `allowBuilds`.
- La allowlist autoriza sharp 0.35.3; otra versión debe revisarse y aprobarse por separado.
- El proyecto requiere Node.js 22.13 o posterior: pnpm 11 no funciona con Node.js 20 y pnpm 11.20.0 declara ese mínimo exacto.
- Vercel aún no ofrece soporte nativo para pnpm 11. El proyecto requiere `ENABLE_EXPERIMENTAL_COREPACK=1`; si Vercel incorpora soporte oficial, se debe revisar si esa variable continúa siendo necesaria.
