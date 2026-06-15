import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator,
  FlatList, Switch, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://domainwatch-production-1943.up.railway.app';

export default function ManageScreen() {
  const dark = useColorScheme() === 'dark';
  const s = styles(dark);

  const [step, setStep] = useState<'email' | 'sent' | 'manage'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);

  // Vérifie si une session est déjà sauvegardée
  useEffect(() => {
    AsyncStorage.getItem('doomname_email').then(saved => {
      if (saved) {
        setUserEmail(saved);
        setStep('manage');
        loadSubs(saved);
      }
    });
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

  // ── Étape 1 : saisie email ──
  if (step === 'email') return (
    <ScrollView style={s.screen} contentContainerStyle={s.container}>
      <Text style={s.title}>🔑 Mes alertes</Text>
      <Text style={s.subtitle}>Entrez votre email pour recevoir un lien de connexion</Text>
      <TextInput
        style={s.input} placeholder="votre@email.com"
        placeholderTextColor={dark ? '#6b6b67' : '#aaa'}
        value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address"
      />
      <TouchableOpacity style={s.button} onPress={requestMagicLink} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Recevoir le lien</Text>}
      </TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </ScrollView>
  );

  // ── Étape 2 : lien envoyé, saisie token ──
  if (step === 'sent') return (
    <ScrollView style={s.screen} contentContainerStyle={s.container}>
      <Text style={s.title}>📧 Vérifiez vos emails</Text>
      <Text style={s.subtitle}>Un lien a été envoyé à {email}. Copiez le token depuis l'URL du lien et collez-le ici.</Text>
      <TextInput
        style={s.input} placeholder="Token (depuis l'URL reçue)"
        placeholderTextColor={dark ? '#6b6b67' : '#aaa'}
        value={token} onChangeText={setToken}
        autoCapitalize="none" autoCorrect={false}
      />
      <TouchableOpacity style={s.button} onPress={verifyToken} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Valider</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setStep('email')} style={{ marginTop: 16 }}>
        <Text style={{ color: '#d97757', textAlign: 'center' }}>← Retour</Text>
      </TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </ScrollView>
  );

  // ── Étape 3 : liste des abonnements ──
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.userEmail}>{userEmail}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={{ color: '#d97757', fontSize: 13 }}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Ajout domaine */}
      <View style={s.addRow}>
        <TextInput
          style={[s.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Ajouter un domaine..."
          placeholderTextColor={dark ? '#6b6b67' : '#aaa'}
          value={newDomain} onChangeText={setNewDomain}
          autoCapitalize="none" autoCorrect={false}
        />
        <TouchableOpacity style={s.addButton} onPress={addDomain} disabled={adding}>
          {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.buttonText}>+</Text>}
        </TouchableOpacity>
      </View>

      {error ? <Text style={[s.error, { marginHorizontal: 16 }]}>{error}</Text> : null}

      {loading ? <ActivityIndicator color="#d97757" style={{ marginTop: 32 }} /> : (
        <FlatList
          data={subs}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={s.empty}>Aucune alerte pour le moment</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.domain}>{item.domain}</Text>
                <Text style={s.date}>
                  {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Switch
                value={item.active}
                onValueChange={() => toggleSub(item.id, item.active)}
                trackColor={{ true: '#d97757' }}
              />
              <TouchableOpacity onPress={() => deleteSub(item.id, item.domain)} style={{ marginLeft: 12 }}>
                <Text style={{ color: '#dc2626', fontSize: 18 }}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = (dark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: dark ? '#0f0f0e' : '#f9f9f8' },
  container: { padding: 24, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: '700', color: dark ? '#eceae4' : '#1a1a18', marginBottom: 8 },
  subtitle: { fontSize: 14, color: dark ? '#8a8880' : '#6b6b67', marginBottom: 24 },
  input: {
    height: 48, borderRadius: 10, paddingHorizontal: 14, marginBottom: 12,
    backgroundColor: dark ? '#1e1e1c' : '#ffffff',
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: dark ? '#eceae4' : '#1a1a18', fontSize: 15,
  },
  button: {
    height: 48, borderRadius: 10, backgroundColor: '#d97757',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#dc2626', marginTop: 8, textAlign: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
    borderBottomColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
  },
  userEmail: { fontSize: 13, color: dark ? '#8a8880' : '#6b6b67' },
  addRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  addButton: {
    width: 48, height: 48, borderRadius: 10, backgroundColor: '#d97757',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12,
    backgroundColor: dark ? '#1e1e1c' : '#ffffff',
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
  },
  domain: { fontSize: 15, fontWeight: '600', color: dark ? '#eceae4' : '#1a1a18' },
  date: { fontSize: 12, color: dark ? '#6b6b67' : '#aaa', marginTop: 2 },
  empty: { textAlign: 'center', color: dark ? '#6b6b67' : '#aaa', marginTop: 40, fontSize: 14 },
});