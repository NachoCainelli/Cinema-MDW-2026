# ADR 0004 — Estrategia de sesión: token JWT, no sesión en base

**Estado:** aceptado
**Fecha:** 2026-09-22
**Decide:** equipo de desarrollo

---

## Contexto

Con los proveedores de identidad ya elegidos (ADR 0003), falta decidir dónde vive la sesión una vez que alguien inició sesión. Auth.js ofrece dos estrategias:

- `"jwt"`: la sesión viaja en una cookie cifrada.
- `"database"`: la sesión se guarda en tablas propias y la cookie solo lleva un identificador.

Cada request protegido necesita dos datos, el id del usuario y su rol, porque `requerirUsuario(rol)` compara el rol exacto y `lib/db/` recibe el `usuarioId` por parámetro.

Además, el provider Credentials de Auth.js solo funciona con `strategy: "jwt"`. Sesión en base con Credentials exige crear y leer la sesión a mano.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| Sesión en base (`strategy: "database"`) | Cambiar un rol o revocar una sesión tiene efecto inmediato: se borra la fila | Una consulta a la base en cada request, tablas nuevas en el schema (`Session`, `Account`, `VerificationToken`) y un adapter de Prisma. No funciona con Credentials sin código propio |
| Token JWT (`strategy: "jwt"`) | No consulta la base para saber quién pregunta; sin tablas nuevas; funciona igual con Google y con Credentials | El rol del token es una foto del login. Una sesión no se puede revocar antes de que venza |

## Decisión

Elegimos **`strategy: "jwt"`**.

Porque cada request se resuelve con lo que trae la cookie, sin ir a la base, y las dos puertas de login del ADR 0003 funcionan sin código propio.

Cómo queda en `lib/auth.ts`:

- El rol se lee **de la base** una sola vez, al iniciar sesión (`verificarCredenciales` u `obtenerOCrearUsuarioDeGoogle`), y el callback `jwt` lo guarda en el token junto con el `usuarioId`. Nunca sale de lo que manda el cliente.
- En los requests siguientes el callback `jwt` devuelve el token tal cual, y el callback `session` expone `usuarioId` y `rol` después de validar el rol con `rolSchema`.
- El token viaja dentro de una cookie cifrada con `AUTH_SECRET`: el navegador no puede leerlo ni modificarlo sin que la firma falle.

## Consecuencias

- **El rol del token es una foto.** Si un administrador promueve a alguien a GESTOR_CARTELERA, esa persona sigue siendo USUARIO para el sistema hasta que cierre sesión y vuelva a entrar. Lo mismo al revés: si se le quita un rol, lo conserva hasta que su sesión termine.
- **No se puede revocar una sesión al instante.** Cerrar sesión borra la cookie de ese navegador, pero un token robado sigue siendo válido hasta que vence. La única forma de invalidar todos los tokens a la vez es rotar `AUTH_SECRET`, y eso desloguea a todo el mundo.
- **No se consulta la base para saber quién pregunta**, y el schema de Prisma no suma tablas de sesión.
- **`AUTH_SECRET` pasa a ser crítico:** quien lo tenga puede fabricar un token con cualquier rol. Vive solo en variables de entorno, nunca con prefijo `NEXT_PUBLIC_`, y es distinto en cada entorno.
- **Sin refresh tokens**, porque la spec no los pide. Cuando el token vence, se vuelve a iniciar sesión.
- **Revisar esta decisión si** la spec empieza a pedir cambios de rol con efecto inmediato, revocar sesiones (por ejemplo, "cerrar sesión en todos los dispositivos") o bloquear una cuenta al momento. En ese caso, la opción más barata es consultar el rol en la base dentro del callback `jwt` en cada request, antes que migrar a sesión en base.
