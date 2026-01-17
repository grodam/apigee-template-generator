# Feature: Multi-Products Configuration per Proxy

## Overview

Implement the ability to configure **multiple API Products** for a single proxy, each with different authorized resource paths. This allows users to create fine-grained access control based on OpenAPI spec paths.

### Example Use Case

Given an OpenAPI spec with paths:
```
/api/Cases
/api/Cases/{id}
/api/Auth
/api/Auth/login
/api/Auth/logout
```

The user should be able to create:
- **Product 1**: `cases-product` with authorized paths `/api/Cases` and `/api/Cases/**`
- **Product 2**: `auth-product` with authorized paths `/api/Auth` and `/api/Auth/**`

---

## Current Architecture

### Data Model (`src/models/ApiConfiguration.ts`)

```typescript
export interface ApiProduct {
  name: string;
  displayName: string;
  description?: string;
  approvalType: "auto" | "manual";
  attributes?: Array<{ name: string; value: string }>;
  environments: string[];
  operationGroup?: {
    operationConfigs: Array<{
      apiSource: string;
      operations: Array<{ resource: string }>;
      quota?: object;
    }>;
    operationConfigType: "proxy" | "remoteservice";
  };
}

export interface EnvironmentConfig {
  name: string;
  targetServers: TargetServer[];
  apiProducts: ApiProduct[];  // Already supports array but only first element is used
  // ...
}
```

### Current Product Generation (`src/store/useProjectStore.ts`)

The `createDefaultEnvironmentConfig` function creates a single product with default paths:
- Product name: `{proxyName}.{env}`
- Operations are generated in `ConfigGenerator.ts` using `extractPathPrefixes()`

### Path Extraction (`src/utils/stringUtils.ts`)

```typescript
export function extractPathPrefixes(paths: string[]): string[] {
  // Extracts first segment: /api/Cases -> /api
  // Returns unique prefixes
}
```

### UI Component (`src/components/Cards/ApiProductCard.tsx`)

Currently displays only `apiProducts[0]` and has no UI for managing multiple products.

---

## Implementation Requirements

### 1. Enhanced Data Model

#### New Interface for Resource Group

```typescript
// src/models/ApiConfiguration.ts

export interface ResourceGroup {
  id: string;                    // UUID for React key
  pathPrefix: string;            // e.g., "/api/Cases"
  authorizedPaths: string[];     // e.g., ["/api/Cases", "/api/Cases/**"]
}

export interface ApiProduct {
  // ... existing fields ...
  resourceGroups?: ResourceGroup[];  // NEW: For multi-product mode
}
```

#### Configuration Mode Flag

```typescript
// Add to ApiConfiguration
productsMode: 'single' | 'multi';  // Default: 'single'
```

### 2. Default Behavior

When `productsMode === 'single'` (default):
- Create ONE product per environment
- `authorizedPaths`: `["/", "/**"]`
- These paths should be editable in the UI

### 3. Path Analysis Service

Create a new utility to analyze OpenAPI paths and suggest product groupings:

```typescript
// src/utils/pathAnalyzer.ts

export interface PathGroup {
  prefix: string;           // e.g., "/api/Cases"
  paths: string[];          // All paths under this prefix
  methods: string[];        // HTTP methods used
  suggestedProductName: string;  // e.g., "cases"
}

export function analyzePathsForProducts(paths: PathInfo[]): PathGroup[] {
  // Group paths by their second segment (after /api, /v1, etc.)
  // Example: /api/Cases/*, /api/Auth/* -> 2 groups
}

export function suggestProductsFromPaths(
  paths: PathInfo[],
  baseProductName: string
): SuggestedProduct[] {
  // Returns suggested products with names and paths
}
```

### 4. Store Updates (`src/store/useProjectStore.ts`)

#### New Actions

```typescript
interface ProjectState {
  // ... existing ...

  // Product management actions
  addProduct: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', product: ApiProduct) => void;
  removeProduct: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', productIndex: number) => void;
  updateProduct: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', productIndex: number, updates: Partial<ApiProduct>) => void;

  // Multi-product mode
  setProductsMode: (mode: 'single' | 'multi') => void;
  generateProductsFromPaths: () => void;  // Auto-generate products from OpenAPI paths

  // Sync products across environments
  syncProductsToAllEnvironments: () => void;
}
```

#### Product Synchronization Logic

When adding/updating a product in one environment, optionally sync to all environments:
- Keep product structure (name suffix changes per env)
- Product name pattern: `{baseProductName}.{env}` (prod: no suffix)

