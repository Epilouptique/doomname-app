import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator, ScrollView, Alert, Switch, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColors, Radius } from '../constants/theme';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';

export default function SettingsScreen() {
  const dark = useColorScheme() === 'dark';
  const c = useColors(dark);
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [graceAlertsEnabled, setGraceAlertsEnabled] = useState(true);

  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteErr, setDeleteErr] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('doomname_email').then(saved => {
      if (saved) {
        setUserEmail(saved);
        fetch(`${API_BASE}/api/manage/settings?email=${encodeURIComponent(saved)}`)
          .then(res => res.json())
          .then(data => {
            setEmailAlertsEnabled(data.email_alerts_enabled !== false);
            setGraceAlertsEnabled(data.grace_alerts_enabled !== false);
          })
          .catch(() => {});
      }
    });
  }, []);

  const updateSettings = async (next: { email_alerts_enabled?: boolean; grace_alerts_enabled?: boolean }) => {
    try {
      await fetch(`${API_BASE}/api/manage/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, ...next })
      });
    } catch { /* la prochaine ouverture rechargera l'état réel */ }
  };

  const requestDeletion = () => {
    const e = deleteEmail.trim().toLowerCase();
    if (!e) return;
    Alert.alert(
      'Supprimer mon compte',
      `Confirmez-vous vouloir supprimer définitivement le compte associé à ${e} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => doRequestDeletion(e) },
      ]
    );
  };

  const doRequestDeletion = async (email: string) => {
    setDeleting(true);
    setDeleteMsg('');
    setDeleteErr('');
    try {
      const res = await fetch(`${API_BASE}/api/account/delete-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setDeleteMsg('Vérifiez votre boîte mail pour confirmer la suppression de votre compte.');
        setDeleteEmail('');
      } else {
        setDeleteErr(data.error || 'Erreur lors de la demande.');
      }
    } catch {
      setDeleteErr('Impossible de contacter le serveur.');
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle = [s.input, { backgroundColor: c.surface2, borderColor: c.inputBorder, borderWidth: 1.5, color: c.text }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={s.container}>
     

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>Alertes</Text>
        {userEmail ? (
          <>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowLabel, { color: c.text }]}>Alertes e-mail</Text>
                <Text style={[s.rowDesc, { color: c.textDim }]}>Domaine surveillé devenu disponible</Text>
              </View>
              <Switch
                value={emailAlertsEnabled}
                onValueChange={v => { setEmailAlertsEnabled(v); updateSettings({ email_alerts_enabled: v }); }}
                trackColor={{ false: c.borderMd, true: c.accent }}
                thumbColor="#fff"
                ios_backgroundColor={c.borderMd}
              />
            </View>
            <View style={[s.row, { borderTopColor: c.border, borderTopWidth: 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowLabel, { color: c.text }]}>Période de grâce</Text>
                <Text style={[s.rowDesc, { color: c.textDim }]}>Grâce, rédemption ou suppression</Text>
              </View>
              <Switch
                value={graceAlertsEnabled}
                onValueChange={v => { setGraceAlertsEnabled(v); updateSettings({ grace_alerts_enabled: v }); }}
                trackColor={{ false: c.borderMd, true: c.accent }}
                thumbColor="#fff"
                ios_backgroundColor={c.borderMd}
              />
            </View>
          </>
        ) : (
          <Text style={[s.info, { color: c.textMuted }]}>Connectez-vous depuis "Mes alertes" pour gérer vos préférences.</Text>
        )}
      </View>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>Général</Text>

        <TouchableOpacity style={s.row} onPress={() => router.push('/developer')}>
          <View style={s.rowLeft}>
            <Ionicons name="code-slash-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>API développeurs</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.row, { borderTopColor: c.border, borderTopWidth: 1 }]} onPress={() => router.push('/cgv')}>
          <View style={s.rowLeft}>
            <Ionicons name="document-text-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>Conditions d'utilisation (CGV)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textDim} />
        </TouchableOpacity>
      </View>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.danger }]}>Supprimer mon compte</Text>
        <Text style={[s.info, { color: c.textMuted, marginBottom: 12 }]}>
          Supprime définitivement toutes les surveillances de domaines, clés API et préférences associées à votre adresse e-mail. Un e-mail de confirmation vous sera envoyé.
        </Text>
        <TextInput
          style={inputStyle} placeholder="votre@email.com"
          placeholderTextColor={c.textDim}
          value={deleteEmail} onChangeText={setDeleteEmail}
          autoCapitalize="none" keyboardType="email-address"
        />
        <TouchableOpacity style={[s.button, { backgroundColor: c.danger }]} onPress={requestDeletion} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Supprimer mon compte</Text>}
        </TouchableOpacity>
        {deleteMsg ? (
          <View style={[s.feedbackBox, { backgroundColor: c.successDim, borderColor: c.successBorder }]}>
            <Text style={[s.feedbackText, { color: c.success }]}>{deleteMsg}</Text>
          </View>
        ) : null}
        {deleteErr ? (
          <View style={[s.feedbackBox, { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
            <Text style={[s.feedbackText, { color: c.danger }]}>{deleteErr}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[s.footer, { color: c.textMuted }]}>
        Application réalisée par{' '}
        <Text style={{ color: c.accent }} onPress={() => Linking.openURL('https://dahu-concept.fr')}>
          Dahu-Concept
        </Text>
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingTop: 24, gap: 12, paddingBottom: 48 },
  subtitle: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  section: {
    borderRadius: Radius.lg, padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowDesc: { fontSize: 11, marginTop: 2 },
  input: {
    height: 48, borderRadius: Radius.md, paddingHorizontal: 14, marginBottom: 10,
    fontSize: 15,
  },
  button: {
    height: 48, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  feedbackBox: { borderRadius: Radius.md, borderWidth: 1, padding: 12, marginTop: 10 },
  feedbackText: { fontSize: 13 },
  info: { fontSize: 13, lineHeight: 19 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
