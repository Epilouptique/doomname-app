import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, useColorScheme, ActivityIndicator,
  ScrollView, Modal, Alert, FlatList, useWindowDimensions, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, Radius } from '../constants/theme';
import { syncPushToken, unregisterPushToken } from '../lib/notifications';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';
const COMMON_TLDS = ['com', 'io', 'studio', 'net', 'fr', 'org', 'co', 'app'];
const PAGE_SIZE = 20;

const logoDark = require('../assets/doomname-logo-dark.png');
const logoLight = require('../assets/doomname-logo-light.png');

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Une ligne d'alerte avec actions par swipe.
// Swipe vers la droite (actions à gauche) → supprimer (confirmation).
// Swipe vers la gauche (actions à droite) → activer / désactiver.
function AlertRow({ item, c, hl, onDelete, onToggle }: {
  item: any;
  c: any;
  hl?: 'green' | 'red';
  onDelete: (id: number, domain: string, onDone: () => void) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const ref = useRef<SwipeableMethods>(null);
  const bg = hl === 'green' ? c.successDim : hl === 'red' ? c.dangerDim : c.surface;
  const bd = hl === 'green' ? c.successBorder : hl === 'red' ? c.dangerBorder : c.border;
  const isAvailable = item.last_status === 'available';

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      leftThreshold={70}
      rightThreshold={70}
      renderLeftActions={() => (
        <View style={[s.swipeAction, { backgroundColor: c.danger, alignItems: 'flex-start' }]}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={s.swipeText}>Supprimer</Text>
        </View>
      )}
      renderRightActions={() => (
        <View style={[s.swipeAction, { backgroundColor: c.accent, alignItems: 'flex-end' }]}>
          <Ionicons name={item.active ? 'pause-outline' : 'play-outline'} size={20} color="#fff" />
          <Text style={s.swipeText}>{item.active ? 'Désactiver' : 'Activer'}</Text>
        </View>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') onDelete(item.id, item.domain, () => ref.current?.close());
        else { onToggle(item.id, item.active); ref.current?.close(); }
      }}
    >
      <View style={[s.card, { backgroundColor: bg, borderColor: bd, opacity: item.active ? 1 : 0.55 }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[s.domain, { color: c.text }]}>{item.domain}</Text>
            {isAvailable && (
              <View style={[s.availBadge, { backgroundColor: c.successDim, borderColor: c.successBorder }]}>
                <Text style={[s.availBadgeText, { color: c.success }]}>Disponible</Text>
              </View>
            )}
          </View>
          <Text style={[s.date, { color: c.textDim }]}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: item.active ? c.success : c.textDim }]} />
      </View>
    </ReanimatedSwipeable>
  );
}

