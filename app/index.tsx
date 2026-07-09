import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator,
  ScrollView, Modal, FlatList, Keyboard, RefreshControl, InteractionManager,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, Radius } from '../constants/theme';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/lang';
import { syncPushToken, unregisterPushToken } from '../lib/notifications';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

const FILTER_ANIM = { entering: FadeIn.duration(160), exiting: FadeOut.duration(140) };

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';
const COMMON_TLDS = ['com', 'io', 'studio', 'net', 'fr', 'org', 'co', 'app'];
const PAGE_SIZE = 20;

const logoDark = require('../assets/doomname-logo-dark.png');
const logoLight = require('../assets/doomname-logo-light.png');

const keyExtractor = (item: any) => String(item.id);

// ID client Google de type "Web" (audience du jeton). Défini au build via
// GOOGLE_WEB_CLIENT_ID → app.config.js → extra.googleWebClientId.
// On lit plusieurs emplacements possibles selon le canal (expoConfig au runtime,
// manifest2 en OTA) + process.env en dernier recours (dev).
const GOOGLE_WEB_CLIENT_ID: string = (
  (Constants.expoConfig?.extra as any)?.googleWebClientId ||
  ((Constants as any).manifest2?.extra?.expoClient?.extra?.googleWebClientId) ||
  ((Constants as any).manifest?.extra?.googleWebClientId) ||
  process.env.GOOGLE_WEB_CLIENT_ID ||
  ''
);

