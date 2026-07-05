module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo (SDK 54) ajoute automatiquement le plugin
  // react-native-worklets (reanimated v4) quand le package est installé —
  // ne pas le rajouter ici pour éviter un doublon.
  return {
    presets: ['babel-preset-expo'],
  };
};
