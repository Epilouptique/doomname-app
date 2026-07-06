import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, deviceLang, type Lang } from './i18n';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';
const STORAGE_KEY = 'doomname_lang';

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, params?: any) => string };
const LangContext = createContext<Ctx>({ lang: 'fr', setLang: () => {}, t: (k) => k });

// Propage la langue active au backend (colonne lang → e-mails/notifs localisés).
async function syncLangToBackend(lang: Lang) {
  try {
    const email = await AsyncStorage.getItem('doomname_email');
    if (!email) return;
    await fetch(`${API_BASE}/api/manage/lang`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lang }),
    });
  } catch { /* best-effort */ }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      const l: Lang = v === 'fr' || v === 'en' ? v : deviceLang();
      i18n.locale = l;
      setLangState(l);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    i18n.locale = l;
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
    syncLangToBackend(l);
  }, []);

  i18n.locale = lang;
  const t = useCallback((key: string, params?: any) => i18n.t(key, params), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
