import type { NextConfig } from "next"

const basePath = process.env.PAGES_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || ""

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  ...(basePath ? { basePath } : {}),
}

export default nextConfig
