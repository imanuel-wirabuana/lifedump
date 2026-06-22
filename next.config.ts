import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["radix-ui", "@base-ui/react"],
  },
}

export default nextConfig