export default function HomeScreen() {
  const dark = useColorScheme() === 'dark';
  const c = useColors(dark);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);

  // Compte
  const [userEmail, setUserEmail] = useState('');

  // Recherche / vérification de domaine
  const [domain, setDomain] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState('');

  // Liste des alertes
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'available'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [listSearchOpen, setListSearchOpen] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [highlight, setHighlight] = useState<Record<number, 'green' | 'red'>>({});
  const pendingFlashRef = useRef<{ domain: string; color: 'green' | 'red' } | null>(null);

  // Modale email (abonnement sans compte) et modale connexion
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<'email' | 'sent'>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const params = useLocalSearchParams<{ filter?: string; flash?: string; flashType?: string }>();

  // ─── Chargement initial ──────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('doomname_email').then(saved => {
      if (saved) { setUserEmail(saved); loadSubs(saved); }
    });
  }, []);

  // Magic link ouvert depuis un e-mail (schéma doomname://…?token=)
  useEffect(() => {
    const handleUrl = (url: string) => {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.token) verifyToken(queryParams.token as string);
    };
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    return () => sub.remove();
  }, []);

  // Filtre transmis par le tap sur une notification.
  useEffect(() => {
    if (['all', 'active', 'inactive', 'available'].includes(params.filter as string)) {
      setFilter(params.filter as any);
      setFilterOpen(true);
    }
  }, [params.filter]);

  // Flash ciblé transmis par le tap sur une notification.
  useEffect(() => {
    if (params.flash) {
      pendingFlashRef.current = {
        domain: String(params.flash),
        color: params.flashType === 'domain_taken' ? 'red' : 'green',
      };
      AsyncStorage.getItem('doomname_email').then(mail => { if (mail) loadSubs(mail); });
    }
  }, [params.flash, params.flashType]);

  // Rafraîchit au focus de l'écran.
  useFocusEffect(useCallback(() => { if (userEmail) loadSubs(userEmail); }, [userEmail]));

  // Rafraîchit + flash ciblé si une notification arrive au premier plan.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(notif => {
      const data = notif.request?.content?.data as { domain?: string; type?: string } | undefined;
      if (data?.domain) {
        pendingFlashRef.current = { domain: String(data.domain), color: data.type === 'domain_taken' ? 'red' : 'green' };
      }
      AsyncStorage.getItem('doomname_email').then(mail => { if (mail) loadSubs(mail); });
    });
    return () => sub.remove();
  }, []);

  // ─── Données ───────────────────────────────────────────────────────────────
  const loadSubs = async (mail: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/manage/subscriptions?email=${encodeURIComponent(mail)}`);
      const data = await res.json();
      setSubs(Array.isArray(data) ? data : []);
      await computeHighlights(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les alertes.');
    } finally {
      setLoading(false);
    }
  };

  const computeHighlights = async (data: any[]) => {
    const target = pendingFlashRef.current;
    pendingFlashRef.current = null;
    if (!target) return;
    const sub = data.find((s: any) => s.domain === target.domain);
    if (!sub) return;
    const key = `${sub.id}:${sub.notified_at ? new Date(sub.notified_at).getTime() : 'na'}`;
    let flashed: string[] = [];
    try { flashed = JSON.parse((await AsyncStorage.getItem('doomname_flashed')) || '[]'); } catch { flashed = []; }
    if (flashed.includes(key)) return;
    setHighlight({ [sub.id]: target.color });
    await AsyncStorage.setItem('doomname_flashed', JSON.stringify([...flashed, key].slice(-200)));
    setTimeout(() => setHighlight({}), 5000);
  };

  // ─── Vérification / abonnement ─────────────────────────────────────────────
  const checkDomain = async (override?: string) => {
    const d = (override ?? domain).trim().toLowerCase();
    if (!d) return;
    Keyboard.dismiss();
    inputRef.current?.blur();
    setChecking(true); setResult(null); setError(''); setSubscribeMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(d)}`);
      const data = await res.json();
      setResult(data);
      if (!data.available) {
        if (userEmail) await subscribe(d, userEmail);
        else setShowEmailModal(true);
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setChecking(false);
    }
  };

  const subscribe = async (d: string, email: string) => {
    setSubscribing(true);
    try {
      const res = await fetch(`${API_BASE}/api/manage/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d, email }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribeMsg('✅ Alerte ajoutée à votre liste !');
        await AsyncStorage.setItem('doomname_email', email);
        setUserEmail(email);
        syncPushToken(email);
        if (data.last_status === 'available') {
          pendingFlashRef.current = { domain: d, color: 'green' };
          setFilter('available'); setFilterOpen(true);
        }
        loadSubs(email);
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

  // ─── Connexion (magic link) ────────────────────────────────────────────────
  const requestMagicLink = async () => {
    const e = loginEmail.trim().toLowerCase();
    if (!e) return;
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e }),
      });
      if (res.ok) setLoginStep('sent');
      else setLoginError('Erreur lors de l\'envoi du lien.');
    } catch {
      setLoginError('Impossible de contacter le serveur.');
    } finally {
      setLoginLoading(false);
    }
  };

  const verifyToken = async (tokenOverride?: string) => {
    const t = (tokenOverride ?? loginToken).trim();
    if (!t) return;
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify?token=${t}`);
      const data = await res.json();
      if (data.success) {
        await AsyncStorage.setItem('doomname_email', data.email);
        setUserEmail(data.email);
        setLoginOpen(false); setLoginStep('email'); setLoginEmail(''); setLoginToken('');
        syncPushToken(data.email);
        loadSubs(data.email);
      } else {
        setLoginError('Lien invalide ou expiré.');
      }
    } catch {
      setLoginError('Impossible de vérifier le lien.');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await unregisterPushToken();
    await AsyncStorage.removeItem('doomname_email');
    setUserEmail(''); setSubs([]); setFilter('all'); setFilterOpen(false);
  };

  // ─── Actions sur un domaine ────────────────────────────────────────────────
  const toggleSub = async (id: number, currentActive: boolean) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, active: !currentActive } : s));
    try {
      await fetch(`${API_BASE}/api/manage/subscription/${id}/toggle?email=${encodeURIComponent(userEmail)}`, { method: 'PATCH' });
    } catch {
      setSubs(prev => prev.map(s => s.id === id ? { ...s, active: currentActive } : s));
    }
  };

  const deleteSub = (id: number, dom: string, onDone?: () => void) => {
    Alert.alert('Supprimer', `Supprimer l'alerte pour ${dom} ?`, [
      { text: 'Annuler', style: 'cancel', onPress: onDone },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          setSubs(prev => prev.filter(s => s.id !== id));
          try {
            await fetch(`${API_BASE}/api/manage/subscription/${id}?email=${encodeURIComponent(userEmail)}`, { method: 'DELETE' });
          } catch { if (userEmail) loadSubs(userEmail); }
        },
      },
    ]);
  };

  // ─── Dérivés ───────────────────────────────────────────────────────────────
  const dm = domain.trim().toLowerCase().match(/^([a-z0-9-]+)(?:\.([a-z]{2,}))?$/);
  const suggestions = dm ? COMMON_TLDS.filter(t => t !== dm[2]).map(t => `${dm[1]}.${t}`) : [];

  let filteredSubs =
    filter === 'active' ? subs.filter(s => s.active)
    : filter === 'inactive' ? subs.filter(s => !s.active)
    : filter === 'available' ? subs.filter(s => s.last_status === 'available')
    : subs;
  if (listSearch.trim()) filteredSubs = filteredSubs.filter(s => s.domain.toLowerCase().includes(listSearch.trim().toLowerCase()));
  const pages = chunk(filteredSubs, PAGE_SIZE);

  const connected = !!userEmail;

  const filters: Array<typeof filter> = ['all', 'active', 'inactive', 'available'];
  const filterLabel = (f: string) => f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : f === 'inactive' ? 'Désactivés' : 'Disponible';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View style={s.headerLeft}>
          <Image source={dark ? logoDark : logoLight} style={s.logo} resizeMode="contain" />
          <Text style={[s.brand, { color: c.accent }]}>DoomName</Text>
        </View>
        {connected && (
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => { setListSearchOpen(o => !o); if (listSearchOpen) setListSearch(''); }} hitSlop={8}>
              <Ionicons name="search-outline" size={23} color={listSearchOpen ? c.accent : c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterOpen(o => !o)} hitSlop={8}>
              <Ionicons name="funnel-outline" size={22} color={filterOpen ? c.accent : c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={8}>
              <Ionicons name="settings-outline" size={23} color={c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={24} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Barre de recherche (vérification de domaine) */}
      <View style={s.searchRow}>
        <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: searchFocused ? c.accent : c.inputBorder }]}>
          <TextInput
            ref={inputRef}
            style={[s.inputInner, { color: c.text }]}
            placeholder="exemple.com"
            placeholderTextColor={c.textDim}
            value={domain}
            onChangeText={setDomain}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="none" autoCorrect={false}
            returnKeyType="search" keyboardType="url"
            onSubmitEditing={() => checkDomain()}
          />
          {domain.length > 0 && (
            <TouchableOpacity onPress={() => { setDomain(''); setResult(null); setSubscribeMsg(''); }} style={{ paddingHorizontal: 8 }} hitSlop={8}>
              <Ionicons name="close" size={18} color={c.textDim} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.accent }]} onPress={() => checkDomain()} disabled={checking}>
          {checking ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Corps : suggestions (focus) OU liste / bouton connexion */}
      {searchFocused ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={[s.hint, { color: c.textMuted }]}>Choisissez une extension :</Text>
          <View style={s.suggestionsWrap}>
            {suggestions.map(d => (
              <TouchableOpacity
                key={d}
                style={[s.suggestionChip, { backgroundColor: c.surface2, borderColor: c.borderMd }]}
                onPress={() => { setDomain(d); checkDomain(d); }}
              >
                <Text style={[s.suggestionText, { color: c.textMuted }]}>{d}</Text>
                <View style={[s.suggestionPlus, { backgroundColor: c.accent }]}><Text style={s.suggestionPlusText}>+</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Résultat de vérification */}
          {(result || subscribeMsg || error) && (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              {error ? (
                <View style={[s.feedbackBox, { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
                  <Text style={[s.feedbackText, { color: c.danger }]}>{error}</Text>
                </View>
              ) : null}
              {result && (
                <View style={[s.resultCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[s.domain, { color: c.text }]}>{domain.trim().toLowerCase()}</Text>
                  <View style={[s.badge, result.available
                    ? { backgroundColor: c.successDim, borderColor: c.successBorder }
                    : { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
                    <Text style={[s.badgeText, { color: result.available ? c.success : c.danger }]}>
                      {result.available ? 'Disponible' : 'Enregistré'}
                    </Text>
                  </View>
                  {result.available && !subscribeMsg.startsWith('✅') && !subscribing && (
                    <TouchableOpacity
                      style={[s.watchBtn, { borderColor: c.accent }]}
                      onPress={() => { userEmail ? subscribe(domain.trim().toLowerCase(), userEmail) : setShowEmailModal(true); }}
                    >
                      <Ionicons name="notifications-outline" size={16} color={c.accent} style={{ marginRight: 6 }} />
                      <Text style={[s.watchBtnText, { color: c.accent }]}>Surveiller ce domaine</Text>
                    </TouchableOpacity>
                  )}
                  {subscribing && <ActivityIndicator color={c.success} style={{ marginTop: 8 }} />}
                </View>
              )}
              {subscribeMsg ? (
                <View style={[s.feedbackBox, {
                  backgroundColor: subscribeMsg.startsWith('✅') ? c.successDim : c.dangerDim,
                  borderColor: subscribeMsg.startsWith('✅') ? c.successBorder : c.dangerBorder,
                }]}>
                  <Text style={[s.feedbackText, { color: subscribeMsg.startsWith('✅') ? c.success : c.danger }]}>{subscribeMsg}</Text>
                </View>
              ) : null}
            </View>
          )}

          {connected ? (
            <>
              {filterOpen && (
                <View style={s.filterRow}>
                  {filters.map(f => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFilter(f)}
                      style={[s.filterBtn, { borderColor: filter === f ? c.accent : c.borderMd, backgroundColor: filter === f ? c.accentDim : 'transparent' }]}
                    >
                      <Text style={[s.filterBtnText, { color: filter === f ? c.accent : c.textMuted }]}>{filterLabel(f)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {listSearchOpen && (
                <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                  <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: c.inputBorder }]}>
                    <TextInput
                      style={[s.inputInner, { color: c.text }]}
                      placeholder="Rechercher dans mes alertes…"
                      placeholderTextColor={c.textDim}
                      value={listSearch} onChangeText={setListSearch}
                      autoCapitalize="none" autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              {loading ? (
                <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
              ) : filteredSubs.length === 0 ? (
                <Text style={[s.empty, { color: c.textDim }]}>Aucune alerte pour ce filtre.</Text>
              ) : (
                <FlatList
                  key={filter + listSearch}
                  data={pages}
                  keyExtractor={(_, i) => `page-${i}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: pageItems }) => (
                    <ScrollView style={{ width }} contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
                      {pageItems.map(item => (
                        <AlertRow key={item.id} item={item} c={c} hl={highlight[item.id]} onDelete={deleteSub} onToggle={toggleSub} />
                      ))}
                    </ScrollView>
                  )}
                  ListFooterComponent={null}
                />
              )}
              {pages.length > 1 && (
                <Text style={[s.pageHint, { color: c.textDim }]}>← glissez pour changer de page ({pages.length}) →</Text>
              )}
            </>
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={[s.hint, { color: c.textMuted, textAlign: 'center', marginBottom: 16 }]}>
                Connectez-vous pour retrouver et gérer vos alertes.
              </Text>
              <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={() => { setLoginOpen(true); setLoginStep('email'); }}>
                <Text style={s.loginBtnText}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Modale : email pour abonnement */}
      <Modal visible={showEmailModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.modalTitle, { color: c.text }]}>Votre email</Text>
            <Text style={[s.modalSub, { color: c.textMuted }]}>Pour être alerté sur ce domaine.</Text>
            <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: c.inputBorder, marginBottom: 12 }]}>
              <TextInput
                style={[s.inputInner, { color: c.text }]}
                placeholder="votre@email.com" placeholderTextColor={c.textDim}
                value={emailInput} onChangeText={setEmailInput}
                autoCapitalize="none" keyboardType="email-address"
              />
            </View>
            <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={confirmEmail}>
              <Text style={s.loginBtnText}>Activer l'alerte</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmailModal(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: c.textMuted, textAlign: 'center' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modale : connexion magic link */}
      <Modal visible={loginOpen} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            {loginStep === 'email' ? (
              <>
                <Text style={[s.modalTitle, { color: c.text }]}>Connexion</Text>
                <Text style={[s.modalSub, { color: c.textMuted }]}>Entrez votre email pour recevoir un lien de connexion.</Text>
                <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: c.inputBorder, marginBottom: 12 }]}>
                  <TextInput
                    style={[s.inputInner, { color: c.text }]}
                    placeholder="votre@email.com" placeholderTextColor={c.textDim}
                    value={loginEmail} onChangeText={setLoginEmail}
                    autoCapitalize="none" keyboardType="email-address"
                  />
                </View>
                <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={requestMagicLink} disabled={loginLoading}>
                  {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnText}>Recevoir le lien</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.modalTitle, { color: c.text }]}>Lien envoyé</Text>
                <Text style={[s.modalSub, { color: c.textMuted }]}>Ouvrez le lien reçu par email, ou collez le token ci-dessous.</Text>
                <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: c.inputBorder, marginBottom: 12 }]}>
                  <TextInput
                    style={[s.inputInner, { color: c.text }]}
                    placeholder="Token" placeholderTextColor={c.textDim}
                    value={loginToken} onChangeText={setLoginToken}
                    autoCapitalize="none" autoCorrect={false}
                  />
                </View>
                <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={() => verifyToken()} disabled={loginLoading}>
                  {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnText}>Valider</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLoginStep('email')} style={{ marginTop: 12 }}>
                  <Text style={{ color: c.accent, textAlign: 'center' }}>← Retour</Text>
                </TouchableOpacity>
              </>
            )}
            {loginError ? <Text style={{ color: c.danger, textAlign: 'center', marginTop: 10, fontSize: 13 }}>{loginError}</Text> : null}
            <TouchableOpacity onPress={() => { setLoginOpen(false); setLoginError(''); }} style={{ marginTop: 12 }}>
              <Text style={{ color: c.textMuted, textAlign: 'center' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 34, height: 34 },
  brand: { fontFamily: 'AmazDoom', fontSize: 27, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },

  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: Radius.md, borderWidth: 1.5 },
  inputInner: { flex: 1, height: '100%', fontSize: 15, paddingHorizontal: 14 },
  actionBtn: { width: 48, height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },

  hint: { fontSize: 13, marginBottom: 10 },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingVertical: 7, paddingLeft: 12, paddingRight: 6 },
  suggestionText: { fontSize: 14 },
  suggestionPlus: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  suggestionPlusText: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 15 },

  feedbackBox: { borderRadius: Radius.md, borderWidth: 1, padding: 12, marginBottom: 8 },
  feedbackText: { fontSize: 13 },
  resultCard: { padding: 16, borderRadius: Radius.lg, borderWidth: 1, gap: 10, marginBottom: 8 },
  badge: { flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontWeight: '600', fontSize: 14 },
  watchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: Radius.md, paddingVertical: 9, paddingHorizontal: 14 },
  watchBtnText: { fontWeight: '600', fontSize: 14 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filterBtn: { borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  filterBtnText: { fontSize: 12, fontWeight: '500' },

  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
  domain: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 12, marginTop: 2 },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 12 },
  availBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1 },
  availBadgeText: { fontSize: 10, fontWeight: '600' },

  swipeAction: { justifyContent: 'center', paddingHorizontal: 20, borderRadius: Radius.lg, marginVertical: 0, width: 130, gap: 3 },
  swipeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  pageHint: { textAlign: 'center', fontSize: 11, paddingVertical: 8 },

  loginBtn: { height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', borderRadius: 14, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
});
