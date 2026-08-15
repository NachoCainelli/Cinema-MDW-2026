import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Cambiar en la clase 1 por el nombre real del sistema.
  title: "Proyecto MDW 2026",
  description: "Sistema desarrollado en Metodologías de Desarrollo Web — UAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
