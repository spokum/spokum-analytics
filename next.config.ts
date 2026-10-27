import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  basePath: "/spokum-analytics",
  trailingSlash: true,
};

export default nextConfig;
