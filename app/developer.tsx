import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator, ScrollView, Linking
} from 'react-native';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';

export default function DeveloperScreen() {
  const dark = useColorScheme() === 'dark';
  const s = styles(dark);

  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const requestKey = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/developer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, label: label.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) setSuccess('✅ Votre clé API a été envoyée par email.');
      else setError(data.error || 'Erreur lors de la création.');
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container}>
      <Text style={s.title}>⚙️ API DoomName</Text>
      <Text style={s.subtitle}>Intégrez la surveillance de domaines dans vos projets</Text>

      {/* Endpoint */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Endpoint</Text>
        <View style={s.code}>
          <Text style={s.codeText}>GET /api/v1/check?domain=exemple.com</Text>
        </View>
        <View style={s.code}>
          <Text style={s.codeText}>Authorization: Bearer dk_...</Text>
        </View>
      </View>

      {/* Limites */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Limites</Text>
        <Text style={s.info}>• 100 requêtes / jour</Text>
        <Text style={s.info}>• 3 clés max par email</Text>
        <Text style={s.info}>• Gratuit</Text>
      </View>

      {/* Demander une clé */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Obtenir une clé API</Text>
        <TextInput
          style={s.input} placeholder="votre@email.com"
          placeholderTextColor={dark ? '#6b6b67' : '#aaa'}
          value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address"
        />
        <TextInput
          style={s.input} placeholder="Label (optionnel)"
          placeholderTextColor={dark ? '#6b6b67' : '#aaa'}
          value={label} onChangeText={setLabel}
        />
        <TouchableOpacity style={s.button} onPress={requestKey} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Recevoir ma clé par email</Text>}
        </TouchableOpacity>
        {success ? <Text style={s.success}>{success}</Text> : null}
        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>

      {/* Liens */}
      <View style={s.section}>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.doomname.com/docs.html')}>
          <Text style={s.link}>📄 Documentation complète →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://github.com/Epilouptique/domainwatch')} style={{ marginTop: 12 }}>
          <Text style={s.link}>🐙 GitHub →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://stats.uptimerobot.com/TZd3LdVQWB')} style={{ marginTop: 12 }}>
          <Text style={s.link}>📊 Status / Uptime →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (dark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: dark ? '#0f0f0e' : '#f9f9f8' },
  container: { padding: 24, paddingTop: 40, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: dark ? '#eceae4' : '#1a1a18', marginBottom: 8 },
  subtitle: { fontSize: 14, color: dark ? '#8a8880' : '#6b6b67', marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#d97757', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  code: {
    backgroundColor: dark ? '#1a1a18' : '#1a1a18', borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  codeText: { color: '#e8eaf0', fontFamily: 'monospace', fontSize: 12 },
  input: {
    height: 48, borderRadius: 10, paddingHorizontal: 14, marginBottom: 10,
    backgroundColor: dark ? '#1e1e1c' : '#ffffff',
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: dark ? '#eceae4' : '#1a1a18', fontSize: 15,
  },
  button: {
    height: 48, borderRadius: 10, backgroundColor: '#d97757',
    justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  success: { color: '#16a34a', marginTop: 10, textAlign: 'center' },
  error: { color: '#dc2626', marginTop: 10, textAlign: 'center' },
  info: { fontSize: 14, color: dark ? '#8a8880' : '#6b6b67', marginBottom: 6 },
  link: { fontSize: 15, color: '#d97757', fontWeight: '500' },
});