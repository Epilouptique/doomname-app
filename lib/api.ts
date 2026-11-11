import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_KEY = 'doomname_session';

/**
 * fetch() pour les endpoints de gestion (/api/manage/*, /api/subscribe) :
 * ajoute « Authorization: Bearer <jeton de session> » quand un jeton est en
 * stockage. Sans jeton (ancienne connexion, lecture impossible), l'appel part
 * exactement comme un fetch() normal : aucun appel n'échoue faute de jeton.
 * Côté serveur, l'e-mail de la session fait alors autorité sur celui de la requête.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  try { token = await AsyncStorage.getItem(SESSION_KEY); } catch { /* sans jeton */ }
  if (!token) return fetch(url, init);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
