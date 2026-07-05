import { useEffect, useRef, useCallback } from 'react';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useColors } from '../constants/theme';
import { registerForPushNotificationsAsync, syncPushToken } from '../lib/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const c = useColors(dark);
  const router = useRouter();

  // Navigation prête (le Stack est monté) ? Au démarrage à froid via un tap de
  // notification, la réponse arrive avant : on met la cible en file d'attente.
  const navState = useRootNavigationState();
  const navReady = !!navState?.key;
  const navReadyRef = useRef(false);
  navReadyRef.current = navReady;
  const pendingNavRef = useRef<string | null>(null);
  const coldHandledRef = useRef(false);

  const [fontsLoaded] = useFonts({
    AmazDoom: require('../assets/fonts/AmazDooMLeft.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const navigateWhenReady = useCallback((target: string) => {
    if (navReadyRef.current) router.replace(target);
    else pendingNavRef.current = target;
  }, [router]);

  useEffect(() => {
    if (navReady && pendingNavRef.current) {
      const target = pendingNavRef.current;
      pendingNavRef.current = null;
      router.replace(target);
    }
  }, [navReady, router]);

  // Notifications push (mobile uniquement, jamais sur le web).
  useEffect(() => {
    if (Platform.OS === 'web') return;

    registerForPushNotificationsAsync().then(() => syncPushToken());

    // Tap sur une notification → écran principal, avec le filtre + le domaine à
    // mettre en évidence transmis dans le payload.
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

    // Démarrage à froid : traité une seule fois, navigation différée si besoin.
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
        <Stack.Screen name="index" />
        {/* Flèche retour native (←) + titre "DoomName" (remplace le logo, 4e). */}
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'DoomName' }} />
        <Stack.Screen name="developer" options={{ headerShown: true, title: 'API développeurs' }} />
        <Stack.Screen name="cgv" options={{ headerShown: true, title: 'CGV' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
