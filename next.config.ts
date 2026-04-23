import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack es el bundler por defecto en Next.js 16
  // pdfjs-dist no necesita el alias de canvas porque se carga con ssr:false
  turbopack: {},
};

export default nextConfig;
