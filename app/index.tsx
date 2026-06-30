import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator,
  ScrollView, Modal
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, Radius } from '../constants/theme';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';
const COMMON_TLDS = ['com', 'io', 'studio', 'net', 'fr', 'org', 'co', 'app'];

export default function CheckScreen() {
  const dark = useColorScheme() === 'dark';
  const c = useColors(dark);
  const inputRef = useRef<TextInput>(null);

  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('doomname_email').then(e => { if (e) setSavedEmail(e); });
  }, []);

  const checkDomain = async (domainOverride?: string) => {
    const d = (domainOverride ?? domain).trim().toLowerCase();
    if (!d) return;
    inputRef.current?.blur();
    setLoading(true);
    setResult(null);
    setError('');
    setSubscribeMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(d)}`);
      const data = await res.json();
      setResult(data);
      if (!data.available) {
        if (savedEmail) {
          await subscribe(d, savedEmail);
        } else {
          setShowEmailModal(true);
        }
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (d: string, email: string) => {
    setSubscribing(true);
    try {
      const res = await fetch(`${API_BASE}/api/manage/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d, email })
      });
      const data = await res.json();
      if (data.success) {
        setSubscribeMsg('✅ Alerte ajoutée à votre liste !');
        await AsyncStorage.setItem('doomname_email', email);
        setSavedEmail(email);
      } else {
        setSubscribeMsg(data.error || 'Erreur lors de l\'ajout.');
      }
    } catch {
      setSubscribeMsg('Impossible d\'ajouter l\'alerte.');
    } finally {
      setSubscribing(false);
    }
  };

  const confirmEmail = async () => {
    const e = emailInput.trim().toLowerCase();
    if (!e) return;
    setShowEmailModal(false);
    await subscribe(domain.trim().toLowerCase(), e);
  };

  const clearInput = () => {
    setDomain('');
    setResult(null);
    setError('');
    setSubscribeMsg('');
    inputRef.current?.focus();
  };

  const useSuggestion = (d: string) => {
    setDomain(d);
    checkDomain(d);
  };

  const domainMatch = domain.trim().toLowerCase().match(/^([a-z0-9-]+)\.([a-z]{2,})$/);
  const suggestions = domainMatch
    ? COMMON_TLDS.filter(t => t !== domainMatch[2]).slice(0, 4).map(t => `${domainMatch[1]}.${t}`)
    : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[s.subtitle, { color: c.textMuted }]}>
        Entrez un domaine pour être alerté dès qu'il se libère
      </Text>

      {/* Barre de recherche */}
      <View style={s.searchRow}>
        <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: c.inputBorder, borderWidth: 1.5 }]}>
          <TextInput
            ref={inputRef}
            style={[s.inputInner, { color: c.text }]}
            placeholder="exemple.com"
            placeholderTextColor={c.textDim}
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => checkDomain()}
            keyboardType="url"
          />
          {domain.length > 0 && (
            <TouchableOpacity onPress={clearInput} style={s.clearBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color={c.textDim} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: c.accent }]}
          onPress={() => checkDomain()}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="search" size={20} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <View style={s.suggestionsRow}>
          {suggestions.map(d => (
            <TouchableOpacity
              key={d}
              style={[s.suggestionChip, { backgroundColor: c.surface2, borderColor: c.borderMd }]}
              onPress={() => useSuggestion(d)}
            >
              <Text style={[s.suggestionChipText, { color: c.textMuted }]}>{d}</Text>
              <View style={[s.suggestionPlus, { backgroundColor: c.accent }]}>
                <Text style={s.suggestionPlusText}>+</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error ? (
        <View style={[s.feedbackBox, { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
          <Ionicons name="alert-circle-outline" size={15} color={c.danger} style={{ marginRight: 6 }} />
          <Text style={[s.feedbackText, { color: c.danger }]}>{error}</Text>
        </View>
      ) : null}

      {result && (
        <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[s.domain, { color: c.text }]}>{domain.trim().toLowerCase()}</Text>

          <View style={[
            s.badge,
            result.available
              ? { backgroundColor: c.successDim, borderColor: c.successBorder }
              : { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }
          ]}>
            <View style={[s.dot, { backgroundColor: result.available ? c.success : c.danger }]} />
            <Text style={[s.badgeText, { color: result.available ? c.success : c.danger }]}>
              {result.available ? 'Disponible — aucune alerte nécessaire' : 'Enregistré'}
            </Text>
          </View>

          {result.expiration_date && (
            <View style={s.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={c.textMuted} style={{ marginRight: 6 }} />
              <Text style={[s.info, { color: c.textMuted }]}>
                Expire le {new Date(result.expiration_date).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          {result.registrar && (
            <View style={s.infoRow}>
              <Ionicons name="business-outline" size={14} color={c.textMuted} style={{ marginRight: 6 }} />
              <Text style={[s.info, { color: c.textMuted }]}>{result.registrar}</Text>
            </View>
          )}

          {/* Message abonnement */}
          {subscribing && (
            <View style={s.infoRow}>
              <ActivityIndicator size="small" color={c.success} style={{ marginRight: 6 }} />
              <Text style={[s.info, { color: c.textMuted }]}>Ajout à votre liste...</Text>
            </View>
          )}
          {subscribeMsg ? (
            <View style={[s.feedbackBox, {
              backgroundColor: subscribeMsg.startsWith('✅') ? c.successDim : c.dangerDim,
              borderColor: subscribeMsg.startsWith('✅') ? c.successBorder : c.dangerBorder,
              marginBottom: 0,
            }]}>
              <Text style={[s.feedbackText, {
                color: subscribeMsg.startsWith('✅') ? c.success : c.danger
              }]}>{subscribeMsg}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Modal email */}
      <Modal visible={showEmailModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.modalTitle, { color: c.text }]}>Votre email</Text>
            <Text style={[s.modalSub, { color: c.textMuted }]}>
              Pour être alerté quand <Text style={{ color: c.text, fontWeight: '600' }}>{domain.trim().toLowerCase()}</Text> se libère
            </Text>
            <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: c.inputBorder, borderWidth: 1.5, marginBottom: 12, height: 48 }]}>
              <Ionicons name="mail-outline" size={18} color={c.textDim} style={{ marginLeft: 12, marginRight: 4 }} />
              <TextInput
                style={[s.inputInner, { color: c.text }]}
                placeholder="votre@email.com"
                placeholderTextColor={c.textDim}
                value={emailInput}
                onChangeText={setEmailInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {emailInput.length > 0 && (
                <TouchableOpacity onPress={() => setEmailInput('')} style={s.clearBtn} hitSlop={8}>
                  <Ionicons name="close" size={18} color={c.textDim} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.accent, width: '100%', height: 48, borderRadius: Radius.md }]} onPress={confirmEmail}>
              <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>Activer l'alerte</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmailModal(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: c.textMuted, textAlign: 'center', fontSize: 13 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingTop: 28 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -8, marginBottom: 16 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingVertical: 6, paddingLeft: 12, paddingRight: 6,
  },
  suggestionChipText: { fontSize: 13 },
  suggestionPlus: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  suggestionPlusText: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 48, borderRadius: Radius.md, borderWidth: 1,
  },
  inputInner: { flex: 1, height: '100%', fontSize: 15, paddingHorizontal: 14 },
  clearBtn: { paddingHorizontal: 10 },
  actionBtn: { width: 48, height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  feedbackBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, borderWidth: 1,
    padding: 12, marginBottom: 8,
  },
  feedbackText: { fontSize: 13, flex: 1 },
  card: { marginTop: 8, padding: 20, borderRadius: Radius.lg, borderWidth: 1, gap: 12 },
  domain: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontWeight: '600', fontSize: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  info: { fontSize: 13 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: { width: '100%', borderRadius: 14, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
});