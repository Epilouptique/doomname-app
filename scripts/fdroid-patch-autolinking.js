#!/usr/bin/env node
// À exécuter AVANT `expo prebuild` pour le variant F-Droid (APP_VARIANT=fdroid).
//
// Ajoute dans package.json la clé `expo.autolinking.android.exclude` pour les
// deux dépendances non libres (Google Sign-In → Google Play Services,
// expo-notifications → Firebase/FCM) : leurs bibliothèques Android natives ne
// seront alors pas compilées dans l'APK, conformément à la politique
// d'inclusion F-Droid ("Firebase and GMS are some notable examples of
// non-FOSS libs that are not accepted. If the app can work (in some
// capacity) without these, please create a flavor/version without them.").
//
// Les stubs JS correspondants sont dans fdroid-stubs/ (voir metro.config.js).
// N'affecte jamais le build Play Store / EAS : ce script n'est appelé que
// dans la recette de build F-Droid (metadata `init:`), jamais ailleurs.
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const EXCLUDED = [
  '@react-native-google-signin/google-signin',
  'expo-notifications',
];

pkg.expo = pkg.expo || {};
pkg.expo.autolinking = pkg.expo.autolinking || {};
pkg.expo.autolinking.android = pkg.expo.autolinking.android || {};
const existing = Array.isArray(pkg.expo.autolinking.android.exclude)
  ? pkg.expo.autolinking.android.exclude
  : [];
pkg.expo.autolinking.android.exclude = Array.from(new Set([...existing, ...EXCLUDED]));

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(
  '[fdroid] package.json patché : exclusion autolinking Android pour',
  EXCLUDED.join(', ')
);
