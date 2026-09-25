import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` and `next build` write to separate folders so a build never breaks a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
