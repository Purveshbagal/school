import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Student photo uploads are submitted as base64 data URLs in the admission form's
    // Server Action — the default 1MB limit is tight once base64 overhead is added in.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
