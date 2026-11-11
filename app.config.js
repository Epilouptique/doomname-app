// Forme FONCTION (et non objet statique) : Expo l'évalue au moment de la
// résolution de la config, quand les variables d'env EAS sont injectées.
// Un objet statique lirait process.env une seule fois au require() du module,
// potentiellement avant l'injection → extra.googleWebClientId vide.
module.exports = () => {
  return {
  expo: {
    name: 'DoomName',
    slug: 'doomname',
    version: '1.1.0',
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
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDisplayName: 'DoomName',
      },
    },
    android: {
      package: 'fr.dahuconcept.doomname',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      // On n'utilise ni pub ni tracking : on bloque l'ID publicitaire que le SDK
      // FCM (play-services-measurement) ajoute par défaut. Évite aussi une
      // déclaration "publicité" dans le formulaire Data safety du Play Store.
      blockedPermissions: ['com.google.android.gms.permission.AD_ID'],
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
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/doomname-logo-light-512.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#f0ede8',
          // Fond = couleur exacte du carré de l'icône sombre (#1a1a2e) :
          // l'icône se fond dans le splash, sans bord visible.
          dark: {
            image: './assets/doomname-logo-dark.png',
            imageWidth: 200,
            resizeMode: 'contain',
            backgroundColor: '#1a1a2e',
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/doomname-logo-light-512.png',
          color: '#d97757',
        },
      ],
      // Connexion Google native (utilise le compte Google du téléphone).
      '@react-native-google-signin/google-signin',
      // Navigateur in-app pour le flux OAuth GitHub (retour via deep link doomname://).
      'expo-web-browser',
      'expo-apple-authentication',
    ],
    extra: {
      apiBase: 'https://domainwatch-production-1943.up.railway.app',
      // ID client Google OAuth de type "Web" (audience du jeton, non secret).
      // Défini via la variable d'env GOOGLE_WEB_CLIENT_ID au build EAS.
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
      // Sign in with Apple : code livré inactif, activé par la variable d'env EAS
      // APPLE_SIGNIN_ENABLED=1 une fois les identifiants Apple prêts.
      appleSignInEnabled: process.env.APPLE_SIGNIN_ENABLED === '1',
      router: {},
      eas: {
        projectId: '04249caf-a88f-47d7-bbfe-93df7e3e4390',
      },
    },
  },
  };
};
