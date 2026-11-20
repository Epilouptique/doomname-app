# Variant F-Droid

DoomName a un variant de build réservé à F-Droid, activé par la variable
d'environnement `APP_VARIANT=fdroid`. Il retire tout ce qui dépend de Google
Play Services / Firebase (Connexion Google, notifications push), conformément
à la politique d'inclusion F-Droid : Firebase et GMS ne sont pas acceptés,
sauf à fournir un variant qui s'en passe.

L'authentification par lien magique (e-mail) et par GitHub, ainsi que les
alertes par e-mail — la fonctionnalité principale du produit — restent
pleinement actives et identiques au build Play Store.

## Ce qui change

| | Play Store (par défaut) | F-Droid (`APP_VARIANT=fdroid`) |
|---|---|---|
| Connexion Google | Active | Masquée (stub, aucune lib Google compilée) |
| Notifications push | Actives (Firebase/FCM) | Désactivées (pas de dépendance Firebase compilée) |
| Connexion lien magique / GitHub | Active | Active |
| Alertes par e-mail | Actives | Actives |
| `versionCode` | Géré par EAS (`autoIncrement`) | Fixe, incrémenté à la main (voir `app.config.js`) |

## Comment ça marche techniquement

- `app.config.js` : sur `APP_VARIANT=fdroid`, les plugins Expo
  `@react-native-google-signin/google-signin` et `expo-notifications` sont
  retirés de la config, et `android.googleServicesFile` n'est pas défini
  (donc le plugin Gradle `com.google.gms.google-services` n'est jamais
  appliqué).
- `metro.config.js` : redirige, uniquement sur ce variant, les imports de ces
  deux paquets vers des stubs JS no-op dans `fdroid-stubs/`. Nécessaire car le
  vrai code de ces paquets plante au chargement (`TurboModuleRegistry.
  getEnforcing(...)`) si le module natif n'est pas lié.
- `scripts/fdroid-patch-autolinking.js` : à exécuter avant `expo prebuild`
  pour ce variant. Ajoute `expo.autolinking.android.exclude` dans
  `package.json` (temporairement — ne jamais committer ce changement) pour
  que les bibliothèques Android de ces deux paquets ne soient pas compilées
  dans l'APK.

## Build local (vérification)

```bash
npm ci
node scripts/fdroid-patch-autolinking.js   # ne pas committer le package.json modifié
APP_VARIANT=fdroid npx expo prebuild --platform android --no-install
cd android && ./gradlew :app:assembleRelease
git checkout -- package.json              # annule le patch, après le build
```

Vérifié dans cette session (sandbox sans accès réseau à Maven/Google, donc
sans compilation Gradle complète possible ici) :
- `expo prebuild` réussit, le projet Android généré ne contient **aucune**
  trace de Google/Firebase (`grep` vide sur google-services, play-services,
  firebase dans tout `android/`).
- `expo export` (bundle JS complet, 1647 modules) réussit sans erreur, et le
  bundle compilé contient bien le code des stubs (vérifié par recherche de
  chaînes), pas celui des vrais modules natifs.
- La compilation Gradle elle-même (téléchargement des dépendances Maven/
  Google) n'a pas pu être vérifiée ici faute d'accès réseau sortant vers
  `dl.google.com` / le Gradle Plugin Portal — ce n'est pas une limite du
  projet mais du bac à sable de cette session. Le serveur de build F-Droid,
  lui, a un accès réseau complet à ces dépôts.

## Reste à faire pour publier sur F-Droid

1. **Pousser le tag `v1.1.0`** (créé localement dans cette session, mais le
   push du tag a été refusé — 403 — par les permissions de l'accès GitHub de
   cette session ; celui des branches fonctionne, celui des tags non) :
   ```bash
   git tag -a v1.1.0 -m "DoomName 1.1.0 — première release F-Droid"
   git push origin v1.1.0
   ```