### 5. UI Components

#### 5.1 Enhanced ApiProductCard (`src/components/Cards/ApiProductCard.tsx`)

**Collapsed View**:
- Show count of products per environment
- Summary table with product names

**Expanded View**:
- Mode toggle: "Single Product" / "Multiple Products"
- Product list with add/remove capabilities
- For each product:
  - Name (auto-generated, editable)
  - Display Name
  - Description
  - Authorized Paths (editable tag list)
  - Approval Type
  - Access Level

**Mockup Structure**:

```
┌─────────────────────────────────────────────────────────────────┐
│ 03  API Products                                    [75%] [▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Mode: ○ Single Product  ● Multiple Products                   │
│                                                                 │
│  [DEV1] [UAT1] [STAGING] [PROD1]                               │
│  ════════════════════════════════                               │
│                                                                 │
│  ┌─ Product 1 ─────────────────────────────────────────── [✕] ┐│
│  │ Name: elis.finance.sap.cases.v1.dev1          ✨            ││
│  │ Display: cases-v1-dev                         ✨            ││
│  │ Description: API Product for Cases...                       ││
│  │ Authorized Paths:                                           ││
│  │   [/api/Cases ✕] [/api/Cases/** ✕] [+ Add]                 ││
│  │ Approval: [Auto ▼]  Access: [Private ▼]                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ Product 2 ─────────────────────────────────────────── [✕] ┐│
│  │ Name: elis.finance.sap.auth.v1.dev1           ✨            ││
│  │ Display: auth-v1-dev                          ✨            ││
│  │ Authorized Paths:                                           ││
│  │   [/api/Auth ✕] [/api/Auth/** ✕] [+ Add]                   ││
│  │ Approval: [Manual ▼]  Access: [Private ▼]                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [+ Add Product]  [Auto-generate from OpenAPI]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.2 Authorized Paths Editor Component

Create a reusable component for editing authorized paths:

```typescript
// src/components/Cards/AuthorizedPathsEditor.tsx

