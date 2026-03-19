import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.farsilearning.app",
  appName: "ペルシア語学習",
  webDir: "out",
  server: {
    // Development: point to local dev server (same WiFi network)
    url: "http://192.168.128.156:3000",
    cleartext: true,

    // Production: comment out url/cleartext above, use bundled web assets
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#059669",
    },
  },
};

export default config;
