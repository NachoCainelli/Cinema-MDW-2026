import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El build falla si hay errores de tipos. El lint se ejecuta por separado en CI.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
