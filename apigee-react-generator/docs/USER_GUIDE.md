# Apigee Template Generator - Guide Utilisateur

## Vue d'ensemble

L'**Apigee Template Generator** est une application web permettant de générer des bundles de proxy API Apigee professionnels à partir de spécifications OpenAPI. L'interface utilisateur guide l'utilisateur à travers un assistant en 6 étapes pour configurer, générer et exporter un projet Apigee complet.

---

## Démarrage rapide

### 1. Installation et lancement

```bash
# Cloner le repository
git clone https://github.com/grodam/apigee-template-generator.git
cd apigee-template-generator/apigee-react-generator

# Installer les dépendances
npm install

# Démarrer l'application
npm run dev
```

L'application sera accessible sur http://localhost:5173

### 2. Générer un proxy

1. **Étape 1** : Configurer les paramètres API (entité, domaine, applications backend, version...)
2. **Étape 2** : Charger votre spécification OpenAPI (JSON/YAML)
3. **Étape 3** : Vérifier les configurations d'environnement
4. **Étape 4** : Cliquer sur "Générer le projet"
5. **Étape 5** : (Optionnel) Pousser vers Azure DevOps
6. **Étape 6** : Télécharger le ZIP

### 3. Déployer sur Apigee

```bash
# Extraire le ZIP généré
unzip [proxyName].zip
cd [proxyName]

# Déployer avec Maven
mvn install -Pgoogleapi \
  -Denv=dev1 \
  -Dorg=VOTRE_ORG_APIGEE \
  -Dbearer=VOTRE_ACCESS_TOKEN

# Ou déployer avec apigeecli
apigeecli apis create bundle \
  -f src/main/apigee/gateway/apiproxy \
  -n [proxyName] \
  --org VOTRE_ORG_APIGEE \
  --token VOTRE_ACCESS_TOKEN
```

### 4. Déployer la configuration d'environnement

```bash
# Déployer les target servers
apigeecli targetservers import \
  -f config/env/dev1/edge-env.json \
  --org VOTRE_ORG_APIGEE \
  --env dev1 \
  --token VOTRE_ACCESS_TOKEN

# Déployer les API products
apigeecli products import \
  -f config/env/dev1/edge-org.json \
  --org VOTRE_ORG_APIGEE \
  --token VOTRE_ACCESS_TOKEN
```

---

## Architecture de l'interface

### Design System

L'application utilise un design system "Utility & Precision" inspiré de Linear et GitHub :

