import { Redirect, useLocalSearchParams } from 'expo-router';

// Route de compatibilité : le magic link des e-mails ouvre
// doomname://manage?token=… . On redirige vers l'écran principal en
// conservant le token, qui y est vérifié (évite la page "unmatched route").
export default function ManageRedirect() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <Redirect href={token ? `/?token=${encodeURIComponent(String(token))}` : '/'} />;
}
