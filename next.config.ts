import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return {
      beforeFiles: [
        // Proxy everything EXCEPT api and _next to the Spokum server
        {
          source: "/js/:path*",
          destination: "http://127.0.0.1:4173/js/:path*",
        },
        {
          source: "/css/:path*",
          destination: "http://127.0.0.1:4173/css/:path*",
        },
        {
          source: "/fonts/:path*",
          destination: "http://127.0.0.1:4173/fonts/:path*",
        },
        {
          source: "/vendor/:path*",
          destination: "http://127.0.0.1:4173/vendor/:path*",
        },
        {
          source: "/web/:path*",
          destination: "http://127.0.0.1:4173/web/:path*",
        },
        {
          source: "/logo.jpg",
          destination: "http://127.0.0.1:4173/logo.jpg",
        },
        {
          source: "/config.js",
          destination: "http://127.0.0.1:4173/config.js",
        },
        {
          source: "/manifest.webmanifest",
          destination: "http://127.0.0.1:4173/manifest.webmanifest",
        },
        {
          source: "/sw.js",
          destination: "http://127.0.0.1:4173/sw.js",
        },
      ],
    };
  },
};

export default nextConfig;
