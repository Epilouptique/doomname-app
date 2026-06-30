# DoomName — Application Android

Application mobile officielle de [DoomName](https://www.doomname.com), service de surveillance de noms de domaine.

Disponible sur le **Google Play Store** (test interne / test ouvert).

## Fonctionnalités

- **Vérification de disponibilité** d'un domaine avec suggestions dynamiques d'extensions courantes (.com, .io, .studio…) pendant la saisie
- **Mes alertes** : gestion des domaines surveillés (filtres Tous / Actifs / Désactivés, recherche, pagination 20/page), avec ajout direct depuis l'écran d'accueil
- **Connexion par magic link** (pas de mot de passe) — le lien reçu par e-mail ouvre automatiquement l'application via deep link (`doomname://`)
- **Paramètres** : préférences d'alertes (e-mail / période de grâce), accès à la documentation API, CGU/CGV, suppression de compte (RGPD)
- Thème clair/sombre automatique selon le système

## Stack

- [Expo](https://expo.dev) SDK 54 / React Native 0.81.5
- [Expo Router](https://expo.github.io/router) (navigation par fichiers, 3 onglets)
- TypeScript
- `@react-native-async-storage/async-storage` pour la persistance de session
- `@expo/vector-icons` (Ionicons)

## Architecture

```
app/
├── index.tsx      — Vérifier (accueil, saisie de domaine)
├── manage.tsx     — Mes alertes (connexion + gestion)
├── settings.tsx   — Paramètres (alertes, API, CGV, suppression compte)
├── developer.tsx  — Documentation API (accessible depuis Paramètres)
├── cgv.tsx        — CGU/CGV (accessible depuis Paramètres)
└── _layout.tsx    — Navigation (Tabs), splash screen, polices

constants/
└── theme.ts       — Tokens de design (couleurs, rayons) pour les modes clair/sombre
```

## API

L'app consomme l'API du service web hébergé sur Railway :
```
https://domainwatch-production-1943.up.railway.app
```
Le code source du serveur est dans le repo [domainwatch](https://github.com/Epilouptique/domainwatch).

## Lancer en développement

```bash
npm install
npx expo start
# Scanner le QR code avec Expo Go, ou lancer sur un émulateur
```

## Build de production

```bash
# Nécessite un compte Expo et le fichier eas.json configuré
npx eas build --platform android --profile production
```

## Variables de configuration

Aucune variable d'environnement côté app — l'URL de l'API est définie directement dans le code source (`API_BASE` dans chaque écran). Le scheme Deep Link est `doomname` (configuré dans `app.json`).

---

Développé par Hugo Vial-Jaime — Agence [Dahu-Concept](https://dahu-concept.fr)
