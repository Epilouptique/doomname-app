import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';

export default function CGVScreen() {
  const dark = useColorScheme() === 'dark';
  const s = styles(dark);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container}>
      <Text style={s.title}>Conditions d'utilisation</Text>
      <Text style={s.subtitle}>CGU / CGV — DoomName · Mise à jour : 14 juin 2026</Text>

      <Article num="Art. 1" title="Identification de l'éditeur" dark={dark}>
        <Text style={s.text}>Le service DoomName est édité et exploité par :</Text>
        <Row label="Nom" val="Hugo Vial-Jaime" dark={dark} />
        <Row label="Statut" val="Auto-entrepreneur (microentreprise)" dark={dark} />
        <Row label="Enseigne" val="Dahu-Concept" dark={dark} />
        <Row label="Siège" val="3c route des Fauvins, Gap, 05000 — France" dark={dark} />
        <Row label="SIRET" val="80861542100043" dark={dark} />
        <Row label="Contact" val="contact@dahu-concept.fr" dark={dark} />
        <Row label="Site" val="dahu-concept.fr" dark={dark} />
        <Text style={[s.text, { marginTop: 8 }]}>Hébergement : Railway Inc. — Walnut, CA, États-Unis.</Text>
      </Article>

      <Article num="Art. 2" title="Objet et champ d'application" dark={dark}>
        <Text style={s.text}>Les présentes CGU/CGV régissent l'accès et l'utilisation du service DoomName, accessible à l'adresse doomname.com.</Text>
        <Text style={s.text}>Toute utilisation du service implique l'acceptation sans réserve des présentes conditions.</Text>
      </Article>

      <Article num="Art. 3" title="Description du service" dark={dark}>
        <Text style={s.text}>DoomName propose les fonctionnalités suivantes :</Text>
        <Text style={s.item}>• Vérification WHOIS en temps réel</Text>
        <Text style={s.item}>• Alertes e-mail lors d'un changement de statut</Text>
        <Text style={s.item}>• Gestion des alertes via magic link</Text>
        <Text style={s.item}>• API publique v1 avec clé (dk_xxx)</Text>
        <Text style={s.item}>• Application PWA installable</Text>
        <Text style={s.text}>Limites : 50 alertes actives, 200 au total par email, 100 requêtes/jour pour l'API.</Text>
        <View style={s.infoBlock}>
          <Text style={s.infoText}>Le service est actuellement gratuit, sans engagement et sans garantie de pérennité à ce niveau tarifaire.</Text>
        </View>
      </Article>

      <Article num="Art. 4" title="Accès au service" dark={dark}>
        <Text style={s.text}>Le service est accessible sans création de compte. L'adresse e-mail fournie lors de l'abonnement constitue le seul identifiant.</Text>
        <Text style={s.text}>L'éditeur se réserve le droit de suspendre l'accès en cas d'utilisation abusive, de maintenance ou de force majeure.</Text>
      </Article>

      <Article num="Art. 5" title="Obligations de l'utilisateur" dark={dark}>
        <Text style={s.text}>L'utilisateur s'engage à utiliser le service conformément à sa destination. Il lui est interdit de :</Text>
        <Text style={s.item}>• Contourner les limites techniques ou mécanismes de sécurité</Text>
        <Text style={s.item}>• Automatiser des requêtes au-delà des quotas sans clé API</Text>
        <Text style={s.item}>• Utiliser le service à des fins illicites</Text>
        <Text style={s.item}>• Revendre les données sans autorisation écrite</Text>
        <Text style={s.item}>• Inscrire des emails de tiers sans consentement</Text>
      </Article>

      <Article num="Art. 6" title="Responsabilité et garanties" dark={dark}>
        <Text style={s.text}>Les données WHOIS sont issues de sources tierces publiques. L'éditeur ne garantit pas leur exactitude ni leur mise à jour en temps réel.</Text>
        <Text style={s.text}>Le service est fourni « en l'état ». L'éditeur ne saurait être tenu responsable d'une indisponibilité, d'un retard dans les alertes ou d'une perte d'opportunité.</Text>
      </Article>

      <Article num="Art. 7" title="Protection des données (RGPD)" dark={dark}>
        <Text style={s.text}>L'éditeur collecte : adresse e-mail (pour les alertes et magic links) et adresses IP (journaux serveur, sécurité uniquement).</Text>
        <Text style={s.text}>Ces données ne sont ni revendues ni transmises à des tiers, sauf sous-traitants techniques (Railway, Resend).</Text>
        <Text style={s.text}>Conformément au RGPD, vous disposez d'un droit d'accès, rectification, effacement et opposition. Contact : dahu.concept@gmail.com</Text>
      </Article>

      <Article num="Art. 8" title="Propriété intellectuelle" dark={dark}>
        <Text style={s.text}>Le code source est publié sur GitHub sous licence libre. La marque, le logo et le nom « DoomName » restent la propriété exclusive de l'éditeur.</Text>
        <Text style={s.text}>La police AmazDooM est utilisée sous licence CC BY-NC 3.0, à titre non commercial.</Text>
      </Article>

      <Article num="Art. 9" title="Modification des conditions" dark={dark}>
        <Text style={s.text}>L'éditeur se réserve le droit de modifier ces conditions à tout moment. La poursuite de l'utilisation du service vaut acceptation.</Text>
      </Article>

      <Article num="Art. 10" title="Droit applicable et litiges" dark={dark}>
        <Text style={s.text}>Les présentes conditions sont régies par le droit français. En cas de litige, les tribunaux compétents sont ceux de Gap (05000).</Text>
        <Text style={s.text}>Médiation européenne disponible sur : ec.europa.eu/consumers/odr</Text>
      </Article>

      <Text style={s.footer}>DoomName v1.0 — Développé par Hugo Vial-Jaime · Agence Dahu-Concept</Text>
    </ScrollView>
  );
}

