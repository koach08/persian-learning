import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.farsilearning.app",
  appName: "ペルシア語学習",
  webDir: "out",
  server: {
    // Development: point to local dev server
    // url: "http://192.168.11.12:3000",
    // cleartext: true,

    // Production: use bundled web assets
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
