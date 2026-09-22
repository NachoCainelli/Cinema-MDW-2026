# Matriz de permisos — preparación para Auth.js (clase 6)

Este documento traduce `docs/api.md` a una matriz rol × operación, y deja escritas las
decisiones que hoy resuelve el stub de `lib/auth.ts` (header `x-usuario-prueba`), para no
improvisarlas mientras se configura el proveedor real. Sigue el mismo criterio que ya usamos en
`docs/spec.md` y `docs/api.md`: se actualiza junto con el código, no es un documento que se
escribe una vez y se desactualiza (Manifiesto Ágil, principio de "la documentación justa y
necesaria" — no cero documentación, documentación que no mienta).

## Cómo leer la matriz

Cada celda responde: **si una request con este rol le pega a esta operación, y no hay ningún
otro problema (datos válidos, recurso existente), ¿qué devuelve el sistema hoy?**

- `✅` — el rol pasa la autorización; la request sigue a la lógica de negocio (que puede
  devolver 200/201/204, o un 400/402/409 propio de esa lógica, pero eso no es un tema de
  permisos y ya está en `docs/api.md`).
- `401` — sin sesión. `Público` en esta matriz significa "sin sesión iniciada", no un rol de
  `Rol` en el schema.
- `403` — hay sesión, pero el rol no es el que exige la ruta.
- `404` — no aplica a ninguna fila de este contrato hoy (ver nota al pie de la matriz).

La fuente de este comportamiento es una sola función, `requerirUsuario(rol?)` en `lib/auth.ts`:

```ts
export async function requerirUsuario(rol?: Rol): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new ErrorNoAutenticado();       // 401
  if (rol && usuario.rol !== rol) throw new ErrorNoAutorizado(); // 403
  return usuario;
}
```

Dos cosas de esta función definen toda la matriz:

1. **Comparación exacta, no jerárquica.** `usuario.rol !== rol` compara el rol de la sesión
   contra un único rol esperado. No hay "el administrador puede todo lo que puede el gestor";
   si una ruta pide `GESTOR_CARTELERA`, un `ADMINISTRADOR` autenticado recibe **403**, igual que
   un `USUARIO`. Es intencional: la sección 2 de `docs/spec.md` separa "configurar la estructura
   del cine" (Administrador) de "armar la programación" (Gestor de cartelera) como
   responsabilidades distintas, no como una jerarquía de privilegios.
2. **Rutas públicas no llaman a `requerirUsuario`.** No es que exista un rol "Público" que la
   función reconozca: esas rutas simplemente no consultan sesión, así que cualquiera —con
   sesión de cualquier rol, o sin ninguna— pasa igual.

## Matriz

| Operación (`docs/api.md`) | Público | Usuario | Gestor de cartelera | Administrador |
|---|---|---|---|---|
| `POST /api/usuarios` (H1, registro) | ✅ | ✅ | ✅ | ✅ |
| `POST /api/salas` (H2) | 401 | 403 | 403 | ✅ |
| `GET /api/salas` | 401 | 403 | 403 | ✅ |
| `DELETE /api/salas/:id` (H5) | 401 | 403 | 403 | ✅ |
| `POST /api/peliculas` | 401 | 403 | ✅ | 403 |
| `POST /api/peliculas/imagen` | 401 | 403 | ✅ | 403 |
| `GET /api/peliculas` | 401 | 403 | ✅ | 403 |
| `PATCH /api/peliculas/:id` | 401 | 403 | ✅ | 403 |
| `DELETE /api/peliculas/:id` (H6) | 401 | 403 | ✅ | 403 |
| `POST /api/funciones` (H3) | 401 | 403 | ✅ | 403 |
| `GET /api/funciones` (cartelera pública) | ✅ | ✅ | ✅ | ✅ |
| `GET /api/funciones/:id/butacas` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/compras` (H4) | 401 | ✅ | 403 | 403 |
| `GET /api/compras` (historial propio) | 401 | ✅ | 403 | 403 |

14 filas, una por endpoint del contrato de `docs/api.md`; ninguna operación inventada.

**Nota sobre la columna 404:** no aparece en ninguna celda porque en este contrato el 404 nunca
depende del rol, depende de si el recurso existe — y una vez que el rol correcto pasa la
autorización, el 404 es el mismo para cualquier sesión válida de ese rol. La única situación
donde el 404 sí depende de *quién* pregunta (recurso ajeno) es `GET /api/compras`, y ahí no hay
un `:id` de por medio: el filtro por dueño lo hace la query (`usuarioId` sale de la sesión), no
un chequeo de pertenencia sobre un recurso puntual. Ver la respuesta 2 para el detalle.

**Diferencias entre esta matriz y `lib/auth.ts`:** ninguna. Cada fila protegida corresponde a un
`requerirUsuario(ROL)` con un único rol literal en el handler de esa ruta, y ninguna ruta de
`docs/api.md` pide más de un rol posible ni "cualquier rol autenticado" (`requerirUsuario()` sin
argumento) — si alguna vez se agrega una ruta así, hay que sumar una fila nueva a esta matriz
antes de mergear ese PR, no después.

---

## Respuestas escritas

### 1. ¿Cómo se crea la cuenta de cada rol?

- **Usuario:** autoservicio, vía `POST /api/usuarios` (pública, H1). Hoy ese endpoint **fuerza
  el rol `USUARIO` en el servidor** e ignora cualquier `rol` que venga en el body — no hay forma
  de pedir otro rol por esa vía, ni con un body armado a mano.
- **Gestor de cartelera y Administrador:** los crea siempre un Administrador (`docs/spec.md`,
  sección 2: "las cuentas de administrador y gestor de cartelera las crea siempre un
  administrador — nadie se autoregistra con esos dos roles"). **Hoy no existe ese endpoint.**
  No hay ningún `POST` en `docs/api.md` que reciba un `rol` explícito y esté protegido con
  `ADMINISTRADOR`. Es lo que falta agregar: algo como `POST /api/administracion/usuarios` (o el
  nombre que se defina), protegido con `requerirUsuario("ADMINISTRADOR")`, que reciba
  `email`, `nombre`, `contraseña` y `rol` (`ADMINISTRADOR` | `GESTOR_CARTELERA`), y que quede
  documentado en `docs/api.md` antes de la clase 6 o durante ella.
- **¿Por qué nadie se autoregistra como Administrador ni como Gestor de cartelera?** Porque esos
  dos roles operan la infraestructura del cine (crear salas, armar la cartelera) y el registro
  público (H1) no tiene ningún control de invitación ni verificación — es solo email y
  contraseña. Si `POST /api/usuarios` aceptara el rol del body, cualquiera podría
  autoproclamarse administrador. La única barrera hoy es que ese endpoint ni siquiera mira el
  campo: el rol sale fijo del servidor. El día que exista el endpoint de alta administrada, la
  barrera pasa a ser el control de acceso de ese endpoint (`ADMINISTRADOR` únicamente).

### 2. ¿Cuándo es 403 y cuándo es 404?

La regla que ya sigue el proyecto (`docs/api.md`, "Reglas generales de error" y la fila de 404 en
"Errores transversales"): **el rol equivocado es 403; un recurso que existe pero no le
pertenece a quien pregunta responde 404, exactamente igual que uno que no existe.**

El porqué: si un recurso ajeno respondiera 403 en vez de 404, la respuesta ya te confirmaría que
el recurso existe (solo que no es tuyo). Alguien podría iterar ids —`/api/algo/1`,
`/api/algo/2`, `/api/algo/3`...— y usar 403 vs. 404 para mapear qué ids son válidos, sin tener
ningún permiso sobre ninguno. Respondiendo siempre 404 para "no existe" y para "no es tuyo", esa
distinción queda indistinguible desde afuera: no hay señal que explotar id por id.

**Aclaración importante después de armar la matriz:** hoy **ningún endpoint del contrato
ejercita en la práctica esta regla del recurso ajeno**. Los recursos con `:id` de este contrato
(`Sala`, `Película`, `Función`) son entidades globales que administra un rol fijo, no recursos
por-usuario — no existe el concepto de "una sala ajena". El único recurso que sí es por-usuario
es la Compra, pero `GET /api/compras` no tiene un `:id`: devuelve la lista ya filtrada por
`usuarioId` de la sesión (el de la query string se ignora), así que nunca hay un id ajeno que
consultar y comparar contra 403. La regla está escrita y lista en `docs/api.md` para el día que
se agregue una ruta tipo `GET /api/compras/:id` (ver una compra puntual) — ese día, una compra de
otro usuario responde 404, no 403 — pero por ahora es una regla sin caso de prueba real en el
código.

### 3. Casos que hoy no se pueden verificar (se cierran en la clase 6)

Leyendo `lib/auth.ts` con cuidado apareció algo que cambia el alcance de "qué se puede probar
hoy": el stub de sesión se apaga solo en producción.

```ts
async function obtenerUsuarioDePrueba(): Promise<UsuarioSesion | null> {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.AUTH_STUB_HABILITADO !== "true") return null;
  // ...
}
```

Como `obtenerUsuario()` llama a esto y nada más, en producción **`obtenerUsuario()` siempre
devuelve `null`**, sin importar qué header mande quien llama. Eso significa que
`requerirUsuario` siempre tira `ErrorNoAutenticado` (401) en producción — **para cualquier rol,
en cualquiera de las 11 filas protegidas de la matriz.**

En concreto, hoy no se puede verificar en producción (ni en un preview deployment, si ahí
`NODE_ENV` también vale `"production"`):

- Ninguna celda `✅` de la matriz: no hay forma de loguearse de verdad, así que el camino feliz
  de Administrador, Gestor de cartelera o Usuario autenticado no se puede ejercitar.
- Ninguna celda `403`: para ver un 403 hace falta primero pasar el 401, es decir, tener sesión
  con el rol equivocado — y hoy no hay sesión posible ahí.
- Como consecuencia, tampoco se puede probar en producción ningún 409 de negocio que dependa de
  estar autenticado (solapamiento de funciones, película/sala dada de baja al crear una función,
  butaca ya vendida, etc.): para llegar a esa validación primero hay que pasar la autorización.

Lo único que sí funciona de punta a punta en producción hoy son las tres filas públicas:
`POST /api/usuarios`, `GET /api/funciones` y `GET /api/funciones/:id/butacas`.

Todo lo demás — sesión real, y por lo tanto los 401/403/✅ de las otras 10 filas de esta matriz —
depende de reemplazar el stub por Auth.js. Esa es la frontera exacta que cierra la clase 6: el
día que haya un proveedor real, `obtenerUsuario()` deja de mirar `NODE_ENV` y empieza a leer la
sesión de verdad, y recién ahí esta matriz se puede volver a verificar contra producción, endpoint
por endpoint.
