/**
 * Política de privacidad.
 *
 * Google la exige para publicar la app OAuth en modo producción (Google Auth
 * Platform → Desarrollo de la marca). Describe lo que el sistema guarda de
 * verdad: si cambia el modelo de Usuario o lo que se pide a Google, se
 * actualiza acá.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad · Cinema MDW 2026",
};

export default function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm opacity-70">
        Cinema MDW 2026 es un proyecto académico de la materia Metodologías de
        Desarrollo Web (UAI). No es un servicio comercial.
      </p>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Qué datos guardamos</h2>
        <ul className="list-disc space-y-1 pl-6 text-sm">
          <li>Tu email y tu nombre, para identificar tu cuenta.</li>
          <li>
            Si te registrás con email y contraseña, la contraseña se guarda
            hasheada con bcrypt: nunca en texto plano.
          </li>
          <li>Las compras de entradas que hagas: función, butacas y fecha.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Qué nos da Google</h2>
        <p className="text-sm">
          Si entrás con Google, solo usamos tu email y tu nombre. No pedimos
          acceso a tus contactos, archivos, calendario ni a ningún otro dato de
          tu cuenta de Google, y no recibimos tu contraseña de Google.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p className="text-sm">
          Usamos una única cookie de sesión, cifrada, para mantenerte con la
          sesión iniciada. No usamos cookies de publicidad ni de seguimiento.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Con quién compartimos tus datos</h2>
        <p className="text-sm">
          Con nadie. No vendemos ni cedemos datos a terceros. Los datos se
          alojan en los proveedores de infraestructura del proyecto (Vercel y
          Supabase).
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Borrar tu cuenta</h2>
        <p className="text-sm">
          Podés pedirle al equipo del proyecto que borre tu cuenta y tus datos
          en cualquier momento.
        </p>
      </section>
    </main>
  );
}
