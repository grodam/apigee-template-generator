/**
 * Path Analyzer Utility
 *
 * Analyzes OpenAPI paths and suggests product groupings for multi-product mode.
 * Groups paths by their logical prefixes to enable fine-grained access control.
 */

import type { ApiProduct, ResourceGroup } from '../models/ApiConfiguration';

/**
 * Represents a grouped set of paths under a common prefix
 */
export interface PathGroup {
  prefix: string;           // e.g., "/api/Cases"
  paths: string[];          // All paths under this prefix
  methods: string[];        // HTTP methods used
  suggestedProductName: string;  // e.g., "cases"
}

/**
 * Represents a suggested product configuration
 */
export interface SuggestedProduct {
  id: string;               // UUID for React key
  name: string;             // e.g., "cases"
  displayName: string;      // e.g., "Cases API"
  pathPrefix: string;       // e.g., "/api/Cases"
  authorizedPaths: string[];  // e.g., ["/api/Cases", "/api/Cases/**"]
  paths: string[];          // Original paths that belong to this group
  methods: string[];        // HTTP methods used
  selected: boolean;        // Whether selected for creation
}

/**
 * Info about a path from OpenAPI spec
 */
export interface PathInfo {
  path: string;
  methods: string[];
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Extract the grouping prefix from a path.
 * This identifies the "resource" level of the path, typically the second segment.
 *
 * Examples:
 * - /api/Cases -> /api/Cases
 * - /api/Cases/{id} -> /api/Cases
 * - /v1/customers -> /v1/customers
 * - /v1/customers/{id}/orders -> /v1/customers
 */
export function extractGroupPrefix(path: string): string {
  const parts = path.split('/').filter(p => p && !p.startsWith('{'));

  if (parts.length === 0) return '/';
  if (parts.length === 1) return '/' + parts[0];

  // Return first two non-parameter segments
  return '/' + parts.slice(0, 2).join('/');
}

/**
 * Extract a clean resource name from a path prefix for use in product naming.
 *
 * Examples:
 * - /api/Cases -> cases
 * - /v1/customers -> customers
 * - /auth/login -> auth
 */
export function extractResourceName(pathPrefix: string): string {
  const parts = pathPrefix.split('/').filter(p => p);

  if (parts.length === 0) return 'root';

  // Take the last meaningful segment (skip api, v1, v2, etc.)
  const skipPrefixes = ['api', 'v1', 'v2', 'v3', 'rest'];
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].toLowerCase();
    if (!skipPrefixes.includes(part) && !part.startsWith('v')) {
      return part.toLowerCase();
    }
  }

  // Fallback to first non-version segment
  return (parts.find(p => !skipPrefixes.includes(p.toLowerCase())) || parts[0]).toLowerCase();
}

/**
 * Analyze paths and group them by their logical prefixes.
 */
