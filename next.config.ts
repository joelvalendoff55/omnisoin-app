import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Preserve the @ alias from Vite config
  // Next.js uses tsconfig.json paths for aliases
  
  // Allow images from any domain (adjust for production)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  
  // Transpile packages that need it
  transpilePackages: ["lucide-react"],
};

export default nextConfig;
