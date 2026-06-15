import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#d97757',
          tabBarInactiveTintColor: dark ? '#8a8880' : '#6b6b67',
          tabBarStyle: {
            backgroundColor: dark ? '#1a1a18' : '#ffffff',
            borderTopColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
          },
          headerStyle: {
            backgroundColor: dark ? '#1a1a18' : '#ffffff',
          },
          headerTintColor: dark ? '#eceae4' : '#1a1a18',
          headerTitleStyle: { fontWeight: '500' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Vérifier', tabBarIcon: () => null }} />
        <Tabs.Screen name="manage" options={{ title: 'Mes alertes', tabBarIcon: () => null }} />
        <Tabs.Screen name="developer" options={{ title: 'API', tabBarIcon: () => null }} />
        <Tabs.Screen name="cgv" options={{ title: 'CGV', tabBarIcon: () => null }} />
      </Tabs>
    </>
  );
}
