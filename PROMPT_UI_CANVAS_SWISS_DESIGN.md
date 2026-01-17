# Mission : Refonte UI en Canvas Swiss Design pour Apigee Template Generator

## Contexte

Tu es un expert en UI/UX Design. Tu dois transformer l'interface actuelle de l'application "Apigee Template Generator" (actuellement en mode wizard multi-pages avec boutons Next/Previous) en une interface **Canvas mono-page** avec des cards expansibles, suivant le système de design **Swiss/Minimalisme Suisse**.

## Objectif Principal

Créer une interface où **tout est visible et modifiable sur une seule page**, sans navigation multi-étapes. Les cards se remplissent automatiquement à partir de la spécification OpenAPI importée.

---

## Principes de Design Swiss à Respecter Strictement

### Palette Monochrome

- Noir (`#000000`), Blanc (`#FFFFFF`), Gris techniques (`#F3F4F6`, `#9CA3AF`)
- Pas de dégradés, pas de couleurs vives sauf alertes critiques
- Support du dark mode (inverser les couleurs)

### Typographie

- Police : `Inter` ou `Helvetica`
- Titres : `font-black uppercase tracking-tighter`
- Labels techniques : `font-mono text-[10px] uppercase`

### Éléments Visuels

- **Zéro ombre** (`box-shadow: none`) - profondeur créée par les bordures
- Bordures : `border-black`, `border-t-2`, `border-gray-200`
- Angles droits ou arrondis très subtils (`rounded-none` ou `rounded-sm`)
- Grille modulaire rigoureuse
- Espace négatif généreux (marges/paddings importants)

### Boutons

```css
bg-black text-white px-6 py-3 hover:bg-gray-800 transition-all uppercase text-xs font-bold tracking-widest
```

---

## Architecture des Cards Canvas

### 1. Card Initialisation (Import Spec)

**Objectif** : Point d'entrée pour importer la spécification OpenAPI

**État replié** :

- Icône + "OpenAPI Specification"
- Badge status : "Not loaded" / "Loaded ✓"
- Nom du fichier si chargé

**État déplié** :

- Zone de drop/upload pour fichier OpenAPI (YAML/JSON)
- Éditeur Monaco intégré pour coller/modifier la spec
- Bouton "Parse & Auto-fill"
- Indicateur des valeurs détectées (API name, version, servers, auth...)

---

### 2. Card API Product

**Objectif** : Configuration du produit API

**État replié** :

- Nom du produit (ex: `elis.banking.account.v1`)
- Display Name
- Badge avec le type d'approbation (auto/manual)
- Pourcentage de complétion

**État déplié** :

- Product Name (auto-généré, éditable)
- Display Name
- Description (auto-générée depuis les composants du proxy)
- Approval Type (select: auto/manual)
- Attributes (key-value editor)
- Environments associés (checkboxes)

---

### 3. Card Proxy Configuration

**Objectif** : Configuration du proxy Apigee

**État replié** :

- Proxy Name complet (ex: `elis.banking.sap.account.v1`)
- Base Path
- Auth Type (badge)
- Pourcentage de complétion

**État déplié** :

- **Section Naming Convention** :
  - Entity (select: elis/exts)
  - Domain (input)
  - Backend Apps (multi-select/tags)
  - Business Object (input)
  - Version (input)
  - → Affichage live du Proxy Name généré
- Base Path (auto-détecté de la spec)
- Target Path (auto-détecté, avec support variabilisation)
- Auth Southbound (select: oauth2/apikey/basic/none)
- OAS Format & Version

---

### 4. Card Target Servers (Multi-Environment)

**Objectif** : Configuration des target servers par environnement

**État replié** :

- Tableau compact : ENV | HOST | PORT | STATUS
- 4 lignes (dev1, uat1, staging, prod1)
- Indicateur global de complétion

**État déplié** :

- **Tabs ou Accordéon par environnement** (dev1 | uat1 | staging | prod1)
- Pour chaque environnement :
  - Target Server Name (auto-généré)
  - Host (auto-détecté si présent dans spec)
  - Port (default 443)
  - SSL enabled (toggle)
  - KVMs associés (liste éditable)
  - API Products de cet env

---

## Barre de Progression Globale

En haut du canvas, afficher :

```
┌─────────────────────────────────────────────────────────────────┐
│  CONFIGURATION PROGRESS                                    78%  │
│  ████████████████████████████████░░░░░░░░░░                    │
│  OpenAPI ✓  |  Product ✓  |  Proxy ◐  |  Targets ○             │
└─────────────────────────────────────────────────────────────────┘
```

- Style Swiss : ligne fine noire sur fond gris très clair
- Indicateur de chaque section (✓ complet, ◐ partiel, ○ vide)

---

## Section Export & Azure DevOps

### Panel Console (style terminal noir)