- **Grille** : Système de 4px pour l'espacement
- **Couleurs** : Palette slate (neutres) avec accent indigo (#6366f1)
- **Typographie** : Police Inter pour le texte, monospace pour les données
- **Bordures** : Coins arrondis de 4-8px, bordures subtiles pour la profondeur
- **Ombres** : Minimales, principalement via les bordures

### Internationalisation

L'application supporte deux langues :
- **Français** (par défaut)
- **English**

Le sélecteur de langue est accessible dans le header de l'application.

---

## Les 6 étapes de l'assistant

### Étape 1 : Configuration API

Cette étape permet de définir les paramètres fondamentaux du proxy API.

#### Section 1 : Convention de nommage du proxy

| Champ | Description | Format | Exemple |
|-------|-------------|--------|---------|
| **Entité** | Type d'API (interne/externe) | `elis` ou `ext` | `elis` |
| **Domaine** | Domaine métier | Texte libre | `finance` |
| **Applications Backend** | Systèmes backend séparés par `-` | `app1-app2` | `sap-salesforce` |
| **Objet métier** | Ressource principale de l'API | Texte libre | `invoice` |
| **Version** | Version de l'API | `v` + numéro | `v1` |
| **Description** | Description de l'API | Min. 10 caractères | `API de gestion des factures` |

**Nom du proxy généré** : `[entité].[domaine].[backendApps].[objetMétier].[version]`

Exemple : `elis.finance.sap-salesforce.invoice.v1`

#### Section 2 : Configuration du routage

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Basepath du proxy** | Chemin de base de l'API | `/invoice-api/v1` |
| **Chemin cible** | Préfixe ajouté vers le backend | `/v1` |

#### Section 3 : Sécurité et limites

| Champ | Description | Options/Format |
|-------|-------------|----------------|
| **Authentification Southbound** | Auth vers le backend | `None`, `Basic`, `OAuth2-ClientCredentials` |
| **Limite de débit globale** | Rate limiting | `500pm` (par minute), `100ps` (par seconde) |

#### Section 4 : Configuration optionnelle

| Champ | Description |
|-------|-------------|
| **URL de mock** | URL Stoplight ou autre serveur mock pour les tests |

---

### Étape 2 : Spécification OpenAPI

Cette étape permet de charger et valider la spécification OpenAPI.

#### Fonctionnalités

- **Upload de fichier** : Supporte JSON et YAML (.json, .yaml, .yml)
- **Drag & Drop** : Glisser-déposer un fichier directement
- **Éditeur intégré** : Modification directe du contenu
- **Validation en temps réel** : Vérification de la syntaxe et structure

#### Informations affichées après validation

- Version OpenAPI détectée (2.0, 3.0.x, 3.1.x)
- Nombre d'endpoints/chemins détectés
- Statut de validation (valide/invalide)

---

### Étape 3 : Configuration des environnements

Cette étape permet de configurer les 4 environnements Apigee.

#### Environnements disponibles

| Environnement | Description |
|---------------|-------------|
| **DEV1** | Développement |
| **UAT1** | Tests d'acceptation utilisateur |
| **STAGING** | Pré-production |
| **PROD1** | Production |

#### Configuration du serveur cible (Target Server)

| Champ | Description | Auto-généré |
|-------|-------------|-------------|
| **Nom** | Identifiant du serveur | Oui : `[entité].[backendApps].[version].backend` |
| **Hôte** | URL du backend | Non : `backend-[env].elis.com` |
| **Port** | Port du backend | Non (défaut: 443) |

#### Configuration du produit API (API Product)

| Champ | Description | Auto-généré |
|-------|-------------|-------------|
| **Nom du produit** | Identifiant unique | Oui |
| **Nom d'affichage** | Nom lisible | Oui : `[businessObject]-[version]-[env]` |
| **Description** | Description du produit | Oui |

**Règles de suffixe pour les noms** :
- **prod/prod1** : Pas de suffixe
- **staging** : Suffixe `-stg` (displayName) ou `.stg` (productName)
- **dev1/uat1** : Suffixe `-dev`/`-uat` ou `.dev`/`.uat`

#### Key-Value Maps (KVM)

Les KVMs permettent de stocker des configurations et credentials par environnement.

| Propriété | Description |
|-----------|-------------|
| **Nom** | Identifiant du KVM |
| **Chiffré** | Active le chiffrement des valeurs |
| **Entrées** | Paires clé-valeur (optionnel) |

**Actions disponibles** :
- Ajouter un KVM
- Supprimer un KVM
- Ajouter/Supprimer des entrées clé-valeur

---

### Étape 4 : Génération

Cette étape génère le bundle complet du proxy Apigee.

#### Prérequis (Checklist)

- ✅ Configuration API complétée (Étape 1)
- ✅ Spécification OpenAPI validée (Étape 2)

#### Processus de génération

1. Initialisation
2. Génération des fichiers Eclipse
3. Génération des POMs Maven
4. Génération de la configuration du proxy
5. Génération des flows depuis OpenAPI
6. Génération des policies
7. Génération des endpoints cibles
8. Génération des configurations d'environnement
9. Finalisation

#### Fichiers générés

Le projet généré contient :
- Configuration du proxy Apigee
- Policies de sécurité et routage
- Fichiers de configuration par environnement (`edge-env.json`, `edge-org.json`)
- Configuration Maven pour le déploiement
- Fichiers Eclipse pour l'import IDE

---

### Étape 5 : Azure DevOps

Cette étape permet l'intégration avec Azure DevOps pour le versioning du code.

#### Configuration requise

| Paramètre | Description | Où configurer |
|-----------|-------------|---------------|
| **Organisation** | Nom de l'organisation Azure DevOps | Paramètres |
| **Projet** | Projet Azure DevOps | Paramètres |
| **PAT** | Personal Access Token | Paramètres |
| **Branche par défaut** | main, master, develop... | Paramètres |
| **Nom du repository** | Nom du repo à créer/utiliser | Cette étape |

#### Options

- **Créer le repository** : Crée automatiquement le repo s'il n'existe pas
- **Push automatique** : Push le code après génération
- **Créer les pipelines** : CI/CD (bientôt disponible)

#### Actions

- **Tester la connexion** : Vérifie les paramètres Azure DevOps
- **Pousser vers Azure DevOps** : Upload le projet vers le repository

---

### Étape 6 : Export

Cette étape permet de télécharger le projet généré.

#### Fonctionnalités

- **Télécharger ZIP** : Export du projet complet en archive ZIP
- **Visualisation de la structure** : Arborescence des fichiers générés
- **Guide d'intégration** : Instructions pour Azure DevOps

---

## Paramètres de l'application

Accessible via l'icône ⚙️ dans le header.

### Onglet Templates

Permet de visualiser et personnaliser les templates de génération :
- Arborescence des fichiers templates
- Éditeur intégré pour modification
- Export/Import des templates personnalisés

### Onglet Azure DevOps

Configuration persistante (stockée dans le navigateur) :
- Organisation Azure DevOps
- Projet
- Personal Access Token (PAT)
- Branche par défaut

---

## Fichiers de sortie générés

### Structure du projet

```
[proxyName]/
├── .project                          # Configuration Eclipse
├── .classpath                        # Classpath Eclipse
├── pom.xml                           # POM Maven principal
├── apiproxy/
│   ├── [proxyName].xml              # Descripteur du proxy
│   ├── proxies/
│   │   └── default.xml              # ProxyEndpoint
│   ├── targets/
│   │   └── default.xml              # TargetEndpoint
│   ├── policies/
│   │   └── *.xml                    # Policies Apigee
│   └── resources/
│       └── oas/
│           └── openapi.json         # Spécification OpenAPI
├── config/
│   └── env/
│       ├── dev1/
│       │   ├── edge-env.json        # Config environnement
│       │   └── edge-org.json        # Config organisation
│       ├── uat1/
│       ├── staging/
│       └── prod1/
└── apigee-configuration.json        # Configuration globale
```

### Format des fichiers de configuration

#### apigee-configuration.json

```json
{
  "entity": "elis",
  "description": "API description",
  "version": "v1",
  "apiname": "invoice",
  "oas.version": "3.0.0",
  "oas.format": "json",
  "proxy.basepath": "/invoice-api/v1",
  "target.path": "/v1",
  "global-rate-limit": "500pm",
  "auth-southbound": "basic",
  "mock.url": ""
}
```

#### edge-env.json

```json
{
  "version": "1.0",
  "envConfig": {
    "dev1": {
      "targetServers": [...],
      "kvms": [...],
      "virtualHosts": [],
      ...
    }
  }
}
```

#### edge-org.json

```json
{
  "version": "1.0",
  "orgConfig": {
    "apiProducts": [...],
    "developers": [],
    "developerApps": {},
    ...
  }
}
```

---

## Raccourcis et astuces

### Navigation

- Utilisez les onglets pour naviguer entre les étapes déjà complétées
- Les boutons "Retour" et "Suivant" permettent une navigation séquentielle
- La barre de progression indique l'avancement global

### Validation

- Les champs obligatoires sont marqués d'un astérisque (*)
- Les tooltips (icône ℹ️) fournissent des informations supplémentaires
- Les erreurs de validation sont affichées en rouge sous les champs

### Performance

- Les données sont sauvegardées automatiquement dans le navigateur
- La configuration Azure DevOps persiste entre les sessions
- Les templates personnalisés sont conservés

---

## Support

Pour toute question ou problème :
- Consultez la documentation technique
- Vérifiez les messages d'erreur affichés
- Assurez-vous que tous les champs requis sont remplis

---

*Documentation générée le 9 janvier 2026*
