import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';
const PUSH_TOKEN_KEY = 'doomname_push_token';
const EMAIL_KEY = 'doomname_email';

// Affichage des notifications reçues pendant que l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission (au 1er lancement) et récupère le token push Expo.
 * Retourne null sur le web, sur simulateur, ou si la permission est refusée.
 * Le token est mis en cache dans AsyncStorage pour être réutilisé.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null; // les push ne marchent pas sur simulateur

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alertes domaines',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#d97757',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (e) {
    console.warn('getExpoPushTokenAsync a échoué:', e);
    return null;
  }
}

/**
 * Associe le token push à l'email de l'utilisateur côté backend.
 * À appeler au démarrage (si déjà connecté) et juste après une connexion.
 */
export async function syncPushToken(email?: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const mail = email ?? (await AsyncStorage.getItem(EMAIL_KEY));
  if (!mail) return; // pas encore connecté : on enverra le token à la connexion

  const token =
    (await AsyncStorage.getItem(PUSH_TOKEN_KEY)) ??
    (await registerForPushNotificationsAsync());
  if (!token) return;

  try {
    await apiFetch(`${API_BASE}/api/manage/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail, token, platform: Platform.OS }),
    });
  } catch {
    // silencieux : la prochaine ouverture de l'app retentera la synchro
  }
}

/**
 * Dissocie le token du compte lors d'une déconnexion (sans le supprimer
 * localement : il pourra être réassocié à un autre email plus tard).
 */
export async function unregisterPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await apiFetch(`${API_BASE}/api/manage/push-token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    // silencieux
  }
}