interface AuthorizedPathsEditorProps {
  paths: string[];
  onChange: (paths: string[]) => void;
  suggestedPaths?: string[];  // From OpenAPI analysis
  disabled?: boolean;
}
```

Features:
- Tag-style display of paths
- Add new path with autocomplete from OpenAPI paths
- Remove paths
- Default paths: `/` and `/**`
- Validation (must start with `/`)

#### 5.3 Product Suggestions Modal

When clicking "Auto-generate from OpenAPI":

```typescript
// src/components/Modals/ProductSuggestionsModal.tsx

interface ProductSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SuggestedProduct[];
  onApply: (selectedProducts: SuggestedProduct[]) => void;
}
```

Display:
- List of suggested products based on path analysis
- Checkboxes to select which to create
- Preview of paths for each product
- "Apply Selected" button

### 6. Generator Updates

#### ConfigGenerator (`src/services/generators/ConfigGenerator.ts`)

Update `generateEdgeOrgJson` to handle multiple products:

```typescript
generateEdgeOrgJson(env: string, envConfig: EnvironmentConfig): object {
  return {
    // ...
    orgConfig: {
      apiProducts: envConfig.apiProducts.map(product => ({
        name: product.name,
        displayName: product.displayName,
        description: product.description,
        approvalType: product.approvalType,
        attributes: product.attributes,
        environments: product.environments,
        operationGroup: this.generateOperationGroupForProduct(product),
      })),
      // ...
    }
  };
}

private generateOperationGroupForProduct(product: ApiProduct): object {
  // If product has explicit authorizedPaths, use them
  // Otherwise, generate from OpenAPI paths
  const operations = product.resourceGroups?.length
    ? product.resourceGroups.flatMap(rg => rg.authorizedPaths.map(p => ({ resource: p })))
    : this.extractOperationsFromOpenAPI();

  return {
    operationConfigs: operations.map(op => ({
      apiSource: this.config.proxyName,
      operations: [op]
    })),
    operationConfigType: "proxy"
  };
}
```

### 7. Product Naming Convention

#### Single Mode
- Name: `{proxyName}.{env}` (prod: no suffix)
- Display: `{businessObject}-{version}-{env}`

#### Multi Mode
- Name: `{proxyName}.{resourceSuffix}.{env}`
  - Example: `elis.finance.sap.invoice.v1.cases.dev1`
- Display: `{businessObject}-{resourceSuffix}-{version}-{env}`
  - Example: `invoice-cases-v1-dev`

The `resourceSuffix` is derived from the path prefix:
- `/api/Cases` -> `cases`
- `/api/Auth` -> `auth`
- `/v1/customers` -> `customers`

### 8. Translation Keys

Add to `src/locales/en.json`:

```json
{
  "canvas.cards.apiProduct": {
    "title": "API Products",
    "subtitle": "Product configuration per environment",
    "mode": "Mode",
    "singleProduct": "Single Product",
    "multipleProducts": "Multiple Products",
    "addProduct": "Add Product",
    "autoGenerate": "Auto-generate from OpenAPI",
    "authorizedPaths": "Authorized Paths",
    "addPath": "Add Path",
    "pathPlaceholder": "e.g., /api/resource/**",
    "suggestionsModal": {
      "title": "Suggested Products",
      "description": "Based on your OpenAPI specification, we suggest the following products:",
      "applySelected": "Apply Selected",
      "selectAll": "Select All",
      "paths": "Paths"
    }
  }
}
```

---

## Implementation Steps

### Phase 1: Core Infrastructure

1. **Update Data Model**
   - Add `ResourceGroup` interface
   - Add `productsMode` to `ApiConfiguration`
   - Update `ApiProduct` with `resourceGroups`

2. **Create Path Analyzer Utility**
   - `src/utils/pathAnalyzer.ts`
   - Functions for grouping paths and suggesting products

3. **Update Store**
   - Add product management actions
   - Add mode toggle action
   - Implement `generateProductsFromPaths`

### Phase 2: UI Components

4. **Create AuthorizedPathsEditor Component**
   - Tag-based path editing
   - Autocomplete from OpenAPI paths
   - Validation

5. **Update ApiProductCard**
   - Mode toggle (single/multi)
   - Support for multiple products display
   - Add/remove product buttons
   - Integrate AuthorizedPathsEditor

6. **Create ProductSuggestionsModal**
   - Display path analysis results
   - Allow selection of products to create

### Phase 3: Generation & Polish

7. **Update ConfigGenerator**
   - Handle multiple products in edge-org.json
   - Generate correct operationGroups per product

8. **Testing & Edge Cases**
   - Empty paths handling
   - Single path OpenAPI specs
   - Complex nested paths
   - Environment synchronization

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/models/ApiConfiguration.ts` | Modify | Add `ResourceGroup`, update `ApiProduct` |
| `src/utils/pathAnalyzer.ts` | Create | Path grouping and product suggestions |
| `src/store/useProjectStore.ts` | Modify | Add product management actions |
| `src/components/Cards/ApiProductCard.tsx` | Major Rewrite | Multi-product UI |
| `src/components/Cards/AuthorizedPathsEditor.tsx` | Create | Reusable path editor |
| `src/components/Modals/ProductSuggestionsModal.tsx` | Create | Product suggestions UI |
| `src/services/generators/ConfigGenerator.ts` | Modify | Multi-product generation |
| `src/locales/en.json` | Modify | Add translation keys |
| `src/locales/fr.json` | Modify | Add French translations |

---

## Acceptance Criteria

1. **Default Behavior**: By default, ONE product is created per environment with paths `/` and `/**`
2. **Editable Paths**: Users can edit the authorized paths in single product mode
3. **Multi-Product Mode**: Users can switch to multi-product mode
4. **Auto-Generation**: System can analyze OpenAPI paths and suggest product groupings
5. **Manual Creation**: Users can manually add/remove products
6. **Path Validation**: Paths must start with `/` and support wildcards
7. **Environment Sync**: Products can be synced across all environments
8. **Generation**: `edge-org.json` correctly includes all products with their operation groups
9. **UX**: Intuitive interface following existing Swiss design patterns

---

## Technical Notes

### Path Wildcards in Apigee

Apigee supports these wildcard patterns in operation resources:
- `/path` - Exact match
- `/path/*` - Single segment wildcard
- `/path/**` - Multi-segment wildcard

### Product Name Constraints

Apigee product names must:
- Be unique within the organization
- Contain only alphanumeric characters, dots, hyphens, and underscores
- Not exceed 255 characters

### Operation Groups

Each product should have ONE operationGroup with multiple operationConfigs:
```json
{
  "operationGroup": {
    "operationConfigs": [
      { "apiSource": "proxy-name", "operations": [{ "resource": "/api/Cases" }] },
      { "apiSource": "proxy-name", "operations": [{ "resource": "/api/Cases/**" }] }
    ],
    "operationConfigType": "proxy"
  }
}
```
