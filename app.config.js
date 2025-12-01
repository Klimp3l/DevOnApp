module.exports = {
  expo: {
    name: "devon-app",
    slug: "devon-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "devonapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.iandev.devonapp",
      supportsTablet: true
    },
    android: {
      package: "com.iandev.devonapp",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      // Permissões necessárias para acesso à internet e rede
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_WIFI_STATE"
      ],
      // Permite tráfego cleartext (HTTP) para desenvolvimento
      // Para produção com HTTPS, pode deixar false
      usesCleartextTraffic: false
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.0.21",
            "usesCleartextTraffic": false,
            "networkInspector": true
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      // Variáveis de ambiente acessíveis via Constants.expoConfig.extra
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      eas: {
        projectId: "007de3bf-c1b4-4060-b05c-339f2b39e557"
      }
    }
  }
};

