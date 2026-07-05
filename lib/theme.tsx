import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'doomname_theme'; // 'dark' | 'light' | absent (= suit le système)

type ThemeCtx = { dark: boolean; setDark: (v: boolean) => void };
const ThemeContext = createContext<ThemeCtx>({ dark: false, setDark: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // null = suit le thème système ; 'dark'/'light' = choix manuel persistant.
  const [override, setOverride] = useState<'dark' | 'light' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'dark' || v === 'light') setOverride(v);
    });
  }, []);

  const dark = override ? override === 'dark' : system === 'dark';

  const setDark = (v: boolean) => {
    const mode = v ? 'dark' : 'light';
    setOverride(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  };

  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
