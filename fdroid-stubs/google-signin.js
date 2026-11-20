// Stub de remplacement pour `@react-native-google-signin/google-signin` sur
// le variant F-Droid : ce module dépend de Google Play Services (GMS), une
// dépendance non libre que la politique d'inclusion F-Droid n'accepte pas
// (sauf flavor sans elle — c'est précisément ce que fait ce fichier).
//
// Le vrai module appelle TurboModuleRegistry.getEnforcing(...) au chargement,
// qui plante si le module natif n'est pas lié. Ce stub évite le crash ; le
// bouton « Continuer avec Google » reste de toute façon masqué côté UI
// puisque extra.googleWebClientId est forcé à vide pour ce variant
// (app.config.js) — ces fonctions ne sont donc jamais réellement appelées.
// L'authentification par lien magique et par GitHub reste pleinement active.
const notAvailable = () => {
  throw new Error('Connexion Google indisponible sur le variant F-Droid');
};

module.exports = {
  GoogleSignin: {
    configure() {},
    hasPlayServices: notAvailable,
    signIn: notAvailable,
    signInSilently: notAvailable,
    signOut: notAvailable,
    revokeAccess: notAvailable,
    hasPreviousSignIn: () => false,
    getCurrentUser: () => null,
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'fdroid-stub-sign-in-cancelled',
    IN_PROGRESS: 'fdroid-stub-in-progress',
    PLAY_SERVICES_NOT_AVAILABLE: 'fdroid-stub-play-services-not-available',
    SIGN_IN_REQUIRED: 'fdroid-stub-sign-in-required',
  },
};
