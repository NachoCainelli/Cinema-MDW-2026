/**
 * Pantallas que requieren sesión: todas llevan la barra con el usuario, su rol
 * y "Salir".
 *
 * El layout no protege nada: no se vuelve a ejecutar en cada navegación del
 * lado del cliente, así que cada página de `(app)` verifica la sesión y el rol
 * por su cuenta, y cada consulta lleva el `usuarioId` de la sesión en el
 * `where`.
 *
 * Por eso, sin sesión, tampoco redirige: el layout se ejecuta antes que la
 * página y no sabe en qué dirección está, así que su `redirect("/ingresar")`
 * le ganaría al de la página y se perdería el `callbackUrl` (se probó: con el
 * redirect acá, `/compras` iba a `/ingresar` a secas). Deja pasar a la página,
 * que manda a `urlDeIngreso(<su dirección>)`.
 */
import Navegacion from "@/components/Navegacion";
import { obtenerUsuario } from "@/lib/auth";

export default async function LayoutConSesion({ children }: { children: React.ReactNode }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return children;

  return (
    <>
      <Navegacion usuario={usuario} />
      {children}
    </>
  );
}
