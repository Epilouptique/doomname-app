/**
 * Ajoute l'image de "branding" en bas de l'écran de démarrage Android (API
 * officielle androidx.core.splashscreen : windowSplashScreenBrandingImage),
 * en plus de l'icône centrée déjà gérée par le plugin expo-splash-screen.
 * Voir https://developer.android.com/develop/ui/views/launch/splash-screen
 */
const { withAndroidStyles, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withSplashBrandingImage(config, { brandingImage }) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const drawableDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.copyFileSync(
        path.join(cfg.modRequest.projectRoot, brandingImage),
        path.join(drawableDir, 'splash_branding.png')
      );
      return cfg;
    },
  ]);

  config = withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults.resources.style || [];
    for (const style of styles) {
      if (style.$.name === 'Theme.App.SplashScreen') {
        style.item = (style.item || []).filter(i => i.$.name !== 'windowSplashScreenBrandingImage');
        style.item.push({ $: { name: 'windowSplashScreenBrandingImage' }, _: '@drawable/splash_branding' });
      }
    }
    return cfg;
  });

  return config;
}

module.exports = withSplashBrandingImage;
