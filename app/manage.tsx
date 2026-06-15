import { useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator,
  FlatList, Switch, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColors, Radius } from '../constants/theme';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';

export default function ManageScreen() {
  const dark = useColorScheme() === 'dark';
  const c = useColors(dark);

  const [step, setStep] = useState<'email' | 'sent' | 'manage'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('doomname_email').then(saved => {
      if (saved) {
        setUserEmail(saved);
        setStep('manage');
        loadSubs(saved);
      }
    });
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.token) {
        setToken(queryParams.token as string);
        setStep('sent');
      }
    });

    Linking.getInitialURL().then(url => {
      if (url) {
        const { queryParams } = Linking.parse(url);
        if (queryParams?.token) {
          setToken(queryParams.token as string);
          setStep('sent');
          verifyToken();
        }
      }
    });

    return () => subscription.remove();
  }, []);

  const requestMagicLink = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e })
      });
      if (res.ok) setStep('sent');
      else setError('Erreur lors de l\'envoi du lien.');
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify?token=${t}`);
      const data = await res.json();
      if (data.success) {
        await AsyncStorage.setItem('doomname_email', data.email);
        setUserEmail(data.email);
        setStep('manage');
        loadSubs(data.email);
      } else {
        setError('Lien invalide ou expiré.');
      }
    } catch {
      setError('Impossible de vérifier le lien.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubs = async (mail: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/manage/subscriptions?email=${encodeURIComponent(mail)}`);
      const data = await res.json();
      setSubs(data);
    } catch {
      setError('Impossible de charger les abonnements.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSub = async (id: number, currentActive: boolean) => {
    try {
      await fetch(`${API_BASE}/api/manage/subscription/${id}/toggle?email=${encodeURIComponent(userEmail)}`, {
        method: 'PATCH'
      });
      setSubs(subs.map(s => s.id === id ? { ...s, active: !currentActive } : s));
    } catch {
      setError('Erreur lors de la mise à jour.');
    }
  };

  const deleteSub = async (id: number, domain: string) => {
    Alert.alert('Supprimer', `Supprimer l'alerte pour ${domain} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/api/manage/subscription/${id}?email=${encodeURIComponent(userEmail)}`, {
              method: 'DELETE'
            });
            setSubs(subs.filter(s => s.id !== id));
          } catch {
            setError('Erreur lors de la suppression.');
          }
        }
      }
    ]);
  };

  const addDomain = async () => {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/manage/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, domain: d })
      });
      const data = await res.json();
      if (data.success) {
        setNewDomain('');
        loadSubs(userEmail);
      } else {
        setError(data.error || 'Erreur lors de l\'ajout.');
      }
    } catch {
      setError('Impossible d\'ajouter ce domaine.');
    } finally {
      setAdding(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('doomname_email');
    setUserEmail('');
    setStep('email');
    setSubs([]);
    setEmail('');
    setToken('');
  };

  const inputStyle = [s.input, { backgroundColor: c.surface2, borderColor: c.borderMd, color: c.text }];
  const btnStyle = [s.button, { backgroundColor: c.accent }];

  if (step === 'email') return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={s.container}>
      <Text style={[s.subtitle, { color: c.textMuted }]}>Entrez votre email pour recevoir un lien de connexion</Text>
      <TextInput
        style={inputStyle} placeholder="votre@email.com"
        placeholderTextColor={c.textDim}
        value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address"
      />
      <TouchableOpacity style={btnStyle} onPress={requestMagicLink} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Recevoir le lien</Text>}
      </TouchableOpacity>
      {error ? (
        <View style={[s.errorBox, { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
          <Text style={[s.errorText, { color: c.danger }]}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  if (step === 'sent') return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={s.container}>
      <Text style={[s.subtitle, { color: c.textMuted }]}>
        Un lien a été envoyé à {email}. Copiez le token depuis l'URL du lien et collez-le ici.
      </Text>
      <TextInput
        style={inputStyle} placeholder="Token (depuis l'URL reçue)"
        placeholderTextColor={c.textDim}
        value={token} onChangeText={setToken}
        autoCapitalize="none" autoCorrect={false}
      />
      <TouchableOpacity style={btnStyle} onPress={verifyToken} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Valider</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setStep('email')} style={{ marginTop: 16 }}>
        <Text style={{ color: c.accent, textAlign: 'center' }}>← Retour</Text>
      </TouchableOpacity>
      {error ? (
        <View style={[s.errorBox, { backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
          <Text style={[s.errorText, { color: c.danger }]}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <Text style={[s.userEmail, { color: c.textMuted }]}>{userEmail}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={{ color: c.accent, fontSize: 13 }}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.addRow, { borderBottomColor: c.border }]}>
        <View style={[s.inputWrap, { backgroundColor: c.surface2, borderColor: c.borderMd }]}>
          <TextInput
            style={[s.inputInner, { color: c.text }]}
            placeholder="Ajouter un domaine..."
            placeholderTextColor={c.textDim}
            value={newDomain} onChangeText={setNewDomain}
            autoCapitalize="none" autoCorrect={false}
            returnKeyType="done" onSubmitEditing={addDomain}
          />
          {newDomain.length > 0 && (
            <TouchableOpacity onPress={() => setNewDomain('')} style={s.clearBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color={c.textDim} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[s.addButton, { backgroundColor: c.accent }]} onPress={addDomain} disabled={adding}>
          {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.buttonText}>+</Text>}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={[s.errorBox, { marginHorizontal: 16, marginTop: 8, backgroundColor: c.dangerDim, borderColor: c.dangerBorder }]}>
          <Text style={[s.errorText, { color: c.danger }]}>{error}</Text>
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={c.accent} style={{ marginTop: 32 }} /> : (
        <FlatList
          data={subs}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={[s.empty, { color: c.textDim }]}>Aucune alerte pour le moment</Text>}
          renderItem={({ item }) => (
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.domain, { color: c.text }]}>{item.domain}</Text>
                <Text style={[s.date, { color: c.textDim }]}>
                  {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Switch
                value={item.active}
                onValueChange={() => toggleSub(item.id, item.active)}
                trackColor={{ true: c.accent }}
              />
              <TouchableOpacity onPress={() => deleteSub(item.id, item.domain)} style={{ marginLeft: 12 }}>
                <Text style={{ color: c.danger, fontSize: 18 }}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 32 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  input: {
    height: 48, borderRadius: Radius.md, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, fontSize: 15,
  },
  button: {
    height: 48, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  errorBox: { borderRadius: Radius.md, borderWidth: 1, padding: 12, marginTop: 8 },
  errorText: { fontSize: 13 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  userEmail: { fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 48, borderRadius: Radius.md, borderWidth: 1,
  },
  inputInner: { flex: 1, height: '100%', fontSize: 15, paddingHorizontal: 14 },
  clearBtn: { paddingHorizontal: 10 },
  addButton: {
    width: 48, height: 48, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg,
    borderWidth: 1,
  },
  domain: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
