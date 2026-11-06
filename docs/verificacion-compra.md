# Verificación de la pantalla de compra en el navegador

Lo que no cubren los tests automáticos de `/funciones/[id]`: que el precio no genere un error de
hidratación y que el aviso de una butaca vendida se comporte bien. Se probó en producción
(https://cinema-mdw-2026.vercel.app) el 06/11/2026 (issue #99). Los cambios que se verificaban
entraron en #96.

## Sin error de hidratación con el precio

`formatearPrecio` arma el texto a mano en vez de usar `toLocaleString`, para que el servidor y el
navegador den el mismo resultado.

| Motor | Errores de React #418, #423 o #425 | Texto del precio | Total con una butaca |
|---|---|---|---|
| Chromium | Ninguno | Cada entrada cuesta $ 5.000 | Mismo formato |
| Firefox 146 | Ninguno | Cada entrada cuesta $ 5.000 | 1 butaca · $ 5.000 |
| WebKit 26 | Ninguno | Cada entrada cuesta $ 5.000 | 1 butaca · $ 5.000 |

Las tres pruebas se hicieron con Playwright. WebKit es el motor de Safari, pero **no reemplaza
probar en Safari ni en un iPhone real**: eso queda en #90.

## El aviso de una butaca vendida

Con dos sesiones sobre la misma función, en WebKit (en Chromium ya se había probado el primer
choque, ver #99):

- [x] Al confirmar una butaca que la otra sesión acaba de comprar, aparece "No se pudo confirmar la
  compra", nombrando la butaca perdida.
- [x] El mapa la muestra ocupada y deshabilitada, y las demás siguen elegidas.
- [x] Al tocar otra butaca, el aviso desaparece.
- [x] En un segundo choque con otra butaca, el aviso vuelve a aparecer.
- [x] Al confirmar con butacas libres, se llega a `/compras/[id]`.

## Datos que quedaron en la base

La base es compartida con producción. Las cuentas y las compras de esta prueba están detalladas en
los comentarios de #99.