export function analyzePathsForProducts(paths: PathInfo[]): PathGroup[] {
  const groups = new Map<string, PathGroup>();

  for (const pathInfo of paths) {
    const prefix = extractGroupPrefix(pathInfo.path);

    if (!groups.has(prefix)) {
      groups.set(prefix, {
        prefix,
        paths: [],
        methods: [],
        suggestedProductName: extractResourceName(prefix)
      });
    }

    const group = groups.get(prefix)!;
    group.paths.push(pathInfo.path);

    // Add methods, avoiding duplicates
    for (const method of pathInfo.methods) {
      if (!group.methods.includes(method)) {
        group.methods.push(method);
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.prefix.localeCompare(b.prefix));
}

/**
 * Generate suggested products from analyzed path groups.
 * Handles duplicate names by adding an incremental index (e.g., cases1, cases2).
 *
 * @param paths - Array of path info from OpenAPI spec
 * @param baseProductName - Base name for products (e.g., "elis.finance.sap.invoice.v1")
 */
export function suggestProductsFromPaths(
  paths: PathInfo[],
  baseProductName: string
): SuggestedProduct[] {
  const groups = analyzePathsForProducts(paths);

  // Track name occurrences to handle duplicates (case-insensitive comparison)
  const nameCount = new Map<string, number>();
  const nameOccurrences = new Map<string, number>();

  // First pass: count how many times each name appears (case-insensitive)
  for (const group of groups) {
    const lowerName = group.suggestedProductName.toLowerCase();
    nameCount.set(lowerName, (nameCount.get(lowerName) || 0) + 1);
  }

  // Second pass: generate products with indexed names for duplicates
  return groups.map(group => {
    const baseName = group.suggestedProductName;
    const lowerName = baseName.toLowerCase();
    const totalOccurrences = nameCount.get(lowerName) || 1;

    let finalName = baseName;
    let finalDisplayName = formatDisplayName(baseName);

    // If there are duplicates, add an index
    if (totalOccurrences > 1) {
      const currentIndex = (nameOccurrences.get(lowerName) || 0) + 1;
      nameOccurrences.set(lowerName, currentIndex);
      finalName = `${baseName}${currentIndex}`;
      finalDisplayName = `${formatDisplayName(baseName)} ${currentIndex}`;
    }

    return {
      id: generateUUID(),
      name: finalName,
      displayName: finalDisplayName,
      pathPrefix: group.prefix,
      authorizedPaths: [group.prefix, `${group.prefix}/**`],
      paths: group.paths,
      methods: group.methods,
      selected: true
    };
  });
}

/**
 * Format a resource name into a display-friendly format.
 *
 * Examples:
 * - cases -> Cases
 * - user-accounts -> User Accounts
 */
function formatDisplayName(resourceName: string): string {
  return resourceName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Find the smallest common root path from a list of paths.
 * This extracts the longest common prefix shared by all paths.
 *
 * Examples:
 * - ["/api/v1/users", "/api/v1/orders"] -> "/api/v1"
 * - ["/DebtCollection/cases", "/DebtCollection/payments"] -> "/DebtCollection"
 * - ["/users", "/orders"] -> "/"
 */
export function findSmallestCommonRoot(paths: string[]): string {
  if (!paths || paths.length === 0) return '/';

  // Normalize paths: ensure they start with /
  const normalizedPaths = paths.map(p => p.startsWith('/') ? p : '/' + p);

  if (normalizedPaths.length === 1) {
    // For single path, extract the first segment as the root
    const parts = normalizedPaths[0].split('/').filter(p => p && !p.startsWith('{'));
    if (parts.length === 0) return '/';
    return '/' + parts[0];
  }

  // Split all paths into segments
  const splitPaths = normalizedPaths.map(p => p.split('/').filter(segment => segment !== ''));

  // Find common prefix segments
  const commonSegments: string[] = [];
  const minLength = Math.min(...splitPaths.map(p => p.length));

  for (let i = 0; i < minLength; i++) {
    const segment = splitPaths[0][i];

    // Skip path parameters like {id}
    if (segment.startsWith('{')) break;

    // Check if all paths have the same segment at this position
    const allMatch = splitPaths.every(p => p[i] === segment);
    if (allMatch) {
      commonSegments.push(segment);
    } else {
      break;
    }
  }

  if (commonSegments.length === 0) return '/';
  return '/' + commonSegments.join('/');
}

/**
 * Create default authorized paths for single product mode.
 * If paths are provided, uses the smallest common root.
 * Otherwise, falls back to "/" and "/**".
 */
export function getDefaultAuthorizedPaths(paths?: string[]): string[] {
  if (!paths || paths.length === 0) {
    return ['/', '/**'];
  }

  const commonRoot = findSmallestCommonRoot(paths);
  if (commonRoot === '/') {
    return ['/', '/**'];
  }

  return [commonRoot, `${commonRoot}/**`];
}

/**
 * Create a new empty product for the given environment.
 *
 * @param proxyName - Full proxy name for product naming
 * @param resourceSuffix - Resource suffix for multi-product naming (e.g., "cases")
 * @param env - Environment name
 * @param authorizedPaths - Authorized paths for the product
 * @param openAPIPaths - Optional OpenAPI paths to derive default authorized paths
 */
export function createProductForEnv(
  proxyName: string,
  resourceSuffix: string | null,
  env: string,
  authorizedPaths?: string[],
  openAPIPaths?: string[]
): ApiProduct {
  // Use provided authorizedPaths, or compute from OpenAPI paths, or use default
  const resolvedPaths = authorizedPaths || getDefaultAuthorizedPaths(openAPIPaths);
  const envSuffix = getEnvSuffix(env);

  // Product name: proxyName.resourceSuffix.env (or proxyName.env for single mode)
  const productName = resourceSuffix
    ? `${proxyName}.${resourceSuffix}${envSuffix}`
    : `${proxyName}${envSuffix}`;

  // Display name: resourceSuffix-version-env (or businessObject-version-env for single mode)
  const displaySuffix = resourceSuffix || extractBusinessObject(proxyName);
  const displayName = `${displaySuffix}-${extractVersion(proxyName)}${envSuffix.replace('.', '-')}`;

  return {
    name: productName,
    displayName,
    description: resourceSuffix
      ? `API Product for ${resourceSuffix} operations - ${env}`
      : `API Product for ${proxyName} - ${env}`,
    approvalType: 'manual',
    environments: [env],
    authorizedPaths: resolvedPaths,
    attributes: [{ name: 'access', value: 'private' }]
  };
}

/**
 * Create products for all environments from a suggestion.
 */
export function createProductsFromSuggestion(
  suggestion: SuggestedProduct,
  proxyName: string,
  environments: string[]
): Map<string, ApiProduct> {
  const products = new Map<string, ApiProduct>();

  for (const env of environments) {
    products.set(env, createProductForEnv(
      proxyName,
      suggestion.name,
      env,
      suggestion.authorizedPaths
    ));
  }

  return products;
}

/**
 * Get the environment suffix for product naming.
 * - prod/prod1: no suffix
 * - staging: .stg
 * - others: normalized env name
 */
function getEnvSuffix(env: string): string {
  const normalized = env.replace(/1$/, '');
  if (normalized === 'prod') return '';
  if (normalized === 'staging') return '.stg';
  return `.${normalized}`;
}

/**
 * Extract business object from proxy name.
 */
function extractBusinessObject(proxyName: string): string {
  const parts = proxyName.split('.');
  return parts.length >= 4 ? parts[parts.length - 2] : parts[0];
}

/**
 * Extract version from proxy name.
 */
function extractVersion(proxyName: string): string {
  const parts = proxyName.split('.');
  return parts.length >= 5 ? parts[parts.length - 1] : 'v1';
}

/**
 * Validate that a path is in valid format.
 * - Must start with /
 * - Can contain wildcards (* and **)
 */
export function isValidPath(path: string): boolean {
  if (!path || !path.startsWith('/')) return false;
  // Allow alphanumeric, /, -, _, {}, *, .
  return /^[a-zA-Z0-9\/\-_{}*.\s]+$/.test(path);
}

/**
 * Normalize a path for comparison.
 */
export function normalizePath(path: string): string {
  // Remove trailing slashes
  let normalized = path.replace(/\/+$/, '');
  // Ensure starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized || '/';
}

/**
 * Create a ResourceGroup from a path prefix.
 */
export function createResourceGroup(pathPrefix: string): ResourceGroup {
  const normalizedPrefix = normalizePath(pathPrefix);
  return {
    id: generateUUID(),
    pathPrefix: normalizedPrefix,
    authorizedPaths: [normalizedPrefix, `${normalizedPrefix}/**`]
  };
}

/**
 * Generate unique product ID.
 */
export function generateProductId(): string {
  return generateUUID();
}
