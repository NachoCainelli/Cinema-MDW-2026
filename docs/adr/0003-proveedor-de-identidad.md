# ADR 0003 — Proveedor de identidad: Auth.js con Google y Credentials

**Estado:** aceptado
**Fecha:** 2026-09-22
**Decide:** equipo de desarrollo

---

## Contexto

H1 de `docs/spec.md` pide que una persona se registre con email y contraseña, y eso ya estaba implementado antes de tener sesión real: `registrarUsuario` en `lib/db/usuarios.ts`, el hasheo en `lib/password.ts` y la columna `passwordHash` guardada con bcrypt. Hasta la clase 6 la sesión era un stub (header `x-usuario-prueba`) que no autenticaba a nadie.

La clase 6 propone delegar la identidad a un proveedor OAuth para no guardar contraseñas. La restricción es que H1 está escrita con email y contraseña, y el código que la cumple ya existe y tiene tests.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| Solo Google | No guardamos ninguna contraseña: lo que no se guarda no se puede filtrar | Obliga a reescribir H1 y a tirar `registrarUsuario`, `lib/password.ts` y sus tests. Si Google no responde, no entra nadie |
| Solo Credentials | Cumple H1 tal como está escrita y no depende de terceros | Nos deja todas las contraseñas encima, con todo lo que implica guardarlas bien |
| Supabase Auth o Clerk | Resuelven registro, login y recuperación de contraseña | Otro servicio más que configurar y del que depender, y el riesgo conocido de verificar el token en el cliente en lugar del servidor |
| Auth.js con Google y Credentials | Quien quiere no nos deja contraseña; H1 sigue funcionando; la sesión se verifica en nuestro servidor | Seguimos guardando contraseñas de quienes eligen Credentials, y hay dos caminos de login que mantener |

## Decisión

Elegimos **Auth.js con los dos proveedores, Google y Credentials**, configurados en `lib/auth.ts`.

Porque Google permite entrar sin dejarnos una contraseña y Credentials mantiene H1 tal como está escrita, reusando el código que ya existía.

Las dos puertas terminan en la misma fila de `Usuario`, identificada por email:

- **Credentials** llama a `verificarCredenciales`, que compara contra el `passwordHash` con bcrypt.
- **Google** llama a `obtenerOCrearUsuarioDeGoogle`, un `upsert` por email con `update: {}`: si la cuenta ya existe, lo que diga Google no pisa nuestra base (ni el nombre ni, sobre todo, el rol). Si no existe, se crea con `rol: "USUARIO"` y sin `passwordHash`.
- El callback `signIn` rechaza una cuenta de Google con `email_verified` en falso. Sin ese chequeo, alguien podría crear una cuenta de Google con el email de otra persona sin verificarlo y entrar como esa persona, rol incluido.

El resto del proyecto no conoce Auth.js: los handlers solo llaman a `obtenerUsuario()` y `requerirUsuario(rol)`.

## Consecuencias

- **Seguimos hasheando contraseñas, y eso se defiende:**
  - Se guardan con bcrypt (10 vueltas y salt por contraseña), nunca en texto plano. `lib/password.ts` es el único lugar que conoce el algoritmo.
  - El email repetido lo resuelve la restricción `@unique` de la base y no un `findUnique` previo, que dos registros simultáneos podrían ganar por carrera.
  - Email inexistente, contraseña incorrecta y cuenta de Google sin contraseña responden igual y tardan lo mismo (`HASH_DE_RELLENO`), así que el login no confirma qué emails tienen cuenta.
- **Dependemos de Google para una de las dos puertas.** Si Google no responde, nadie entra por ese camino. Por Credentials todavía se puede entrar, y esa es parte de la razón para quedarnos con los dos. Una cuenta creada con Google no tiene contraseña, así que su dueño no tiene plan B mientras Google esté caído. Esta pregunta es la que abre la clase 7 (issue #47).
- **Nadie puede asignarse un rol a sí mismo:**
  - `POST /api/usuarios` crea siempre con `rol: "USUARIO"`, fijo en `registrarUsuario`. Si el body trae un `rol`, el schema de Zod lo descarta.
  - El primer login con Google también crea con `rol: "USUARIO"`.
  - Ningún camino de login ni de registro toma el rol de lo que manda el cliente.
- **Falta el alta de cuentas privilegiadas.** La sección 2 de `docs/spec.md` dice que el administrador crea las cuentas de ADMINISTRADOR y de GESTOR_CARTELERA, pero hoy no hay endpoint para eso: se crean por seed (`pnpm db:seed`) o desde Prisma Studio. Es una decisión, no un olvido. Lo que se evalúa es que no haya forma de asignarse un rol, no que exista un panel. Si se agrega ese endpoint, tiene que ser `requerirUsuario("ADMINISTRADOR")` y sumar su fila en `docs/permisos.md`.
- **Queda fuera de alcance**, porque no está en la spec: recuperación de contraseña, verificación de mail en Credentials, segundo factor, permisos granulares, refresh tokens y pantalla de administración de usuarios.
- **Si Google deja de ser opción** (por ejemplo, la app no se aprueba para publicar), se saca el provider de `lib/auth.ts` y todo sigue andando con Credentials. Las cuentas que se crearon con Google quedan sin forma de entrar hasta que se les asigne una contraseña.
