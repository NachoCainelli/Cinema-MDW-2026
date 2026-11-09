# Verificación de la pantalla de compra en el navegador

Lo que no cubren los tests automáticos de `/funciones/[id]`: que el precio no genere un error de
hidratación y que el aviso de una butaca vendida se comporte bien. Los cambios que se verificaban
entraron en #96. Se probó en producción (https://cinema-mdw-2026.vercel.app) el 06/11/2026, en dos
pasadas distintas registradas en #99:

| Pasada | Quién | Hora (UTC) | `main` a esa hora | Motores |
|---|---|---|---|---|
| 1 | RodoM, dentro del recorrido de #90 | 13:33 | `af7de57` (antes de #100) | Chromium |
| 2 | AlejandroSantini | 14:46 | `3883406` (#100, antes de #101) | Firefox, WebKit |

La columna de `main` sale de comparar la hora de cada comentario de #99 con la hora de merge de
los PRs; no se anotó el id del deployment de Vercel.

## Sin error de hidratación con el precio

`formatearPrecio` arma el texto a mano en vez de usar `toLocaleString`, para que el servidor y el
navegador den el mismo resultado. El espacio entre `$` y el número es un espacio duro (U+00A0),
no uno común: es justamente lo que tiene que coincidir entre servidor y navegador, y lo que hay
que poner si se copia el texto a una aserción (ver `lib/utils.test.ts`).

| Pasada | Motor | Errores de React #418, #423 o #425 | Texto del precio | Total al elegir butacas |
|---|---|---|---|---|
| 1 | Chromium (versión no registrada) | Ninguno | Cada entrada cuesta $ 5.000 | 2 butacas · $ 10.000 |
| 2 | Firefox 146 | Ninguno | Cada entrada cuesta $ 5.000 | 1 butaca · $ 5.000 |
| 2 | WebKit 26 | Ninguno | Cada entrada cuesta $ 5.000 | 1 butaca · $ 5.000 |

Las dos pasadas se hicieron con Playwright. WebKit es el motor de Safari, pero **no reemplaza
probar en Safari ni en un iPhone real**: eso queda en #90.

## El aviso de una butaca vendida

Con dos sesiones sobre la misma función. El primer choque se probó en las dos pasadas (Chromium y
WebKit); el resto, solo en la pasada 2, en WebKit:

- [x] Al confirmar una butaca que la otra sesión acaba de comprar, aparece "No se pudo confirmar la
  compra", nombrando la butaca perdida.
- [x] El mapa la muestra ocupada y deshabilitada, y las demás siguen elegidas.
- [x] Al tocar otra butaca, el aviso desaparece.
- [x] En un segundo choque con otra butaca, el aviso vuelve a aparecer.
- [x] Al confirmar con butacas libres, se llega a `/compras/[id]`.

## Datos que quedaron en la base

La base es compartida con producción, así que estas cuentas `USUARIO` y estas compras son reales y
ocupan butacas de funciones publicadas:

| Pasada | Función | Cuentas | Compras |
|---|---|---|---|
| 1 | Amélie · Sala 3 · 09/11/2026 14:00 (`cmw15ynyw006i17uyq4x9stuh`) | `issue90.prueba@ejemplo.com`, `issue90.prueba.b@ejemplo.com` | F2·B3, de B (id no registrado); `cmw4zam4p0005l4089tiq6pl5` (F2·B4 y F2·B5), de A |
| 2 | La llegada · Sala 1 · 07/11/2026 (`cmw15xs43005617uygcs9swfr`) | `issue99.firefox.1793976332899@ejemplo.com`, `issue99.a.1793976332899@ejemplo.com`, `issue99.b.1793976332899@ejemplo.com` | `cmw537fvu0002i908av54l5lv` (F5·B1) y `cmw537iqn0006i908xdoyhbxh` (F5·B2), de B; `cmw537k3l000ai90836ja2pby` (F5·B3), de A |

Las mismas cuentas y compras figuran en los comentarios de #99.
