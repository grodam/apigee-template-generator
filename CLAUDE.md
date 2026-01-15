# Apigee-Template

Outil de generation automatique de proxies Google Apigee a partir de specifications OpenAPI.

## Quick Start

```bash
cd apigee-react-generator
npm install

# Mode Web (navigateur)
npm run dev          # Vite dev server (port 5173)
npm run proxy        # Express proxy server pour CORS (port 3001)
npm run dev:full     # Les deux en parallele

# Mode Desktop (Tauri - recommande)
npm run tauri:dev    # App desktop avec hot reload
npm run tauri:build  # Build installateur Windows (.msi/.exe)
```

## Structure du Projet

```
apigee-react-generator/
├── src/
│   ├── components/      # Composants React (Canvas, Cards, Settings, Help, ui/)
│   ├── services/        # Logique metier (generators/, parsers/, exporters/, templates/, azure-devops/)
│   ├── store/           # Zustand state management
│   ├── models/          # Interfaces TypeScript
│   ├── types/           # Type definitions
│   ├── utils/           # Utilitaires (constants.ts, config.ts, logger.ts, tauriHttp.ts)
│   ├── hooks/           # Custom React hooks
│   ├── i18n/            # Internationalisation (EN/FR)
│   └── styles/          # CSS global
├── src-tauri/           # Backend Rust Tauri
│   ├── src/             # Code Rust (lib.rs, main.rs)
│   ├── capabilities/    # Permissions Tauri (HTTP, etc.)
│   ├── icons/           # Icones app
│   ├── Cargo.toml       # Dependances Rust
│   └── tauri.conf.json  # Config Tauri
├── public/templates/    # Templates XML Apigee par defaut
├── server/              # Proxy Express pour Azure DevOps (mode web)
└── dist/                # Build de production
```

## Stack Technique

- **Framework**: React 19 + TypeScript 5.9
- **Desktop**: Tauri 2 (Rust backend, WebView frontend)
- **Build**: Vite 7
- **Styling**: Tailwind CSS (grille 4px, Swiss Design)
- **State**: Zustand avec persistence localStorage
- **UI**: Radix UI primitives + Lucide icons
- **Editor**: Monaco Editor
- **Forms**: React Hook Form + Zod validation
- **Parsing**: @apidevtools/swagger-parser, js-yaml, fast-xml-parser
- **Export**: JSZip
- **HTTP**: tauri-plugin-http (desktop), fetch + proxy (web)

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de dev Vite |
| `npm run build` | Build production (tsc + vite) |
| `npm run preview` | Preview du build |
| `npm run lint` | ESLint |
| `npm run proxy` | Proxy server Express (mode web) |
| `npm run tauri:dev` | App desktop Tauri avec hot reload |
| `npm run tauri:build` | Build installateur Windows (.msi/.exe) |

## Conventions de Code

### Nommage
- Composants: PascalCase (`CanvasContainer.tsx`)
- Utilitaires: kebab-case (`api-helpers.ts`)
- Constantes: UPPER_SNAKE_CASE
- Interfaces: PascalCase (`ApiConfiguration`)

### Formule Nom de Proxy
```
{entity}.{domain}.{backendApps}.{businessObject}.{version}
Exemple: elis.finance.sap-salesforce.invoice.v1
```

### Patterns
- Composants fonctionnels avec hooks
- Zustand pour state global, React Hook Form pour forms locaux
- Logger scope pour debug: `const log = logger.scope('ServiceName')`

## Architecture

### Services Principaux
- **generators/**: Generation de POMs Maven, policies XML, flows
- **parsers/**: Extraction d'info depuis OpenAPI
- **exporters/**: Creation de ZIP
- **templates/**: Gestion, cache, sync des templates XML
- **azure-devops/**: Auth, push repo, sync templates

### State Management (Zustand)
```typescript
// src/store/projectStore.ts
const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({ /* state & actions */ }),
    { name: 'project-store' }
  )
);
```

### Systeme de Templates
1. **Default**: `public/templates/` (embarques)
2. **Override**: localStorage (utilisateur)
3. **Remote**: Azure DevOps (IndexedDB cache)

## Environnements

- dev1, uat1, staging, prod1
- Configuration par environnement dans `ApiConfiguration`

## Types d'Auth Southbound

- None, Basic, OAuth2-ClientCredentials, ApiKey

## Fichiers de Config Importants

- `vite.config.ts`: Build, path aliases (@/ = src/)
- `tailwind.config.js`: Theme, couleurs, dark mode
- `tsconfig.json`: ES2022, strict mode
- `src/utils/constants.ts`: Constantes applicatives

## Dette Technique Connue

- Types `any` a remplacer par types stricts
- Pas de tests (unit/integration/E2E)
- Stockage PAT en sessionStorage (migrer vers OAuth2+PKCE)
- Console.log a remplacer par logger scope

## Integration Azure DevOps

### Mode Desktop (Tauri)
Pas de proxy necessaire. `tauri-plugin-http` effectue les requetes HTTP depuis le backend Rust, contournant les restrictions CORS du navigateur.

### Mode Web (navigateur)
Le proxy Express (`server/`) contourne les restrictions CORS. Port: 3001.

### Detection automatique
```typescript
// src/utils/tauriHttp.ts
import { isTauri, tauriFetch } from '@/utils/tauriHttp';

if (isTauri()) {
  // Utilise tauri-plugin-http (pas de CORS)
} else {
  // Utilise fetch via proxy Express
}
```

## i18n

Langues supportees: English (defaut), Francais
Config: `src/i18n/config.ts`
Fichiers: `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`

## Tauri - Configuration

### Fichiers cles
- `src-tauri/tauri.conf.json`: Config principale (window, bundle, build)
- `src-tauri/capabilities/default.json`: Permissions (core, http)
- `src-tauri/Cargo.toml`: Dependances Rust

### Plugins Tauri actifs
- `tauri-plugin-http`: Requetes HTTP sans CORS
- `tauri-plugin-log`: Logging

### Build Windows
```json
// tauri.conf.json - Installation sans droits admin
"bundle": {
  "windows": {
    "nsis": {
      "installMode": "currentUser"
    }
  }
}
```

### Prerequis dev
- Rust (rustup)
- VS Build Tools 2022 (C++ workload)
- Node.js + npm
