import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El build falla si hay errores de tipos. El lint se ejecuta por separado en CI.
  typescript: { ignoreBuildErrors: false },
  // Las pruebas e2e (`playwright.config.ts`) compilan en `.next-e2e` para no
  // pisar el build ni la caché de `pnpm dev`. Sin la variable, como siempre.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
