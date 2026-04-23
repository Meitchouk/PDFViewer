import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Indicar explícitamente el root para que Turbopack no lo infiera mal
  turbopack: {
    root: path.resolve("."),
  },
};

export default nextConfig;