// Ligne d'alerte avec swipe progressif (Reanimated) :
//  • glissé vers la GAUCHE → activer/désactiver ; vers la DROITE → supprimer.
//  • sous 50% de la largeur : icône seule ; au-dessus : icône + texte.
//  • au relâchement : action si ≥ 50%, sinon retour à l'état initial.
// Mémoïsé pour éviter les re-rendus de toute la liste au moindre changement d'état.
const AlertRow = memo(function AlertRow({ item, c, hl, onDelete, onToggle }: {
  item: any;
  c: any;
  hl?: 'green' | 'red';
  onDelete: (id: number, domain: string) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const { t } = useLang();
  const tx = useSharedValue(0);
  const rowW = useSharedValue(0);
  const bg = hl === 'green' ? c.successDim : hl === 'red' ? c.dangerDim : c.surface;
  const bd = hl === 'green' ? c.successBorder : hl === 'red' ? c.dangerBorder : c.border;
  const isAvailable = item.last_status === 'available';

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-12, 12])
    .onUpdate(e => { tx.value = e.translationX; })
    .onEnd(() => {
      const half = rowW.value * 0.5;
      if (tx.value <= -half) {
        // Glissé à gauche assez loin → toggle, puis retour.
        tx.value = withTiming(0, { duration: 160 });
        runOnJS(onToggle)(item.id, item.active);
      } else if (tx.value >= half) {
        // Glissé à droite assez loin → suppression (sort par la droite).
        tx.value = withTiming(rowW.value, { duration: 160 });
        runOnJS(onDelete)(item.id, item.domain);
      } else {
        tx.value = withTiming(0, { duration: 160 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  // Action gauche (Supprimer) révélée quand on glisse à droite (tx > 0).
  const deleteStyle = useAnimatedStyle(() => ({ opacity: tx.value > 0 ? 1 : 0 }));
  const deleteTextStyle = useAnimatedStyle(() => ({ opacity: tx.value >= rowW.value * 0.5 ? 1 : 0 }));
  // Action droite (Activer/Désactiver) révélée quand on glisse à gauche (tx < 0).
  const toggleStyle = useAnimatedStyle(() => ({ opacity: tx.value < 0 ? 1 : 0 }));
  const toggleTextStyle = useAnimatedStyle(() => ({ opacity: tx.value <= -rowW.value * 0.5 ? 1 : 0 }));

  return (
    <View style={s.rowWrap} onLayout={e => { rowW.value = e.nativeEvent.layout.width; }}>
      {/* Fond action SUPPRIMER (gauche) */}
      <Animated.View style={[StyleSheet.absoluteFill, s.actionLayer, { backgroundColor: c.danger, justifyContent: 'flex-start' }, deleteStyle]}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Animated.Text style={[s.actionText, deleteTextStyle]}>{t('swipe.delete')}</Animated.Text>
      </Animated.View>
      {/* Fond action ACTIVER/DÉSACTIVER (droite) */}
      <Animated.View style={[StyleSheet.absoluteFill, s.actionLayer, { backgroundColor: c.accent, justifyContent: 'flex-end' }, toggleStyle]}>
        <Animated.Text style={[s.actionText, toggleTextStyle]}>{item.active ? t('swipe.disable') : t('swipe.enable')}</Animated.Text>
        <Ionicons name={item.active ? 'pause-outline' : 'play-outline'} size={22} color="#fff" />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[s.card, { backgroundColor: bg, borderColor: bd }, cardStyle]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[s.domain, { color: c.text }]}>{item.domain}</Text>
              {isAvailable && (
                <View style={[s.availBadge, { backgroundColor: c.successDim, borderColor: c.successBorder }]}>
                  <Text style={[s.availBadgeText, { color: c.success }]}>{t('home.available')}</Text>
                </View>
              )}
            </View>
            <Text style={[s.date, { color: c.textDim }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={[s.statusDot, { backgroundColor: item.active ? c.success : c.textDim }]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default function HomeScreen() {
  const { dark } = useTheme();
  const { t, lang } = useLang();
  const c = useColors(dark);
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [addedMain, setAddedMain] = useState(false);      // flash coche verte bouton "+"
  const [addedChip, setAddedChip] = useState<string | null>(null); // flash coche verte sur une extension

  // Liste des alertes
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'available'>('active');
  // État visuel du bouton actif, découplé de `filter` (qui pilote le render lourd
  // de la liste) : mis à jour SYNCHRONEMENT au tap → le bouton passe orange en <16ms,
  // le recalcul de la liste est repoussé après l'interaction (runAfterInteractions).
  const [uiFilter, setUiFilter] = useState<'all' | 'active' | 'inactive' | 'available'>('active');
  const [filterOpen, setFilterOpen] = useState(false);
  const [listSearchOpen, setListSearchOpen] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [highlight, setHighlight] = useState<Record<number, 'green' | 'red'>>({});
  const pendingFlashRef = useRef<{ domain: string; color: 'green' | 'red' } | null>(null);
  const listRef = useRef<FlatList>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE); // scroll infini vertical
  const [filtering, setFiltering] = useState(false);           // overlay bref au changement de filtre
  const listOpacity = useSharedValue(1);

  // Modale email (abonnement sans compte) et modale connexion
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<'email' | 'sent'>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const params = useLocalSearchParams<{ filter?: string; flash?: string; flashType?: string; token?: string }>();
  const processedTokenRef = useRef<string | null>(null);

  // ─── Chargement initial ──────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('doomname_email').then(saved => {
      if (saved) { setUserEmail(saved); loadSubs(saved); }
    });
  }, []);

  // Magic link ouvert depuis un e-mail : le token arrive en paramètre via la
  // route de redirection /manage → /?token=… (schéma doomname://manage?token=).
  useEffect(() => {
    if (params.token && processedTokenRef.current !== params.token) {
      processedTokenRef.current = params.token as string;
      verifyToken(params.token as string);
    }
  }, [params.token]);

  // Filtre transmis par le tap sur une notification.
  useEffect(() => {
    if (['all', 'active', 'inactive', 'available'].includes(params.filter as string)) {
      setVisibleCount(PAGE_SIZE);
      setUiFilter(params.filter as any);
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

  // Fondu doux de la liste pendant le (bref) recalcul de filtre.
  useEffect(() => {
    listOpacity.value = withTiming(filtering ? 0.4 : 1, { duration: 150 });
  }, [filtering]);

  // Filet de sécurité : on retire l'overlay peu après le render (la liste est prête).
  useEffect(() => {
    if (!filtering) return;
    const id = setTimeout(() => setFiltering(false), 220);
    return () => clearTimeout(id);
  }, [filtering]);

  // Changement de filtre — DÉCOUPLAGE feedback / render :
  //  1) setUiFilter(f) : render TRÈS léger (seuls les 4 boutons changent de style)
  //     → le bouton passe orange en <16ms, `filter`/la liste ne bougent pas encore.
  //  2) le travail lourd (setFilter → recompute filteredSubs → montage des lignes
  //     GestureDetector) est repoussé via InteractionManager.runAfterInteractions,
  //     donc APRÈS que le bouton orange + le fondu/spinner sont peints.
  const changeFilter = useCallback((f: 'all' | 'active' | 'inactive' | 'available') => {
    setUiFilter(f);        // instantané : bouton orange
    setFiltering(true);    // instantané : fondu + spinner
    InteractionManager.runAfterInteractions(() => {
      setVisibleCount(PAGE_SIZE);
      setFilter(f);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);
  const listFadeStyle = useAnimatedStyle(() => ({ opacity: listOpacity.value }));

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
      setError(t('home.err_load'));
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
      setError(t('home.err_server'));
    } finally {
      setChecking(false);
    }
  };

  // silent=true : ajout rapide (bouton "+"/suggestion) sans message ni bascule
  // de filtre — le feedback est la coche verte gérée par addDirect.
  const subscribe = async (d: string, email: string, silent = false): Promise<boolean> => {
    if (!silent) setSubscribing(true);
    try {
      const res = await fetch(`${API_BASE}/api/manage/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d, email, lang }),
      });
      const data = await res.json();
      if (data.success) {
        if (!silent) {
          setSubscribeMsg(t('home.added_to_list'));
          if (data.last_status === 'available') {
            pendingFlashRef.current = { domain: d, color: 'green' };
            setUiFilter('available'); setFilter('available'); setFilterOpen(true);
          }
        }
        await AsyncStorage.setItem('doomname_email', email);
        setUserEmail(email);
        syncPushToken(email);
        loadSubs(email);
        return true;
      }
      if (!silent) setSubscribeMsg(data.error || t('home.err_add'));
      return false;
    } catch {
      if (!silent) setSubscribeMsg(t('home.err_add_generic'));
      return false;
    } finally {
      if (!silent) setSubscribing(false);
    }
  };

  const confirmEmail = async () => {
    const e = emailInput.trim().toLowerCase();
    if (!e) return;
    setShowEmailModal(false);
    await subscribe(domain.trim().toLowerCase(), e);
  };

  // Ajout direct (connecté) : abonne silencieusement et affiche une coche verte
  // ~1s (sur le "+" ou l'extension cliquée), sans quitter le mode recherche ni
  // masquer les suggestions. source = 'main' (bouton +) ou le domaine (chip).
  const flashAdded = (source: 'main' | string, dom: string) => {
    if (source === 'main') {
      setAddedMain(true);
      setTimeout(() => setAddedMain(false), 1000);
    } else {
      setAddedChip(dom);
      setTimeout(() => setAddedChip(prev => (prev === dom ? null : prev)), 1000);
    }
  };

  const addDirect = async (d: string, source: 'main' | string) => {
    const dom = d.trim().toLowerCase();
    if (!dom) { inputRef.current?.focus(); return; }
    // Déjà suivi → pas de doublon : simple confirmation visuelle, aucun appel.
    if (subbedSet.has(dom)) { flashAdded(source, dom); return; }
    const ok = await subscribe(dom, userEmail, true);
    if (ok) flashAdded(source, dom);
  };

  // ─── Connexion ─────────────────────────────────────────────────────────────
  // Finalisation commune à TOUS les canaux (magic link, Google, GitHub) :
  // l'email vérifié devient l'identité locale, exactement comme le magic link.
  const completeLogin = async (email: string) => {
    await AsyncStorage.setItem('doomname_email', email);
    setUserEmail(email);
    setLoginOpen(false); setLoginStep('email'); setLoginEmail(''); setLoginToken(''); setLoginError('');
    syncPushToken(email);
    loadSubs(email);
  };

  // Google Sign-In : configuré une fois au montage (compte Google du téléphone).
  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      console.warn(
        '[Google Sign-In] webClientId INTROUVABLE au runtime → bouton masqué. ' +
        'Vérifie que la variable EAS GOOGLE_WEB_CLIENT_ID (type plaintext, pas secret) ' +
        'est bien définie pour ce profil de build et exposée via app.config.js (extra.googleWebClientId). ' +
        'extra reçu = ' + JSON.stringify(Constants.expoConfig?.extra ?? null)
      );
      return;
    }
    try {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      console.log('[Google Sign-In] configuré OK avec webClientId =', GOOGLE_WEB_CLIENT_ID);
    } catch (e: any) {
      console.warn('[Google Sign-In] échec de GoogleSignin.configure():', e?.message || e);
    }
  }, []);

  const loginWithGoogle = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) { setLoginError(t('login.err_server')); return; }
    setLoginError(''); setLoginLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const info = await GoogleSignin.signIn();
      const idToken = (info as any)?.data?.idToken ?? (info as any)?.idToken;
      if (!idToken) throw new Error('no-id-token');
      const res  = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.success) await completeLogin(data.email);
      else setLoginError(t('login.err_invalid'));
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED || e?.code === statusCodes.IN_PROGRESS) { /* silencieux */ }
      else setLoginError(t('login.err_server'));
    } finally {
      setLoginLoading(false);
    }
  };

  // GitHub : flux web (le secret reste côté serveur). Le backend termine en
  // redirigeant vers doomname://auth?token=… (jeton éphémère) que l'on vérifie
  // via /api/auth/verify — exactement comme un magic link.
  const loginWithGitHub = async () => {
    setLoginError(''); setLoginLoading(true);
    try {
      // GitHub via l'origine web (www.doomname.com) : une seule URL de callback à
      // enregistrer côté GitHub, quel que soit le canal. La DB est partagée avec
      // le backend Railway, donc le jeton du deep link reste vérifiable via verify.
      const result = await WebBrowser.openAuthSessionAsync('https://www.doomname.com/api/auth/github?platform=app', 'doomname://auth');
      if (result.type === 'success' && result.url) {
        const m = result.url.match(/[?&]token=([^&]+)/);
        const tok = m ? decodeURIComponent(m[1]) : '';
        if (tok) { await verifyToken(tok); return; }
      }
      if (result.type !== 'cancel' && result.type !== 'dismiss') setLoginError(t('login.err_server'));
    } catch {
      setLoginError(t('login.err_server'));
    } finally {
      setLoginLoading(false);
    }
  };

  // ─── Connexion (magic link) ────────────────────────────────────────────────
  const requestMagicLink = async () => {
    const e = loginEmail.trim().toLowerCase();
    if (!e) return;
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, lang }),
      });
      if (res.ok) setLoginStep('sent');
      else setLoginError(t('login.err_send'));
    } catch {
      setLoginError(t('login.err_server'));
    } finally {
      setLoginLoading(false);
    }
  };

  const verifyToken = async (tokenOverride?: string) => {
    const tok = (tokenOverride ?? loginToken).trim();
    if (!tok) return;
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify?token=${tok}`);
      const data = await res.json();
      if (data.success) await completeLogin(data.email);
      else setLoginError(t('login.err_invalid'));
    } catch {
      setLoginError(t('login.err_verify'));
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await unregisterPushToken();
    await AsyncStorage.removeItem('doomname_email');
    setUserEmail(''); setSubs([]); setUiFilter('active'); setFilter('active'); setFilterOpen(false);
  };

  // ─── Actions sur un domaine (mémoïsées → pas de re-render des lignes) ────────
  const toggleSub = useCallback(async (id: number, currentActive: boolean) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, active: !currentActive } : s));
    try {
      await fetch(`${API_BASE}/api/manage/subscription/${id}/toggle?email=${encodeURIComponent(userEmail)}`, { method: 'PATCH' });
    } catch {
      setSubs(prev => prev.map(s => s.id === id ? { ...s, active: currentActive } : s));
    }
  }, [userEmail]);

  // Suppression directe, sans confirmation (le swipe ≥ 50% vaut validation).
  const deleteSub = useCallback(async (id: number) => {
    setSubs(prev => prev.filter(s => s.id !== id));
    try {
      await fetch(`${API_BASE}/api/manage/subscription/${id}?email=${encodeURIComponent(userEmail)}`, { method: 'DELETE' });
    } catch { if (userEmail) loadSubs(userEmail); }
  }, [userEmail]);

  // Ouvre l'un des blocs (recherche liste / filtre) en fermant l'autre.
  // L'animation d'entrée/sortie est portée par Reanimated (FILTER_ANIM).
  // Fermer la recherche vide son contenu (la liste complète réapparaît).
  const toggleListSearch = useCallback(() => {
    setListSearchOpen(o => { if (!o) setFilterOpen(false); else setListSearch(''); return !o; });
  }, []);
  const toggleFilter = useCallback(() => {
    setFilterOpen(o => { if (!o) setListSearchOpen(false); return !o; });
  }, []);

  // ─── Dérivés ───────────────────────────────────────────────────────────────
  const dm = domain.trim().toLowerCase().match(/^([a-z0-9-]+)(?:\.([a-z]{2,}))?$/);
  const suggestions = dm ? COMMON_TLDS.filter(t => t !== dm[2]).map(t => `${dm[1]}.${t}`) : [];

  const filteredSubs = useMemo(() => {
    let list =
      filter === 'active' ? subs.filter(s => s.active)
      : filter === 'inactive' ? subs.filter(s => !s.active)
      : filter === 'available' ? subs.filter(s => s.last_status === 'available')
      : subs;
    const q = listSearch.trim().toLowerCase();
    if (q) list = list.filter(s => s.domain.toLowerCase().includes(q));
    return list;
  }, [subs, filter, listSearch]);

  // Fenêtre affichée (scroll infini vertical) — pas de pagination horizontale.
  const visibleSubs = useMemo(() => filteredSubs.slice(0, visibleCount), [filteredSubs, visibleCount]);
  const canLoadMore = visibleCount < filteredSubs.length;
  const loadMore = useCallback(() => {
    setVisibleCount(v => (v < filteredSubs.length ? Math.min(v + PAGE_SIZE, filteredSubs.length) : v));
  }, [filteredSubs.length]);

  // Domaines déjà suivis (pour désactiver les doublons dans les suggestions / "+").
  const subbedSet = useMemo(() => new Set(subs.map(s => String(s.domain).toLowerCase())), [subs]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <AlertRow item={item} c={c} hl={highlight[item.id]} onDelete={deleteSub} onToggle={toggleSub} />
  ), [c, highlight, deleteSub, toggleSub]);

  const connected = !!userEmail;

  const filters: Array<typeof filter> = ['active', 'inactive', 'available', 'all'];
  const filterLabel = (f: string) => t(`filters.${f}`);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View style={s.headerLeft}>
          <Image source={dark ? logoDark : logoLight} style={s.logo} resizeMode="contain" />
          <Text style={[s.brand, { color: c.accent }]}>DoomName</Text>
        </View>
        <View style={s.headerRight}>
          {connected && (
            <>
              <TouchableOpacity onPress={toggleListSearch} hitSlop={8}>
                <Ionicons name="search-outline" size={23} color={listSearchOpen ? c.accent : c.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleFilter} hitSlop={8}>
                <Ionicons name="funnel-outline" size={22} color={filterOpen ? c.accent : c.textMuted} />
              </TouchableOpacity>
            </>
          )}
          {/* Paramètres visible même déconnecté. */}
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={23} color={c.textMuted} />
          </TouchableOpacity>
          {connected ? (
            <TouchableOpacity onPress={logout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={24} color={c.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setLoginOpen(true); setLoginStep('email'); }} hitSlop={8}>
              <Ionicons name="log-in-outline" size={24} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Barre de recherche (vérification de domaine) */}
      <View style={s.searchRow}>
        <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: searchFocused ? c.accent : c.inputBorder }]}>
          <TextInput
            ref={inputRef}
            style={[s.inputInner, { color: c.text }]}
            placeholder={t('home.search_placeholder')}
            placeholderTextColor={c.textDim}
            value={domain}
            onChangeText={setDomain}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="none" autoCorrect={false}
            returnKeyType={connected ? 'done' : 'search'} keyboardType="url"
            onSubmitEditing={() => connected ? addDirect(domain, 'main') : checkDomain()}
          />
          {domain.length > 0 && (
            <TouchableOpacity onPress={() => { setDomain(''); setResult(null); setSubscribeMsg(''); }} style={{ paddingHorizontal: 8 }} hitSlop={8}>
              <Ionicons name="close" size={18} color={c.textDim} />
            </TouchableOpacity>
          )}
        </View>
        {(() => {
          const mainSubbed = connected && !!domain.trim() && subbedSet.has(domain.trim().toLowerCase());
          const mainDone = addedMain || mainSubbed;
          return (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: mainDone ? c.success : c.accent }]}
              onPress={() => connected ? addDirect(domain, 'main') : checkDomain()}
              disabled={checking || subscribing || mainSubbed}
            >
              {(checking || subscribing)
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name={mainDone ? 'checkmark' : (connected ? 'add' : 'search')} size={connected ? 26 : 20} color="#fff" />}
            </TouchableOpacity>
          );
        })()}
      </View>

      {/* Corps : suggestions (focus) OU liste / bouton connexion */}
      {searchFocused ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {subscribeMsg ? (
            <View style={[s.feedbackBox, {
              backgroundColor: subscribeMsg.startsWith('✅') ? c.successDim : c.dangerDim,
              borderColor: subscribeMsg.startsWith('✅') ? c.successBorder : c.dangerBorder,
            }]}>
              <Text style={[s.feedbackText, { color: subscribeMsg.startsWith('✅') ? c.success : c.danger }]}>{subscribeMsg}</Text>
            </View>
          ) : null}
          <View style={s.suggestionsWrap}>
            {suggestions.map(d => {
              const subbed = connected && subbedSet.has(d);           // déjà dans les alertes
              const done = subbed || addedChip === d;                 // coche verte
              return (
                <TouchableOpacity
                  key={d}
                  disabled={subbed}
                  style={[s.suggestionChip, {
                    backgroundColor: done ? c.successDim : c.surface2,
                    borderColor: done ? c.successBorder : c.borderMd,
                    opacity: subbed ? 0.75 : 1,
                  }]}
                  onPress={() => { connected ? addDirect(d, d) : (setDomain(d), checkDomain(d)); }}
                >
                  <Text style={[s.suggestionText, { color: done ? c.success : c.textMuted }]}>
                    {d}
                  </Text>
                  <View style={[s.suggestionPlus, { backgroundColor: done ? c.success : c.accent }]}>
                    {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={s.suggestionPlusText}>+</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
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
                      {result.available ? t('home.available') : t('home.registered')}
                    </Text>
                  </View>
                  {result.available && !subscribeMsg.startsWith('✅') && !subscribing && (
                    <TouchableOpacity
                      style={[s.watchBtn, { borderColor: c.accent }]}
                      onPress={() => { userEmail ? subscribe(domain.trim().toLowerCase(), userEmail) : setShowEmailModal(true); }}
                    >
                      <Ionicons name="notifications-outline" size={16} color={c.accent} style={{ marginRight: 6 }} />
                      <Text style={[s.watchBtnText, { color: c.accent }]}>{t('home.watch_domain')}</Text>
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
              {/* Blocs filtre / recherche : même hauteur (s.subBar) → aucun saut. */}
              {filterOpen && (
                <Animated.View {...FILTER_ANIM} style={s.subBar}>
                  <View style={s.filterRow}>
                    {filters.map(f => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => changeFilter(f)}
                        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                        style={[s.filterBtn, { borderColor: uiFilter === f ? c.accent : c.borderMd, backgroundColor: uiFilter === f ? c.accentDim : 'transparent' }]}
                      >
                        <Text style={[s.filterBtnText, { color: uiFilter === f ? c.accent : c.textMuted }]}>{filterLabel(f)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              )}
              {listSearchOpen && (
                <Animated.View {...FILTER_ANIM} style={s.subBar}>
                  <View style={[s.inputWrapFull, { backgroundColor: c.surface2, borderColor: c.inputBorder }]}>
                    <TextInput
                      style={[s.inputInner, { color: c.text }]}
                      placeholder={t('home.list_search_placeholder')}
                      placeholderTextColor={c.textDim}
                      value={listSearch} onChangeText={(txt) => { setVisibleCount(PAGE_SIZE); setListSearch(txt); }}
                      autoCapitalize="none" autoCorrect={false} autoFocus
                    />
                    {listSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setListSearch('')} style={{ paddingHorizontal: 10 }} hitSlop={8}>
                        <Ionicons name="close" size={18} color={c.textDim} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              )}

              {loading && filteredSubs.length === 0 ? (
                <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
              ) : (
                <View style={{ flex: 1 }}>
                  <Animated.View style={[{ flex: 1 }, listFadeStyle]}>
                    <FlatList
                      ref={listRef}
                      style={{ flex: 1 }}
                      data={visibleSubs}
                      keyExtractor={keyExtractor}
                      renderItem={renderItem}
                      contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
                      keyboardShouldPersistTaps="handled"
                      onEndReached={loadMore}
                      onEndReachedThreshold={0.5}
                      removeClippedSubviews
                      initialNumToRender={10}
                      maxToRenderPerBatch={10}
                      windowSize={7}
                      updateCellsBatchingPeriod={50}
                      onContentSizeChange={() => { if (filtering) setFiltering(false); }}
                      refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={() => userEmail && loadSubs(userEmail)} tintColor={c.accent} colors={[c.accent]} />
                      }
                      ListEmptyComponent={<Text style={[s.empty, { color: c.textDim }]}>{t('home.empty')}</Text>}
                      ListFooterComponent={canLoadMore ? <ActivityIndicator color={c.accent} style={{ marginVertical: 16 }} /> : null}
                    />
                  </Animated.View>
                  {filtering && (
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                      <ActivityIndicator color={c.accent} />
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={[s.hint, { color: c.textMuted, textAlign: 'center', marginBottom: 16 }]}>
                {t('home.login_hint')}
              </Text>
              <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={() => { setLoginOpen(true); setLoginStep('email'); }}>
                <Text style={s.loginBtnText}>{t('home.login_cta')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Modale : email pour abonnement */}
      <Modal visible={showEmailModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[s.modalTitle, { color: c.text }]}>{t('emailModal.title')}</Text>
            <Text style={[s.modalSub, { color: c.textMuted }]}>{t('emailModal.subtitle')}</Text>
            <View style={[s.inputWrapFull, { backgroundColor: c.surface2, borderColor: c.inputBorder, marginBottom: 12 }]}>
              <TextInput
                style={[s.inputInner, { color: c.text }]}
                placeholder={t('common.email_placeholder')} placeholderTextColor={c.textDim}
                value={emailInput} onChangeText={setEmailInput}
                autoCapitalize="none" keyboardType="email-address"
              />
            </View>
            <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={confirmEmail}>
              <Text style={s.loginBtnText}>{t('emailModal.activate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmailModal(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: c.textMuted, textAlign: 'center' }}>{t('common.cancel')}</Text>
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
                <Text style={[s.modalTitle, { color: c.text }]}>{t('login.title')}</Text>
                <Text style={[s.modalSub, { color: c.textMuted }]}>{t('login.subtitle')}</Text>
                {GOOGLE_WEB_CLIENT_ID ? (
                  <TouchableOpacity onPress={loginWithGoogle} disabled={loginLoading}
                    style={[s.oauthBtn, { borderColor: c.borderMd, backgroundColor: c.surface2 }]}>
                    <Ionicons name="logo-google" size={18} color="#DB4437" />
                    <Text style={[s.oauthBtnText, { color: c.text }]}>{t('login.continue_google')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={loginWithGitHub} disabled={loginLoading}
                  style={[s.oauthBtn, { borderColor: c.borderMd, backgroundColor: c.surface2 }]}>
                  <Ionicons name="logo-github" size={18} color={c.text} />
                  <Text style={[s.oauthBtnText, { color: c.text }]}>{t('login.continue_github')}</Text>
                </TouchableOpacity>
                <View style={s.oauthSep}>
                  <View style={[s.oauthSepLine, { backgroundColor: c.borderMd }]} />
                  <Text style={{ color: c.textDim, fontSize: 12, marginHorizontal: 10, textTransform: 'uppercase' }}>{t('login.or')}</Text>
                  <View style={[s.oauthSepLine, { backgroundColor: c.borderMd }]} />
                </View>
                <View style={[s.inputWrapFull, { backgroundColor: c.surface2, borderColor: c.inputBorder, marginBottom: 12 }]}>
                  <TextInput
                    style={[s.inputInner, { color: c.text }]}
                    placeholder={t('common.email_placeholder')} placeholderTextColor={c.textDim}
                    value={loginEmail} onChangeText={setLoginEmail}
                    autoCapitalize="none" keyboardType="email-address"
                  />
                </View>
                <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={requestMagicLink} disabled={loginLoading}>
                  {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnText}>{t('login.send_link')}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.modalTitle, { color: c.text }]}>{t('login.sent_title')}</Text>
                <Text style={[s.modalSub, { color: c.textMuted }]}>{t('login.sent_subtitle')}</Text>
                <View style={[s.inputWrapFull, { backgroundColor: c.surface2, borderColor: c.inputBorder, marginBottom: 12 }]}>
                  <TextInput
                    style={[s.inputInner, { color: c.text }]}
                    placeholder={t('login.token_placeholder')} placeholderTextColor={c.textDim}
                    value={loginToken} onChangeText={setLoginToken}
                    autoCapitalize="none" autoCorrect={false}
                  />
                </View>
                <TouchableOpacity style={[s.loginBtn, { backgroundColor: c.accent }]} onPress={() => verifyToken()} disabled={loginLoading}>
                  {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnText}>{t('login.validate')}</Text>}
                </TouchableOpacity>
              </>
            )}
            {loginError ? <Text style={{ color: c.danger, textAlign: 'center', marginTop: 10, fontSize: 13 }}>{loginError}</Text> : null}
            <TouchableOpacity onPress={() => { setLoginOpen(false); setLoginError(''); }} style={{ marginTop: 12 }}>
              <Text style={{ color: c.textMuted, textAlign: 'center' }}>{t('common.close')}</Text>
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
  // Variante hauteur fixe pour les parents en colonne (modales, recherche liste) :
  // sans flex, le champ garde bien sa hauteur.
  inputWrapFull: { width: '100%', flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: Radius.md, borderWidth: 1.5 },
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

  // Hauteur identique pour les blocs filtre et recherche (aucun saut de layout).
  subBar: { height: 66, justifyContent: 'center', paddingHorizontal: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterBtn: { borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  filterBtnText: { fontSize: 12, fontWeight: '500' },

  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
  domain: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 12, marginTop: 2 },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 12 },
  availBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1 },
  availBadgeText: { fontSize: 10, fontWeight: '600' },

  rowWrap: { borderRadius: Radius.lg, overflow: 'hidden' },
  actionLayer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, borderRadius: Radius.lg },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },

  loginBtn: { height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, height: 48, borderRadius: Radius.md, borderWidth: 1, marginBottom: 10 },
  oauthBtnText: { fontWeight: '600', fontSize: 15 },
  oauthSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  oauthSepLine: { flex: 1, height: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', borderRadius: 14, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
});
