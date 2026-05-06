import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.farsilearning.app",
  appName: "ペルシア語学習",
  webDir: "out",
  server: {
    url: "https://persian-learning.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#059669",
      showSpinner: false,
    },
  },
};

export default config;