2. **Captures d'écran** (recommandées, pas strictement obligatoires) : à
   ajouter dans `fastlane/metadata/android/en-US/images/` (`icon.png`,
   `phoneScreenshots/1.png`, `2.png`...).
3. **Soumission** : F-Droid se gère via un compte GitLab (gratuit) que je ne
   peux pas créer à ta place. Deux façons de soumettre :
   - **Merge request directe** (préférée, car `fastlane/metadata/` est déjà
     en place dans ce dépôt) : fork
     `https://gitlab.com/fdroid/fdroiddata`, créer
     `metadata/fr.dahuconcept.doomname.yml` avec le contenu ci-dessous, et
     ouvrir une MR.
   - **Demande d'inclusion (RFP)** : ouvrir une issue sur
     `https://gitlab.com/fdroid/rfp/-/issues` avec les mêmes informations,
     si tu préfères laisser l'équipe F-Droid créer les métadonnées.

### Métadonnées prêtes à coller (`metadata/fr.dahuconcept.doomname.yml`)

```yaml
Categories:
  - System
  - Internet
License: MIT
AuthorName: Hugo Vial-Jaime
AuthorEmail: contact@dahu-concept.fr
WebSite: https://www.doomname.com
SourceCode: https://github.com/Epilouptique/doomname-app
IssueTracker: https://github.com/Epilouptique/doomname-app/issues
Changelog: https://github.com/Epilouptique/doomname-app/blob/master/fastlane/metadata/android/en-US/changelogs

AutoName: DoomName
Summary: Free domain name availability monitoring, with e-mail alerts
Description: |
    DoomName is a free, open-source companion app for doomname.com, a domain
    name availability monitoring service.

    Enter a domain name, and DoomName checks its availability in real time
    against the registry (WHOIS). If it's already taken, add a watch:
    DoomName checks it periodically and e-mails you the moment it becomes
    free again.

    This F-Droid build does not include Google Sign-In or push
    notifications, both of which require proprietary Google Play Services /
    Firebase components. E-mail alerts, the app's main feature, are
    unaffected. Sign in with a magic link (e-mail) or a GitHub account
    instead.

RepoType: git
Repo: https://github.com/Epilouptique/doomname-app

Builds:
  - versionName: '1.1.0'
    versionCode: 1
    commit: v1.1.0
    subdir: .
    sudo:
      - wget -q https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz
      - tar xf node-v22.14.0-linux-x64.tar.xz
      - cp -a node-v22.14.0-linux-x64/. /usr/local/
      - npm install -g yarn
    init:
      - npm ci
      - node scripts/fdroid-patch-autolinking.js
      - APP_VARIANT=fdroid npx expo prebuild --platform android --no-install
    gradle:
      - yes
    scandelete:
      - node_modules

AutoUpdateMode: None
UpdateCheckMode: None
CurrentVersion: '1.1.0'
CurrentVersionCode: 1
```

Notes sur ce brouillon :
- `AutoUpdateMode`/`UpdateCheckMode` à `None` volontairement : la détection
  automatique de nouvelle version suppose un `versionName`/`versionCode`
  natif stable dans le repo, ce qui n'est pas le cas ici puisque le projet
  natif est généré à la volée par `expo prebuild` — chaque nouvelle release
  F-Droid demandera un nouveau tag + une entrée `Builds` ajoutée à la main
  (ou une mise à jour de ce fichier, selon l'issue qui sera ouverte).
- La version exacte de Node (22.14.0) devra être ajustée si F-Droid impose
  une version minimale différente sur son serveur de build — ce fichier est
  un point de départ solide, pas un YAML garanti sans ajustement par un
  mainteneur F-Droid (c'est l'usage : ce sont eux qui finalisent la recette
  exacte lors de la revue de la MR).
- `Categories: System` est discutable pour un moniteur de disponibilité de
  domaines — `Internet` seul pourrait suffire ; à ajuster selon ton
  jugement.
