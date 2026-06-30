import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Text, Image, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

const logoDark = require('../assets/doomname-logo-dark.png');
const logoLight = require('../assets/doomname-logo-light.png');

function HeaderTitle({ dark }: { dark: boolean }) {
  const c = dark ? Colors.dark : Colors.light;
  return (
    <View style={hdr.row}>
      <Image source={dark ? logoDark : logoLight} style={hdr.logo} resizeMode="contain" />
      <Text style={[hdr.title, { color: c.accent }]}>DoomName</Text>
    </View>
  );
}

const hdr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 30, height: 30 },
  title: { fontFamily: 'AmazDoom', fontSize: 22, letterSpacing: 0.3 },
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? Colors.dark : Colors.light;

  const [fontsLoaded] = useFonts({
    AmazDoom: require('../assets/fonts/AmazDooMLeft.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.textMuted,
          tabBarStyle: {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            height: 60,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          headerStyle: { backgroundColor: c.surface },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitle: () => <HeaderTitle dark={dark} />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Vérifier',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="manage"
          options={{
            tabBarLabel: 'Mes alertes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarLabel: 'Paramètres',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="developer" options={{ href: null, tabBarLabel: 'API' }} />
        <Tabs.Screen name="cgv" options={{ href: null, tabBarLabel: 'CGV' }} />
      </Tabs>
    </>
  );
}