function Article({ num, title, dark, children }: { num: string; title: string; dark: boolean; children: React.ReactNode }) {
  const s = styles(dark);
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.num}>{num}</Text>
        <Text style={s.articleTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, val, dark }: { label: string; val: string; dark: boolean }) {
  const s = styles(dark);
  return (
    <View style={s.gridRow}>
      <Text style={s.gridLabel}>{label}</Text>
      <Text style={s.gridVal}>{val}</Text>
    </View>
  );
}

const styles = (dark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: dark ? '#0f0f0e' : '#f9f9f8' },
  container: { padding: 16, paddingTop: 32, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: dark ? '#eceae4' : '#1a1a18', marginBottom: 6 },
  subtitle: { fontSize: 12, color: dark ? '#6b6b67' : '#aaa', marginBottom: 24 },
  card: {
    backgroundColor: dark ? '#1a1a18' : '#ffffff',
    borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  num: { fontSize: 11, fontWeight: '600', color: '#d97757', textTransform: 'uppercase', letterSpacing: 0.5 },
  articleTitle: { fontSize: 14, fontWeight: '500', color: dark ? '#eceae4' : '#1a1a18', flex: 1 },
  text: { fontSize: 13, color: dark ? '#8a8880' : '#6b6b67', lineHeight: 20, marginBottom: 8 },
  item: { fontSize: 13, color: dark ? '#8a8880' : '#6b6b67', lineHeight: 22, paddingLeft: 4, marginBottom: 2 },
  infoBlock: {
    backgroundColor: dark ? 'rgba(217,119,87,0.12)' : 'rgba(217,119,87,0.10)',
    borderRadius: 8, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: 'rgba(217,119,87,0.2)',
  },
  infoText: { fontSize: 12, color: dark ? '#8a8880' : '#6b6b67', lineHeight: 18 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  gridLabel: { fontSize: 11, color: dark ? '#4a4a46' : '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, width: 60, paddingTop: 1 },
  gridVal: { fontSize: 13, color: dark ? '#eceae4' : '#1a1a18', flex: 1 },
  footer: { textAlign: 'center', fontSize: 11, color: dark ? '#4a4a46' : '#ccc', marginTop: 16 },
});