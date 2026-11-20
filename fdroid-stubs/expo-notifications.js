// Stub de remplacement pour `expo-notifications` sur le variant F-Droid.
//
// Pourquoi : le vrai module appelle TurboModuleRegistry.getEnforcing(...) au
// chargement (import), qui PLANTE immédiatement si le module natif n'est pas
// lié — ce qui est le cas ici puisqu'on exclut volontairement toute la chaîne
// Firebase/FCM (voir metro.config.js + scripts/fdroid-patch-autolinking.js).
// Ce fichier fournit juste assez de surface d'API, en no-op, pour que le code
// de l'appli (lib/notifications.ts, app/_layout.tsx, app/index.tsx) s'exécute
// sans erreur. Les alertes par e-mail — canal principal du produit — ne sont
// pas concernées : seules les notifications push (secondaires) sont inactives
// sur ce variant, cf. extra.pushNotificationsEnabled dans app.config.js.
module.exports = {
  setNotificationHandler() {},
  async setNotificationChannelAsync() {},
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  async getPermissionsAsync() {
    return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
  },
  async requestPermissionsAsync() {
    return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
  },
  async getExpoPushTokenAsync() {
    throw new Error('expo-notifications désactivé sur le variant F-Droid');
  },
  addNotificationReceivedListener() {
    return { remove() {} };
  },
  addNotificationResponseReceivedListener() {
    return { remove() {} };
  },
  async getLastNotificationResponseAsync() {
    return null;
  },
};
