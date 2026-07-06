import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import fr from '../translations/fr';
import en from '../translations/en';

export type Lang = 'fr' | 'en';

export const i18n = new I18n({ fr, en });
i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

// Langue du téléphone au 1er lancement : FR si français, EN sinon.
export function deviceLang(): Lang {
  try {
    const code = Localization.getLocales?.()?.[0]?.languageCode;
    return code === 'fr' ? 'fr' : 'en';
  } catch {
    return 'fr';
  }
}