Zone en bas du canvas pour les actions d'export :

```
┌──────────────────────────────────────────────────────────────────┐
│ 03 / EXPORT & DEPLOYMENT                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │  DOWNLOAD ZIP   │  │  PUSH TO AZURE  │  │  PREVIEW FILES   │ │
│  │       ↓         │  │       ☁         │  │       👁         │ │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ▸ Console Output                                           │ │
│  │   14:02:01  > READY FOR EXPORT                             │ │
│  │   _                                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Suggestions pour "Push to Azure"

1. **Workflow en 2 clics** :
   - Clic 1 : Ouvre un dropdown/modal avec les options :
     - Create new repository
     - Push to existing repository (sélection)
   - Clic 2 : Confirme et lance

2. **Progress indicator** dans la console :
   ```
   > CONNECTING TO AZURE DEVOPS...
   > CREATING REPOSITORY: sap-account-v1
   > PUSHING FILES (12/12)...
   > SUCCESS: Repository created at https://dev.azure.com/...
   ```

3. **Raccourci clavier** : `Ctrl+Shift+P` pour push rapide

---

## Comportement des Cards

### Expansion/Collapse

- Clic sur la card header = toggle expand
- Chevron indicator (→ replié, ↓ déplié)
- Transition douce : `transition-all duration-200`
- Une seule card peut être dépliée à la fois (optionnel, selon préférence UX)

### Auto-fill depuis OpenAPI

Quand une spec est parsée, remplir automatiquement :

- API name, version → Business Object, Version
- Servers → Target hosts par environnement (pattern matching dev/uat/staging/prod)
- Security schemes → Auth Southbound
- Base path → Proxy Base Path
- Description → (ne pas auto-fill, générée depuis naming)

### Validation Visuelle

- Champs valides : bordure noire fine
- Champs invalides : bordure rouge + message
- Champs auto-remplis : petit badge "AUTO" à côté

---

## Contraintes Techniques

1. **Préserver toutes les fonctionnalités existantes** :
   - Génération de templates
   - Export ZIP
   - Push Azure DevOps
   - Gestion des 4 environnements (dev1, uat1, staging, prod1)
   - Auto-détection depuis OpenAPI
   - Settings modal (Azure DevOps config, Template sync)

2. **Stack existante** :
   - React + TypeScript
   - Tailwind CSS
   - Zustand (state management)
   - i18next (traductions)
   - Lucide React (icônes)

3. **Store Zustand** :
   - Supprimer le concept de `currentStep`
   - Ajouter un state pour tracker les cards expandées
   - Ajouter un calcul de % complétion par section

---

## Fichiers de Référence

- Design System : `UI Syles/swiss-design-prompt.md`
- HTML Reference : `UI Syles/swiss_design_reference.html`
- Preview HTML : `UI Syles/canvas_preview.html`

---

## Livrables Attendus

1. Refonte complète de `WizardContainer.tsx` → `CanvasContainer.tsx`
2. Nouveaux composants :
   - `SwissCard.tsx` (card expansible réutilisable)
   - `ProgressBar.tsx` (barre de progression Swiss style)
   - `ConsolePanel.tsx` (panel export style terminal)
3. Adaptation des steps existants en cards
4. Mise à jour du store Zustand
5. Mise à jour des styles CSS/Tailwind

---

## Exemple de Structure de Fichiers Finale

```
src/
├── components/
│   ├── Canvas/
│   │   ├── CanvasContainer.tsx      # Container principal
│   │   ├── ProgressHeader.tsx       # Barre de progression globale
│   │   └── ConsolePanel.tsx         # Panel export/console
│   ├── Cards/
│   │   ├── SwissCard.tsx            # Composant card réutilisable
│   │   ├── OpenAPICard.tsx          # Card import spec
│   │   ├── ApiProductCard.tsx       # Card API Product
│   │   ├── ProxyConfigCard.tsx      # Card Proxy
│   │   └── TargetServersCard.tsx    # Card Targets multi-env
│   └── ui/
│       └── ... (composants existants adaptés au Swiss style)
├── store/
│   └── useProjectStore.ts           # Store mis à jour (sans currentStep)
└── styles/
    └── swiss-theme.css              # Variables CSS Swiss Design
```

---

## Notes Additionnelles

### Responsive Design

- Mobile : Cards empilées verticalement, toujours expansibles
- Tablet : Layout 2 colonnes pour certaines cards
- Desktop : Layout optimal avec sidebar optionnel pour la progression

### Accessibilité

- Contraste élevé (noir/blanc)
- Navigation clavier complète
- Labels ARIA pour les états expand/collapse
- Focus visible sur tous les éléments interactifs

### Performance

- Lazy loading de l'éditeur Monaco
- Debounce sur les inputs de formulaire
- Mémorisation des calculs de complétion
