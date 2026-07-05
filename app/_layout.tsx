import { useEffect, useRef, useCallback, useState } from 'react';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useColors } from '../constants/theme';
import { ThemeProvider, useTheme } from '../lib/theme';
import { registerForPushNotificationsAsync, syncPushToken } from '../lib/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const { dark } = useTheme();
  const c = useColors(dark);
  const router = useRouter();

  const rootNavState = useRootNavigationState();
  const [isNavReady, setIsNavReady] = useState(false);
  const isNavReadyRef = useRef(false);
  isNavReadyRef.current = isNavReady;
  const pendingNavRef = useRef<string | null>(null);
  const coldHandledRef = useRef(false);

  const [fontsLoaded] = useFonts({
    AmazDoom: require('../assets/fonts/AmazDooMLeft.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Prêt à naviguer UNIQUEMENT quand le layout est monté (fonts chargées) ET la
  // navigation racine initialisée — évite « navigate before mounting Root Layout ».
  useEffect(() => {
    if (fontsLoaded && rootNavState?.key) setIsNavReady(true);
  }, [fontsLoaded, rootNavState?.key]);

  const flushNav = useCallback(() => {
    if (!isNavReadyRef.current || !pendingNavRef.current) return;
    const target = pendingNavRef.current;
    pendingNavRef.current = null;
    // Différé au prochain tick pour s'exécuter après le commit courant.
    setTimeout(() => router.replace(target as any), 0);
  }, [router]);

  useEffect(() => { if (isNavReady) flushNav(); }, [isNavReady, flushNav]);

  // Met la cible en file d'attente et tente de naviguer (no-op si pas prêt).
  const navigateWhenReady = useCallback((target: string) => {
    pendingNavRef.current = target;
    flushNav();
  }, [flushNav]);

  // Notifications push (mobile uniquement, jamais sur le web).
  useEffect(() => {
    if (Platform.OS === 'web') return;

    registerForPushNotificationsAsync().then(() => syncPushToken());

    const goToMain = (response?: Notifications.NotificationResponse) => {
      const data = response?.notification?.request?.content?.data as
        { filter?: string; domain?: string; type?: string } | undefined;
      const qs = new URLSearchParams();
      if (data?.filter) qs.set('filter', data.filter);
      if (data?.domain) qs.set('flash', data.domain);
      if (data?.type) qs.set('flashType', data.type);
      const s = qs.toString();
      navigateWhenReady(s ? `/?${s}` : '/');
    };

    const sub = Notifications.addNotificationResponseReceivedListener(goToMain);

    // Démarrage à froid : la réponse peut arriver avant le montage → mise en file.
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response && !coldHandledRef.current) {
        coldHandledRef.current = true;
        goToMain(response);
      }
    });

    return () => sub.remove();
  }, [navigateWhenReady]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'slide_from_right',
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.accent,
          headerTitleStyle: { color: c.text },
          headerShadowVisible: false,
        }}
      >
        {/* gestureEnabled:false : le swipe sur les items ne doit jamais déclencher
            de navigation/back sur l'écran principal. */}
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        {/* Redirection du magic link doomname://manage?token=… vers l'accueil. */}
        <Stack.Screen name="manage" />
        {/* Flèche retour native (←) + titre "DoomName" (remplace le logo, 4e). */}
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'DoomName' }} />
        <Stack.Screen name="developer" options={{ headerShown: true, title: 'API développeurs' }} />
        <Stack.Screen name="cgv" options={{ headerShown: true, title: 'CGV' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
