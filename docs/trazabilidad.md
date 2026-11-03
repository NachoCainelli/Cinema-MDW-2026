# Trazabilidad de un requisito: el solapamiento de funciones (H3)

Un requisito seguido de punta a punta, desde la historia hasta la pantalla, para poder citar cada
eslabón con archivo y línea.

Los links apuntan al commit
[`0442870`](https://github.com/NachoCainelli/Cinema-MDW-2026/commit/044287039e053dccab797a09c5424112da1020e4)
de `main` (03/11/2026) y no a la rama: así las líneas citadas no se corren cuando el código cambie.
Si el código cambia, lo que hay que actualizar es esta tabla.

## El requisito

> Dado que la sala ya tiene otra función cuyo horario se superpone (considerando la duración de la
> película más 15 minutos de margen), cuando se intenta crear la nueva función, el sistema la
> rechaza e informa el conflicto.
>
> — H3, criterio 2 ([`docs/spec.md` L105-L107](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/docs/spec.md?plain=1#L105-L107))

## La cadena

| # | Eslabón | Dónde | Qué hace |
|---|---|---|---|
| 1 | Historia | [`docs/spec.md` L98-L111](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/docs/spec.md?plain=1#L98-L111) | H3 con sus cuatro criterios; el 2 es el solapamiento. |
| 2 | Contrato | [`docs/api.md` L188](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/docs/api.md?plain=1#L188) | `POST /api/funciones` responde **409** con el texto exacto, y la fila cita "H3, criterio 2". |
| 3 | Regla pura | [`lib/cartelera.ts` L39-L41](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/lib/cartelera.ts#L39-L41) (`seSolapan`) y [L49-L54](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/lib/cartelera.ts#L49-L54) (`funcionesEnConflicto`) | Decide si dos franjas se pisan contando el margen de 15 minutos. Sin Prisma ni Next: recibe datos y devuelve un veredicto. |
| 4 | Test de la regla | [`lib/cartelera.test.ts` L31-L67](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/lib/cartelera.test.ts#L31-L67) y [L102-L123](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/lib/cartelera.test.ts#L102-L123) | Los bordes del criterio: 15 minutos entra, 14 no, y una función que arranca justo cuando termina la anterior tampoco. |
| 5 | Capa de datos | [`lib/db/funciones.ts` L108-L135](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/lib/db/funciones.ts#L108-L135) y [L170-L182](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/lib/db/funciones.ts#L170-L182) | `crearFuncion` busca las funciones de la sala que podrían pisarse, le pasa el veredicto a la regla pura y lo traduce a `ErrorDeConflicto` con el mensaje del contrato. |
| 6 | Test de la capa de datos | [`lib/db/funciones.test.ts` L67-L101](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/lib/db/funciones.test.ts#L67-L101) | Rechaza con 409 si se solapa, acepta justo con los 15 minutos y nombra la función con la que choca. |
| 7 | Endpoint | [`app/api/funciones/route.ts` L16-L25](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/app/api/funciones/route.ts#L16-L25) | Autorizar → validar → delegar en `crearFuncion` → responder. El 409 lo decide `respuestaDeError`, no el handler. |
| 8 | Test del endpoint | [`app/api/funciones/route.test.ts` L100-L110](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/app/api/funciones/route.test.ts#L100-L110) | El conflicto sale como 409 con el motivo en el cuerpo. |
| 9 | Request manual | [`docs/api.http` L670-L679](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/docs/api.http#L670-L679) | El caso para correr contra local o producción: la misma sala a la misma hora → 409. |
| 10 | Server Action | [`app/(app)/gestion/funciones/nueva/acciones.ts` L42-L54](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/app/(app)/gestion/funciones/nueva/acciones.ts#L42-L54) | La otra puerta: llama a la misma `crearFuncion` y traduce el mismo error con `estadoDeError`, a un `mensaje` en vez de a un status. |
| 11 | Test de la acción | [`app/(app)/gestion/funciones/nueva/acciones.test.ts` L94-L106](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/app/(app)/gestion/funciones/nueva/acciones.test.ts#L94-L106) | El solapamiento va arriba del formulario, sin vaciarlo y sin redirigir. |
| 12 | Pantalla | [`app/(app)/gestion/funciones/nueva/FormularioNuevaFuncion.tsx` L40-L47](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/app/(app)/gestion/funciones/nueva/FormularioNuevaFuncion.tsx#L40-L47) y [L109](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/app/(app)/gestion/funciones/nueva/FormularioNuevaFuncion.tsx#L109) | `/gestion/funciones/nueva`: el conflicto aparece arriba del formulario, y la ayuda del campo "Inicio" avisa la regla antes de que alguien se equivoque. |

## Lo que muestra la cadena

- **La regla se escribe una sola vez.** La API (eslabón 7) y la pantalla (eslabón 10) llaman a la
  misma `crearFuncion`, que usa la misma regla pura. Lo único que cambia entre las dos es el
  traductor del error: `respuestaDeError` para HTTP y `estadoDeError` para el formulario.
- **Se prueba en cada capa con lo que esa capa decide.** Los bordes del margen, en la regla pura
  (4); que la base se consulte y el error se arme con el mensaje del contrato, en la capa de datos
  (6); el status, en el endpoint (8); dónde se muestra, en la acción (11).
- **Zod no puede validar esto.** Depende de las funciones ya guardadas, así que vive en `lib/db/`,
  que lee la base y le pasa los datos a la regla pura (ver `AGENTS.md`, Datos).
- **También lo usa el seed.** [`prisma/seed.ts` L225](https://github.com/NachoCainelli/Cinema-MDW-2026/blob/044287039e053dccab797a09c5424112da1020e4/prisma/seed.ts#L225)
  escribe con Prisma directo, sin pasar por `crearFuncion`, y por eso aplica la misma
  `funcionesEnConflicto` para no pisar funciones cargadas a mano (#95).

## Historia en el repositorio

| PR | Qué agregó a la cadena |
|---|---|
| #20 | El endpoint `POST /api/funciones` con el chequeo de solapamiento, y su request en `docs/api.http` (eslabones 5, 7 y 9). |
| #34 | La regla pura en `lib/cartelera.ts` y sus tests (3 y 4), extraída de la capa de datos. |
| #36 | El catálogo de errores de `docs/api.md`, con el 409 de solapamiento (2). |
| #93 | La pantalla `/gestion/funciones/nueva` y su Server Action (10 a 12); el 409 pasa a mostrar la hora en horario argentino. |
| #95 | El seed respeta la misma regla. |
