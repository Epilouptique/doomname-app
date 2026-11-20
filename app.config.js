// Forme FONCTION (et non objet statique) : Expo l'évalue au moment de la
// résolution de la config, quand les variables d'env EAS sont injectées.
// Un objet statique lirait process.env une seule fois au require() du module,
// potentiellement avant l'injection → extra.googleWebClientId vide.
// Variant F-Droid : APP_VARIANT=fdroid désactive tout ce qui dépend de Google
// Play Services / Firebase (Connexion Google, notifications push), pour un
// build reproductible depuis les sources publiques, sans secret à injecter.
// L'authentification par lien magique et par GitHub, ainsi que les alertes
// par e-mail (le canal principal du produit), restent entièrement actives.
const APP_VARIANT = process.env.APP_VARIANT || 'play';
const IS_FDROID = APP_VARIANT === 'fdroid';

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
      // versionCode : sur le build Play Store, EAS le gère à distance
      // (autoIncrement) — ne rien fixer ici le laisse à sa valeur par défaut
      // habituelle. F-Droid build depuis les sources, sans accès à ce
      // compteur distant : un versionCode fixe et déterministe est donc requis
      // pour ce variant. Suit sa propre numérotation, incrémentée à la main à
      // chaque nouvelle release F-Droid (indépendante du Play Store).
      versionCode: IS_FDROID ? 1 : undefined,
      // Build F-Droid : ni Connexion Google ni notifications push (plugins
      // exclus ci-dessous) → aucun besoin du fichier Firebase, donc aucun
      // plugin Gradle google-services appliqué (zéro dépendance Google dans
      // l'APK). Le build Play Store garde le vrai fichier fourni via la
      // variable d'env GOOGLE_SERVICES_JSON (secret EAS).
      googleServicesFile: IS_FDROID
        ? undefined
        : (process.env.GOOGLE_SERVICES_JSON || './google-services.json'),
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
      // Notifications push : exclu du variant F-Droid (dépend de Firebase/FCM,
      // non libre — politique d'inclusion F-Droid). Stub JS dans fdroid-stubs/
      // (voir metro.config.js) ; lib bibliothèque Android exclue de
      // l'autolinking (scripts/fdroid-patch-autolinking.js).
      !IS_FDROID && [
        'expo-notifications',
        {
          icon: './assets/doomname-logo-light-512.png',
          color: '#d97757',
        },
      ],
      // Connexion Google native : même raison, exclue du variant F-Droid
      // (dépend de Google Play Services, non libre).
      !IS_FDROID && '@react-native-google-signin/google-signin',
      // Navigateur in-app pour le flux OAuth GitHub (retour via deep link doomname://).
      'expo-web-browser',
      'expo-apple-authentication',
      // GoogleSignIn 9.x (via @react-native-google-signin) tire des pods Swift
      // (AppCheckCore) dépendant de pods ObjC sans module : modular headers
      // ciblés sur ces seuls pods, sans version (dépendances transitives).
      // Pas de useFrameworks ni de use_modular_headers! global.
      // N'a d'effet qu'en présence du plugin google-signin ci-dessus (iOS
      // uniquement) ; inoffensif sinon.
      !IS_FDROID && ['expo-build-properties', {
        ios: {
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true },
            { name: 'AppCheckCore', modular_headers: true },
          ],
        },
      }],
    ].filter(Boolean),
    extra: {
      apiBase: 'https://domainwatch-production-1943.up.railway.app',
      // ID client Google OAuth de type "Web" (audience du jeton, non secret).
      // Défini via la variable d'env GOOGLE_WEB_CLIENT_ID au build EAS.
      // Forcé à vide sur le variant F-Droid : masque le bouton Google (déjà
      // le comportement existant quand cette valeur est absente) sans toucher
      // au code — aucune dépendance Google n'est donc exercée à l'exécution.
      googleWebClientId: IS_FDROID ? '' : (process.env.GOOGLE_WEB_CLIENT_ID || ''),
      // Sign in with Apple : code livré inactif, activé par la variable d'env EAS
      // APPLE_SIGNIN_ENABLED=1 une fois les identifiants Apple prêts.
      appleSignInEnabled: process.env.APPLE_SIGNIN_ENABLED === '1',
      // Notifications push : désactivées sur le variant F-Droid (pas de
      // google-services.json réel disponible pour un build reproductible
      // depuis les sources publiques). Les alertes par e-mail, canal
      // principal du produit, ne sont pas concernées.
      pushNotificationsEnabled: !IS_FDROID,
      appVariant: APP_VARIANT,
      router: {},
      eas: {
        projectId: '04249caf-a88f-47d7-bbfe-93df7e3e4390',
      },
    },
  },
  };
};
