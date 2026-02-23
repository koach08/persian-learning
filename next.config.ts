import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("microsoft-cognitiveservices-speech-sdk");
    }
    return config;
  },
};

export default nextConfig;
