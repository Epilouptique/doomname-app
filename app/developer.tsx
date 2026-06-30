import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator, ScrollView, Linking
} from 'react-native';
import { useColors, Radius } from '../constants/theme';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';

export default function DeveloperScreen() {
  const dark = useColorScheme() === 'dark';
  const c = useColors(dark);

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
      if (data.success) setSuccess('Votre clé API a été envoyée par email.');
      else setError(data.error || 'Erreur lors de la création.');
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [s.input, { backgroundColor: c.surface2, borderColor: c.inputBorder, borderWidth: 1.5, color: c.text }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={s.container}>
      <Text style={[s.subtitle, { color: c.textMuted }]}>Intégrez la surveillance de domaines dans vos projets</Text>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>Endpoint</Text>
        <View style={s.code}>
          <Text style={s.codeText}>GET /api/v1/check?domain=exemple.com</Text>
        </View>
        <View style={s.code}>
          <Text style={s.codeText}>Authorization: Bearer dk_...</Text>
        </View>
      </View>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>Limites</Text>
        <Text style={[s.info, { color: c.textMuted }]}>• 100 requêtes / jour</Text>
        <Text style={[s.info, { color: c.textMuted }]}>• 3 clés max par email</Text>
        <Text style={[s.info, { color: c.textMuted }]}>• Gratuit</Text>
      </View>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>Obtenir une clé API</Text>
        <TextInput
          style={inputStyle} placeholder="votre@email.com"
          placeholderTextColor={c.textDim}
          value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address"
        />
        <TextInput
          style={inputStyle} placeholder="Label (optionnel)"
          placeholderTextColor={c.textDim}
          value={label} onChangeText={setLabel}
        />
        <TouchableOpacity style={[s.button, { backgroundColor: c.accent }]} onPress={requestKey} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Recevoir ma clé par email</Text>}
        </TouchableOpacity>
        {success ? (
          <View style={[s.feedbackBox, { backgroundColor: c.successDim, borderColor: c.successBorder }]}>
            <Text style={[s.feedbackText, { color: c.success }]}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={[s.feedbackBox, { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
            <Text style={[s.feedbackText, { color: c.danger }]}>{error}</Text>
          </View>
        ) : null}
      </View>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>Liens</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.doomname.com/docs.html')}>
          <Text style={[s.link, { color: c.accent }]}>📄 Documentation complète →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://github.com/Epilouptique/domainwatch')} style={{ marginTop: 12 }}>
          <Text style={[s.link, { color: c.accent }]}>🐙 GitHub →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://stats.uptimerobot.com/TZd3LdVQWB')} style={{ marginTop: 12 }}>
          <Text style={[s.link, { color: c.accent }]}>📊 Status / Uptime →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingTop: 24, gap: 12 },
  subtitle: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  section: {
    borderRadius: Radius.lg, padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  code: {
    backgroundColor: '#1a1a18', borderRadius: Radius.sm,
    padding: 12, marginBottom: 8,
  },
  codeText: { color: '#e8eaf0', fontFamily: 'monospace', fontSize: 12 },
  input: {
    height: 48, borderRadius: Radius.md, paddingHorizontal: 14, marginBottom: 10,
    borderWidth: 1, fontSize: 15,
  },
  button: {
    height: 48, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  feedbackBox: { borderRadius: Radius.md, borderWidth: 1, padding: 12, marginTop: 10 },
  feedbackText: { fontSize: 13 },
  info: { fontSize: 14, marginBottom: 6 },
  link: { fontSize: 15, fontWeight: '500' },
});
