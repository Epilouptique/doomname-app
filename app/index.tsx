import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator, ScrollView
} from 'react-native';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';

export default function CheckScreen() {
  const dark = useColorScheme() === 'dark';
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkDomain = async () => {
    const d = domain.trim().toLowerCase();
    if (!d) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(d)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const s = styles(dark);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>🌐 Vérifier un domaine</Text>
      <Text style={s.subtitle}>Entrez un nom de domaine pour vérifier sa disponibilité</Text>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="exemple.com"
          placeholderTextColor={dark ? '#6b6b67' : '#aaa'}
          value={domain}
          onChangeText={setDomain}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={checkDomain}
        />
        <TouchableOpacity style={s.button} onPress={checkDomain} disabled={loading}>
          <Text style={s.buttonText}>Vérifier</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#d97757" style={{ marginTop: 24 }} />}

      {error ? <Text style={s.error}>{error}</Text> : null}

      {result && (
        <View style={s.card}>
          <Text style={s.domain}>{result.domain}</Text>
          <View style={[s.badge, { backgroundColor: result.available ? '#22c55e22' : '#ef444422' }]}>
            <Text style={[s.badgeText, { color: result.available ? '#16a34a' : '#dc2626' }]}>
              {result.available ? '✅ Disponible' : '❌ Enregistré'}
            </Text>
          </View>
          {result.expiration_date && (
            <Text style={s.info}>Expire le : {new Date(result.expiration_date).toLocaleDateString('fr-FR')}</Text>
          )}
          {result.registrar && (
            <Text style={s.info}>Registrar : {result.registrar}</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = (dark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: dark ? '#0f0f0e' : '#f9f9f8' },
  container: { padding: 24, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: '700', color: dark ? '#eceae4' : '#1a1a18', marginBottom: 8 },
  subtitle: { fontSize: 14, color: dark ? '#8a8880' : '#6b6b67', marginBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1, height: 48, borderRadius: 10, paddingHorizontal: 14,
    backgroundColor: dark ? '#1e1e1c' : '#ffffff',
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: dark ? '#eceae4' : '#1a1a18', fontSize: 15,
  },
  button: {
    height: 48, paddingHorizontal: 18, borderRadius: 10,
    backgroundColor: '#d97757', justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#dc2626', marginTop: 16, textAlign: 'center' },
  card: {
    marginTop: 24, padding: 20, borderRadius: 14,
    backgroundColor: dark ? '#1e1e1c' : '#ffffff',
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  domain: { fontSize: 18, fontWeight: '700', color: dark ? '#eceae4' : '#1a1a18' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontWeight: '600', fontSize: 14 },
  info: { fontSize: 14, color: dark ? '#8a8880' : '#6b6b67' },
});