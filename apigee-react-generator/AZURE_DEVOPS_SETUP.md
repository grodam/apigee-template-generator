# Configuration Azure DevOps

Ce guide explique comment configurer et utiliser l'intégration Azure DevOps avec le générateur Apigee.

## Problème CORS

Les appels directs à l'API Azure DevOps depuis le navigateur sont bloqués par les politiques CORS (Cross-Origin Resource Sharing). Pour contourner ce problème, nous utilisons un serveur proxy Node.js.

## Installation

### Option 1 : Démarrage complet (Application + Proxy)

Démarrez l'application React et le serveur proxy en une seule commande :

```bash
npm run dev:full
```

Cette commande lance :
- Le serveur Vite sur `http://localhost:5175`
- Le serveur proxy sur `http://localhost:3001`

### Option 2 : Démarrage séparé

#### 1. Démarrer le serveur proxy

Dans un terminal :

```bash
npm run proxy
```

#### 2. Démarrer l'application React

Dans un autre terminal :

```bash
npm run dev
```

## Configuration Azure DevOps

### 1. Créer un Personal Access Token (PAT)

1. Allez sur Azure DevOps : `https://dev.azure.com/{your-organization}`
2. Cliquez sur votre profil (en haut à droite) → **Personal Access Tokens**
3. Cliquez sur **+ New Token**
4. Configurez le token :
   - **Name** : Apigee Generator
   - **Organization** : Votre organisation
   - **Expiration** : 90 jours (ou selon vos besoins)
   - **Scopes** :
     - ✅ **Code** : Read, Write, & Manage
5. Cliquez sur **Create**
6. **IMPORTANT** : Copiez le token immédiatement (il ne sera plus affiché)

### 2. Configurer dans l'application

1. Remplissez le formulaire Azure DevOps (Step 5) :
   - **Organization** : Le nom de votre organisation Azure DevOps
   - **Project** : Le nom du projet existant
   - **Repository Name** : Nom du repository (auto-généré basé sur le proxy name)
   - **PAT Token** : Collez le token créé à l'étape 1
   - **Default Branch** : main, master, ou develop

2. Cliquez sur **Test Connection** pour vérifier

3. Une fois le projet généré (Step 4), retournez à Step 5 et cliquez sur **Push to Azure DevOps**

## Fonctionnalités

✅ **Test de connexion** : Vérifie que vos credentials Azure DevOps sont valides

✅ **Création automatique du repository** : Crée le repository s'il n'existe pas

✅ **Push automatique** : Pousse le code généré vers Azure DevOps

✅ **Lien direct** : Ouvre le repository dans Azure DevOps après le push

## Sécurité

⚠️ **Le PAT token est utilisé uniquement pour la session en cours et n'est PAS stocké de manière permanente.**

Le token circule :
- Frontend → Proxy Server → Azure DevOps API

## Dépannage

### Erreur de connexion

Si vous obtenez une erreur lors du test de connexion :

1. Vérifiez que le serveur proxy est démarré (`http://localhost:3001`)
2. Vérifiez que votre PAT token est valide et n'a pas expiré
3. Vérifiez que le nom de l'organisation est correct
4. Vérifiez que le PAT token a les permissions **Code (Read, Write, & Manage)**

### Le repository n'apparaît pas dans Azure DevOps

1. Vérifiez que le projet Azure DevOps existe
2. Vérifiez que vous avez les permissions pour créer des repositories
3. Rafraîchissez la page Azure DevOps
4. Vérifiez les logs du serveur proxy pour voir les erreurs

### Erreur CORS

Si vous obtenez une erreur CORS, cela signifie que le serveur proxy n'est pas démarré ou que l'URL du proxy est incorrecte.

Vérifiez que :
- Le proxy tourne sur `http://localhost:3001`
- La variable `proxyUrl` dans `AzureDevOpsService.ts` pointe vers `http://localhost:3001/api/azure-devops-proxy`

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   React     │  HTTP   │    Proxy     │  HTTPS  │  Azure DevOps   │
│  Frontend   │ ──────> │   Server     │ ──────> │      API        │
│ (port 5175) │         │ (port 3001)  │         │                 │
└─────────────┘         └──────────────┘         └─────────────────┘
```

Le proxy résout les problèmes CORS en agissant comme intermédiaire entre le frontend et l'API Azure DevOps.

## Développement

### Structure des fichiers

```
apigee-react-generator/
├── server/
│   ├── proxy.js              # Serveur proxy Express
│   └── package.json          # Dépendances du proxy
├── src/
│   ├── services/
│   │   └── azure-devops/
│   │       └── AzureDevOpsService.ts  # Service API Azure DevOps
│   └── components/
│       └── Steps/
│           └── Step5_AzureDevOps.tsx  # Interface utilisateur
└── AZURE_DEVOPS_SETUP.md     # Ce fichier
```

### Variables d'environnement

Vous pouvez configurer le port du proxy via une variable d'environnement :

```bash
export PROXY_PORT=3001
npm run proxy
```
