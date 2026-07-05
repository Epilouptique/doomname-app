module.exports = {
  expo: {
    name: 'DoomName',
    slug: 'doomname',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/doomname-logo-light-512.png',
    scheme: 'doomname',
    userInterfaceStyle: 'automatic',
    // EAS Update (OTA) : le runtime suit la version de l'app ; un binaire n'accepte
    // que les updates compilées avec la même runtimeVersion.
    runtimeVersion: { policy: 'appVersion' },
    updates: {
      url: 'https://u.expo.dev/04249caf-a88f-47d7-bbfe-93df7e3e4390',
      fallbackToCacheTimeout: 0,
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'fr.dahuconcept.doomname',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      package: 'fr.dahuconcept.doomname',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/doomname-logo-light-512.png',
        backgroundColor: '#d97757',
      },
    },
    web: {
      favicon: './assets/doomname-logo-light-512.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/doomname-logo-light-512.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#f0ede8',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/doomname-logo-light-512.png',
          color: '#d97757',
        },
      ],
    ],
    extra: {
      apiBase: 'https://domainwatch-production-1943.up.railway.app',
      router: {},
      eas: {
        projectId: '04249caf-a88f-47d7-bbfe-93df7e3e4390',
      },
    },
  },
};
