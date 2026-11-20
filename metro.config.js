// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Variant F-Droid (APP_VARIANT=fdroid, voir app.config.js) : remplace à la
// résolution des modules les deux dépendances non libres (Google Sign-In →
// Google Play Services, expo-notifications → Firebase/FCM) par des stubs
// locaux no-op (fdroid-stubs/). Ceci évite d'embarquer du code lié à des
// services Google non libres dans l'APK F-Droid, conformément à la politique
// d'inclusion F-Droid (Firebase/GMS non acceptés, sauf variant sans eux).
// Hors variant F-Droid (build Play Store / EAS habituel), rien ne change.
if (process.env.APP_VARIANT === 'fdroid') {
  const FDROID_STUBS = {
    '@react-native-google-signin/google-signin': path.resolve(
      __dirname,
      'fdroid-stubs/google-signin.js'
    ),
    'expo-notifications': path.resolve(
      __dirname,
      'fdroid-stubs/expo-notifications.js'
    ),
  };

  const previousResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const stubPath = FDROID_STUBS[moduleName];
    if (stubPath) {
      return { type: 'sourceFile', filePath: stubPath };
    }
    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
