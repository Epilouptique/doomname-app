import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Alert, Switch, Linking, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColors, Radius } from '../constants/theme';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/lang';
import { PAYPAL_URL, KOFI_URL } from '../constants/support';
import { apiFetch } from '../lib/api';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';

export default function SettingsScreen() {
  const { dark, setDark } = useTheme();
  const { t, lang, setLang } = useLang();
  const c = useColors(dark);
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [graceAlertsEnabled, setGraceAlertsEnabled] = useState(true);

  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteErr, setDeleteErr] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('doomname_session').then(tok => { if (tok) setSessionToken(tok); });
    AsyncStorage.getItem('doomname_email').then(saved => {
      if (saved) {
        setUserEmail(saved);
        apiFetch(`${API_BASE}/api/manage/settings?email=${encodeURIComponent(saved)}`)
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
      await apiFetch(`${API_BASE}/api/manage/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, ...next })
      });
    } catch { /* la prochaine ouverture rechargera l'état réel */ }
  };

  const openFeedbackMail = async () => {
    const url = 'mailto:contact@dahu-concept.fr?subject=DoomName%20-%20Retour&body=Type%20de%20retour%20(bug%20/%20id%C3%A9e)%20:%0A%0ADescription%20:%0A';
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.feedback_no_mail_title'), t('settings.feedback_no_mail_msg'));
    }
  };

  // Lien externe → navigateur système (pas de WebView, pas de paiement in-app).
  const openExternal = (url: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const requestDeletion = () => {
    // Connecté : e-mail du compte (non modifiable). Sinon : saisie libre.
    const e = (userEmail || deleteEmail).trim().toLowerCase();
    if (!e) return;
    Alert.alert(
      t('settings.delete_confirm_title'),
      t('settings.delete_confirm_msg', { email: e }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.delete_action'), style: 'destructive', onPress: () => doRequestDeletion(e) },
      ]
    );
  };

  const doRequestDeletion = async (email: string) => {
    setDeleting(true);
    setDeleteMsg('');
    setDeleteErr('');
    try {
      // Avec un jeton de session, le backend supprime immédiatement le compte de
      // cette session ; sans jeton, il envoie un e-mail de confirmation.
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
      const res = await fetch(`${API_BASE}/api/account/delete-request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success && data.deleted) {
        // Suppression effective : on efface l'identité locale et on revient à l'accueil.
        await AsyncStorage.multiRemove(['doomname_email', 'doomname_session']);
        setUserEmail(''); setSessionToken('');
        Alert.alert(t('settings.delete_done_title'), t('settings.delete_done_msg'), [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      } else if (data.success) {
        setDeleteMsg(t('settings.delete_sent'));
        setDeleteEmail('');
      } else {
        setDeleteErr(data.error || t('settings.delete_err'));
      }
    } catch {
      setDeleteErr(t('settings.delete_err_server'));
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle = [s.input, { backgroundColor: c.surface2, borderColor: c.inputBorder, borderWidth: 1.5, color: c.text }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={s.container}>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>{t('settings.section_alerts')}</Text>
        {userEmail ? (
          <>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.email_alerts')}</Text>
                <Text style={[s.rowDesc, { color: c.textDim }]}>{t('settings.email_alerts_desc')}</Text>
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
                <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.grace')}</Text>
                <Text style={[s.rowDesc, { color: c.textDim }]}>{t('settings.grace_desc')}</Text>
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
          <Text style={[s.info, { color: c.textMuted }]}>{t('settings.not_connected')}</Text>
        )}
      </View>

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>{t('settings.section_general')}</Text>

        <View style={s.row}>
          <View style={s.rowLeft}>
            <Ionicons name="moon-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.dark_mode')}</Text>
          </View>
          <Switch
            value={dark}
            onValueChange={setDark}
            trackColor={{ false: c.borderMd, true: c.accent }}
            thumbColor="#fff"
            ios_backgroundColor={c.borderMd}
          />
        </View>

        <View style={[s.row, { borderTopColor: c.border, borderTopWidth: 1 }]}>
          <View style={s.rowLeft}>
            <Ionicons name="language-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.language')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['fr', 'en'] as const).map(L => (
              <TouchableOpacity
                key={L}
                onPress={() => setLang(L)}
                style={[s.langBtn, { borderColor: lang === L ? c.accent : c.borderMd, backgroundColor: lang === L ? c.accentDim : 'transparent' }]}
              >
                <Text style={{ color: lang === L ? c.accent : c.textMuted, fontSize: 12, fontWeight: '600' }}>{L.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[s.row, { borderTopColor: c.border, borderTopWidth: 1 }]} onPress={() => router.push('/developer')}>
          <View style={s.rowLeft}>
            <Ionicons name="code-slash-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.api_devs')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.row, { borderTopColor: c.border, borderTopWidth: 1 }]} onPress={() => router.push('/cgv')}>
          <View style={s.rowLeft}>
            <Ionicons name="document-text-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.cgv')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.row, { borderTopColor: c.border, borderTopWidth: 1 }]} onPress={openFeedbackMail}>
          <View style={s.rowLeft}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.feedback')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textDim} />
        </TouchableOpacity>
      </View>

      {/* Masqué sur iOS : guideline App Store 3.1.1 (pas de lien vers un paiement externe). */}
      {Platform.OS !== 'ios' && (
      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.accent }]}>{t('settings.section_support')}</Text>
        <Text style={[s.info, { color: c.textMuted, marginBottom: 4 }]}>{t('settings.support_desc')}</Text>

        <TouchableOpacity style={s.row} onPress={() => openExternal(PAYPAL_URL)}>
          <View style={s.rowLeft}>
            <Ionicons name="heart-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.support_paypal')}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={c.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.row, { borderTopColor: c.border, borderTopWidth: 1, opacity: KOFI_URL ? 1 : 0.45 }]}
          onPress={() => openExternal(KOFI_URL)}
          disabled={!KOFI_URL}
        >
          <View style={s.rowLeft}>
            <Ionicons name="cafe-outline" size={18} color={c.textMuted} />
            <Text style={[s.rowLabel, { color: c.text }]}>{t('settings.support_kofi')}</Text>
          </View>
          {KOFI_URL
            ? <Ionicons name="open-outline" size={18} color={c.textDim} />
            : <Text style={{ color: c.textDim, fontSize: 12 }}>{t('settings.support_soon')}</Text>}
        </TouchableOpacity>
      </View>
      )}

      <View style={[s.section, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[s.sectionTitle, { color: c.danger }]}>{t('settings.section_delete')}</Text>
        <Text style={[s.info, { color: c.textMuted, marginBottom: 12 }]}>
          {t(sessionToken ? 'settings.delete_desc_auth' : 'settings.delete_desc')}
        </Text>
        {userEmail ? (
          <TextInput
            style={[inputStyle, { opacity: 0.7 }]}
            value={userEmail} editable={false} selectTextOnFocus={false}
          />
        ) : (
          <TextInput
            style={inputStyle} placeholder={t('common.email_placeholder')}
            placeholderTextColor={c.textDim}
            value={deleteEmail} onChangeText={setDeleteEmail}
            autoCapitalize="none" keyboardType="email-address"
          />
        )}
        <TouchableOpacity style={[s.button, { backgroundColor: c.danger }]} onPress={requestDeletion} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{t('settings.delete_btn')}</Text>}
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
        {t('settings.made_by')}{' '}
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
  langBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12 },
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
