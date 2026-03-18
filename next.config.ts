import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CAPACITOR_BUILD=true で静的エクスポート（モバイルアプリ用）
  ...(process.env.CAPACITOR_BUILD ? { output: "export" } : {}),
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("microsoft-cognitiveservices-speech-sdk");
    }
    return config;
  },
};

export default nextConfig;
