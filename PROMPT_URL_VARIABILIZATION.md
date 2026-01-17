# Prompt : Implémentation de la variabilisation des Target Paths

## Contexte

L'application Apigee React Generator permet de configurer des proxies API à partir de spécifications OpenAPI. Actuellement, les target URLs sont gérées de manière statique. Nous devons implémenter une logique intelligente de variabilisation qui détecte automatiquement les parties dynamiques des URLs et génère les KVM (Key-Value Map) entries correspondantes.

## Objectif

Implémenter la détection et variabilisation automatique des target URLs avec génération des KVM entries selon les règles métier définies ci-dessous.

---

## Règles métier

### Règle de nommage des KVM entries

| Élément | Format |
|---------|--------|
| **Clé** | `backend_info_[index]` où `index` est un entier commençant à 1, incrémenté pour chaque nouvelle clé |
| **Valeur** | La variable détectée si définie, sinon vide (sera renseignée manuellement) |

---

### Cas 1 : URL unique avec variables template `{var}`

**Input exemple** :
```
https://gis-platform-{env}.generix.biz/{customer}/invoice-processing
```

**Comportement attendu** :
- Détecter toutes les variables `{var1}`, `{var2}`, etc. dans le host ET le path
- Créer une KVM entry par variable détectée
- Remplacer chaque variable par `{private.backend_info_N}`

**Output attendu** :

| Élément | Valeur |
|---------|--------|
| Host (tous envs) | `gis-platform-{private.backend_info_1}.generix.biz` |
| Target path (tous envs) | `/{private.backend_info_2}/invoice-processing` |

**KVM entries générées** :

| Clé | Valeur |
|-----|--------|
| `backend_info_1` | `env` |
| `backend_info_2` | `customer` |

---

### Cas 2 : URLs multiples par environnement (sans variables template)

**Input exemple** :
```yaml
servers:
  - url: 'https://intake-1-2.nxt.uat.unifiedpost.com/1/upcloud_uat'
    description: UAT
  - url: 'https://intake-1-2.nxt.unifiedpost.com/1/upcloud_prod'
    description: PROD
```

**Comportement attendu** :
- Comparer les URLs pour identifier les segments différents
- Pour le **host** : mapper directement par environnement (pas de variabilisation KVM)
- Pour le **target path** : variabiliser uniquement les différences avec KVM entries

**Output attendu** :

| Environnement | Host |
|---------------|------|
| DEV / UAT / STG | `intake-1-2.nxt.uat.unifiedpost.com` |
| PROD | `intake-1-2.nxt.unifiedpost.com` |

| Élément | Valeur |
|---------|--------|
| Target path (tous envs) | `/1/upcloud_{private.backend_info_1}` |

**KVM entries générées** :

| Clé | Valeur |
|-----|--------|
| `backend_info_1` | `` (vide, à renseigner par env : `uat` ou `prod`) |

---

### Cas 3 : Mix des deux cas

URLs multiples avec variables template. Appliquer les deux règles en combinaison :

1. D'abord détecter et remplacer les variables template `{var}`
2. Puis comparer les URLs résultantes pour identifier les différences additionnelles

---

## Tâches techniques à réaliser

### 1. Créer un utilitaire d'analyse d'URL

**Fichier** : `src/utils/urlVariabilizer.ts`

**Fonctionnalités** :
- Parser une URL en composants (protocol, host, path, query)
- Détecter les variables template `{varName}`
- Comparer plusieurs URLs pour trouver les segments différents

### 2. Créer un générateur de KVM entries

**Fichier** : `src/utils/kvmGenerator.ts`

**Fonctionnalités** :
- Générer les clés `backend_info_N` séquentiellement
- Tracker les variables et leurs valeurs associées
- Produire le mapping final host/path avec références `{private.backend_info_N}`

### 3. Intégrer dans le flow existant

- Lors du parsing OpenAPI (Step 1), extraire les servers URLs
- Afficher un aperçu des variabilisations détectées dans l'UI
- Stocker les KVM entries générées dans le store pour export

### 4. Mettre à jour le store

**Fichier** : `src/store/useProjectStore.ts`

**Modifications** :
- Ajouter un état pour les KVM entries générées
- Ajouter les hosts/paths variabilisés par environnement

### 5. UI pour afficher/éditer les KVM entries

- Afficher les KVM entries générées dans la card Environment Config
- Permettre l'édition manuelle des valeurs vides

---

## Exemples de tests à couvrir

```typescript
// Cas 1: Variables template
parseUrl('https://gis-platform-{env}.generix.biz/{customer}/invoice-processing')
// → {
//     host: 'gis-platform-{env}.generix.biz',
//     path: '/{customer}/invoice-processing',
//     variables: ['env', 'customer']
//   }

// Cas 2: URLs multiples
compareUrls([
  'https://intake-1-2.nxt.uat.unifiedpost.com/1/upcloud_uat',
  'https://intake-1-2.nxt.unifiedpost.com/1/upcloud_prod'
])
// → {
//     hostDiffs: {
//       uat: 'intake-1-2.nxt.uat.unifiedpost.com',
//       prod: 'intake-1-2.nxt.unifiedpost.com'
//     },
//     pathDiffs: [{ position: 'suffix', values: ['uat', 'prod'] }]
//   }

// Génération KVM
generateKvmEntries(analyzedUrls)
// → [{ key: 'backend_info_1', value: '' }]
```

---

## Fichiers existants à examiner

| Fichier | Description |
|---------|-------------|
| `src/store/useProjectStore.ts` | Store principal |
| `src/components/Steps/Step1_OpenAPIEditor.tsx` | Parsing OpenAPI |
| `src/components/Steps/Step3_EnvironmentConfig.tsx` | Config environnements |
| `src/components/Cards/` | Cards du canvas |
| `src/utils/` | Utilitaires existants |

---

## Contraintes

- [ ] Maintenir la compatibilité avec le flow existant
- [ ] Utiliser TypeScript strict
- [ ] Suivre le design system Swiss existant (voir `src/styles/swiss-design.css`)
- [ ] Les KVM entries doivent être exportables avec le reste de la configuration

---

## Instructions pour Claude Code

> Commence par explorer le codebase pour comprendre la structure actuelle, puis propose un plan d'implémentation détaillé avant de coder.
