import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
