/**
 * URL Variabilizer Utility
 *
 * Handles smart URL variabilization for Apigee proxy configuration:
 * - Case 1: Detect template variables {var} in URLs
 * - Case 2: Compare multiple URLs to find differences
 * - Case 3: Handle mixed scenarios (both templates + differences)
 */

import type { DetectedServer } from '../models/AutoDetectedConfig';

/**
 * Template variable detected in URL
 */
export interface TemplateVariable {
  originalName: string;       // e.g., 'env', 'customer'
  position: number;           // Character position in URL
  context: 'host' | 'path';   // Where the variable appears
  fullMatch: string;          // e.g., '{env}'
}

/**
 * Parsed URL components
 */
export interface ParsedUrl {
  protocol: string;           // 'https' | 'http'
  host: string;               // e.g., 'gis-platform-{env}.generix.biz'
  port?: number;              // e.g., 443
  path: string;               // e.g., '/{customer}/invoice-processing'
  hostVariables: TemplateVariable[];
  pathVariables: TemplateVariable[];
}

/**
 * URL with environment for comparison
 */
export interface UrlWithEnv {
  url: string;
  environment: string;
}

/**
 * Result of comparing multiple URLs
 */
export interface UrlComparisonResult {
  hasHostDifferences: boolean;
  hasPathDifferences: boolean;
  commonHostPrefix: string;
  commonHostSuffix: string;
  commonPathPrefix: string;
  commonPathSuffix: string;
  hostDifferences: Record<string, string>;  // env -> different host
  pathDifferences: Record<string, string>;  // env -> different path part
}

/**
 * Backend info KVM entry
 */
export interface BackendInfoEntry {
  kvmIndex: number;                   // 1, 2, 3...
  variableName: string;               // 'backend_info_1', 'backend_info_2'
  originalName: string;               // 'env', 'customer' or auto-generated
  description: string;                // Human-readable description
  values: Record<string, string>;     // Environment -> value mapping
  isAutoDetected: boolean;            // Whether values were auto-filled
}

/**
 * Complete variabilization result
 */
export interface VariabilizationResult {
  variabilizedHost?: string;          // e.g., 'gis-platform-{private.backend_info_1}.generix.biz'
  variabilizedPath: string;           // e.g., '/{private.backend_info_2}/invoice-processing'
  kvmEntries: BackendInfoEntry[];     // Generated KVM entries
  hostsPerEnvironment: Record<string, string>;  // For Case 2: env -> full host
  hasVariabilization: boolean;        // Whether any variabilization was applied
}

// Regex to match template variables like {varName}
const TEMPLATE_VAR_REGEX = /\{([^}]+)\}/g;

// List of all environments
const ALL_ENVIRONMENTS = ['dev1', 'uat1', 'staging', 'prod1'] as const;

/**
 * Detect all template variables {var} in a URL string
 * Uses manual parsing to preserve template variables that would be URL-encoded
 */
export function detectTemplateVariables(url: string): TemplateVariable[] {
  const variables: TemplateVariable[] = [];

  // Manual parsing to determine host vs path context (preserves template vars)
  let host = '';
  let path = '';

  // Handle relative URLs
  if (url.startsWith('/')) {
    path = url;
  } else {
    // Extract host and path manually
    const protocolMatch = url.match(/^(https?):\/\//);
    const rest = protocolMatch ? url.slice(protocolMatch[0].length) : url;
    const pathStart = rest.indexOf('/');

    if (pathStart >= 0) {
      host = rest.slice(0, pathStart);
      path = rest.slice(pathStart);
    } else {
      host = rest;
      path = '';
    }

    // Remove port from host for variable detection
    const portMatch = host.match(/:(\d+)$/);
    if (portMatch) {
      host = host.slice(0, -portMatch[0].length);
    }
  }

  // Find variables in host
  let match;
  const hostRegex = new RegExp(TEMPLATE_VAR_REGEX.source, 'g');
  while ((match = hostRegex.exec(host)) !== null) {
    variables.push({
      originalName: match[1],
      position: match.index,
      context: 'host',
      fullMatch: match[0],
    });
  }

  // Find variables in path
  const pathRegex = new RegExp(TEMPLATE_VAR_REGEX.source, 'g');
  while ((match = pathRegex.exec(path)) !== null) {
    variables.push({
      originalName: match[1],
      position: match.index,
      context: 'path',
      fullMatch: match[0],
    });
  }

  return variables;
}

/**
 * Parse a URL into its components including template variables
 * Note: We manually parse to preserve template variables like {env} that would
 * otherwise be URL-encoded by the URL API
 */
export function parseUrl(url: string): ParsedUrl {
  let protocol = 'https';
  let host = '';
  let port: number | undefined;
  let path = '/';

  // Handle relative URLs
  if (url.startsWith('/')) {
    return {
      protocol,
      host: '',
      path: url,
      hostVariables: [],
      pathVariables: detectTemplateVariables(url).filter(v => v.context === 'path'),
    };
  }

  // Manual parsing to preserve template variables (URL API would encode them)
  const protocolMatch = url.match(/^(https?):\/\//);
  if (protocolMatch) {
    protocol = protocolMatch[1];
    const rest = url.slice(protocolMatch[0].length);
    const pathStart = rest.indexOf('/');
    if (pathStart >= 0) {
      const hostPart = rest.slice(0, pathStart);
      path = rest.slice(pathStart);

      // Extract port if present
      const portMatch = hostPart.match(/:(\d+)$/);
      if (portMatch) {
        host = hostPart.slice(0, -portMatch[0].length);
        port = parseInt(portMatch[1], 10);
      } else {
        host = hostPart;
      }
    } else {
      // No path, check for port
      const portMatch = rest.match(/:(\d+)$/);
      if (portMatch) {
        host = rest.slice(0, -portMatch[0].length);
        port = parseInt(portMatch[1], 10);
      } else {
        host = rest;
      }
    }
  } else if (!url.includes('://')) {
    // URL without protocol - parse directly
    const pathStart = url.indexOf('/');
    if (pathStart >= 0) {
      const hostPart = url.slice(0, pathStart);
      path = url.slice(pathStart);

      const portMatch = hostPart.match(/:(\d+)$/);
      if (portMatch) {
        host = hostPart.slice(0, -portMatch[0].length);
        port = parseInt(portMatch[1], 10);
      } else {
        host = hostPart;
      }
    } else {
      const portMatch = url.match(/:(\d+)$/);
      if (portMatch) {
        host = url.slice(0, -portMatch[0].length);
        port = parseInt(portMatch[1], 10);
      } else {
        host = url;
      }
    }
  }

  const allVariables = detectTemplateVariables(url);

  return {
    protocol,
    host,
    port,
    path,
    hostVariables: allVariables.filter(v => v.context === 'host'),
    pathVariables: allVariables.filter(v => v.context === 'path'),
  };
}

/**
 * Find common prefix between multiple strings
 */
function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];

  let prefix = '';
  const minLen = Math.min(...strings.map(s => s.length));

  for (let i = 0; i < minLen; i++) {
    const char = strings[0][i];
    if (strings.every(s => s[i] === char)) {
      prefix += char;
    } else {
      break;
    }
  }

  return prefix;
}

/**
 * Find common suffix between multiple strings
 */
function findCommonSuffix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return '';

  const reversed = strings.map(s => s.split('').reverse().join(''));
  const reversedPrefix = findCommonPrefix(reversed);
  return reversedPrefix.split('').reverse().join('');
}

/**
 * Compare multiple URLs to find differences
 */
export function compareUrls(urls: UrlWithEnv[]): UrlComparisonResult {
  const result: UrlComparisonResult = {
    hasHostDifferences: false,
    hasPathDifferences: false,
    commonHostPrefix: '',
    commonHostSuffix: '',
    commonPathPrefix: '',
    commonPathSuffix: '',
    hostDifferences: {},
    pathDifferences: {},
  };

  if (urls.length === 0) return result;

  const parsed = urls.map(u => ({
    ...parseUrl(u.url),
    environment: u.environment,
  }));

  const hosts = parsed.map(p => p.host);
  const paths = parsed.map(p => p.path);

  // Check for host differences
  const uniqueHosts = [...new Set(hosts)];
  result.hasHostDifferences = uniqueHosts.length > 1;

  if (result.hasHostDifferences) {
    result.commonHostPrefix = findCommonPrefix(hosts);
    result.commonHostSuffix = findCommonSuffix(hosts);

    // Store full hosts for each environment
    for (const p of parsed) {
      result.hostDifferences[p.environment] = p.host;
    }
  }

  // Check for path differences
  const uniquePaths = [...new Set(paths)];
  result.hasPathDifferences = uniquePaths.length > 1;

  if (result.hasPathDifferences) {
    result.commonPathPrefix = findCommonPrefix(paths);
    result.commonPathSuffix = findCommonSuffix(paths);

    // Extract different parts for each environment
    for (const p of parsed) {
      const prefixLen = result.commonPathPrefix.length;
      const suffixLen = result.commonPathSuffix.length;
      const differentPart = p.path.slice(
        prefixLen,
        p.path.length - suffixLen || undefined
      );
      result.pathDifferences[p.environment] = differentPart;
    }
  }

  return result;
}

/**
 * Replace template variable with KVM reference
 */
function replaceWithKvmReference(text: string, originalName: string, kvmIndex: number): string {
  const pattern = new RegExp(`\\{${escapeRegex(originalName)}\\}`, 'g');
  return text.replace(pattern, `{private.backend_info_${kvmIndex}}`);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect environment from URL or description
 */
function detectEnvironmentFromUrl(url: string, description?: string): string {
  const textToCheck = `${url} ${description || ''}`.toLowerCase();

  const patterns: Record<string, RegExp[]> = {
    dev1: [/dev/i, /development/i, /sandbox/i],
    uat1: [/uat/i, /test/i, /qa/i],
    staging: [/stag/i, /preprod/i, /pre-prod/i],
    prod1: [/prod/i, /production/i, /live/i],
  };

  for (const [env, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      if (regex.test(textToCheck)) {
        return env;
      }
    }
  }

  return 'dev1'; // Default to dev1 if no pattern matches
}

/**
 * Main variabilization function - handles all three cases
 */
export function variabilizeUrls(
  servers: DetectedServer[],
  startingKvmIndex: number = 1
): VariabilizationResult {
  const result: VariabilizationResult = {
    variabilizedPath: '/',
    kvmEntries: [],
    hostsPerEnvironment: {},
    hasVariabilization: false,
  };

  if (servers.length === 0) {
    return result;
  }

  let currentKvmIndex = startingKvmIndex;

  // Get the first server's parsed URL as base
  const firstServer = servers[0];
  const firstParsed = parseUrl(firstServer.url);

  // Collect all template variables from all servers
  const allHostVariables = new Map<string, TemplateVariable>();
  const allPathVariables = new Map<string, TemplateVariable>();

  for (const server of servers) {
    const parsed = parseUrl(server.url);
    for (const v of parsed.hostVariables) {
      allHostVariables.set(v.originalName, v);
    }
    for (const v of parsed.pathVariables) {
      allPathVariables.set(v.originalName, v);
    }
  }

  const hasTemplateVariables = allHostVariables.size > 0 || allPathVariables.size > 0;

  // Case 1 & 3: Handle template variables
  if (hasTemplateVariables) {
    result.hasVariabilization = true;

    // Process host variables
    let variabilizedHost = firstParsed.host;
    for (const varName of allHostVariables.keys()) {
      result.kvmEntries.push({
        kvmIndex: currentKvmIndex,
        variableName: `backend_info_${currentKvmIndex}`,
        originalName: varName,
        description: `${varName} (from URL template in host)`,
        values: createEmptyEnvValues(),
        isAutoDetected: false,
      });
      variabilizedHost = replaceWithKvmReference(variabilizedHost, varName, currentKvmIndex);
      currentKvmIndex++;
    }
    if (allHostVariables.size > 0) {
      result.variabilizedHost = variabilizedHost;
      // Set the variabilized host for all environments
      for (const env of ALL_ENVIRONMENTS) {
        result.hostsPerEnvironment[env] = variabilizedHost;
      }
    }

    // Process path variables
    let variabilizedPath = firstParsed.path;
    for (const varName of allPathVariables.keys()) {
      result.kvmEntries.push({
        kvmIndex: currentKvmIndex,
        variableName: `backend_info_${currentKvmIndex}`,
        originalName: varName,
        description: `${varName} (from URL template in path)`,
        values: createEmptyEnvValues(),
        isAutoDetected: false,
      });
      variabilizedPath = replaceWithKvmReference(variabilizedPath, varName, currentKvmIndex);
      currentKvmIndex++;
    }
    result.variabilizedPath = variabilizedPath || '/';
  }

  // Case 2 & 3: Compare URLs for differences (if multiple servers and no template vars OR mixed)
  if (servers.length > 1) {
    const urlsWithEnv: UrlWithEnv[] = servers.map(s => ({
      url: s.url,
      environment: s.environment || detectEnvironmentFromUrl(s.url, s.description),
    }));

    const comparison = compareUrls(urlsWithEnv);

    // Handle host differences - store per-environment hosts (no KVM for hosts)
    if (comparison.hasHostDifferences) {
      result.hasVariabilization = true;

      // Map hosts to environments
      for (const server of servers) {
        const env = server.environment || detectEnvironmentFromUrl(server.url, server.description);
        const parsed = parseUrl(server.url);
        result.hostsPerEnvironment[env] = parsed.host;
      }

      // Fill in missing environments using smart defaults
      fillMissingEnvironmentHosts(result.hostsPerEnvironment, servers);

      // If paths are the same across all servers, use the common path
      if (!comparison.hasPathDifferences && !hasTemplateVariables) {
        result.variabilizedPath = firstParsed.path || '/';
      }
    }

    // Handle path differences (only if no template variables already handled paths)
    if (comparison.hasPathDifferences && !hasTemplateVariables) {
      result.hasVariabilization = true;

      // Create KVM entry for path variable part
      const pathValues: Record<string, string> = {};
      for (const [env, diffPart] of Object.entries(comparison.pathDifferences)) {
        pathValues[env] = diffPart;
      }

      // Fill missing environments
      fillMissingEnvironmentValues(pathValues);

      result.kvmEntries.push({
        kvmIndex: currentKvmIndex,
        variableName: `backend_info_${currentKvmIndex}`,
        originalName: 'path_segment',
        description: 'Environment-specific path segment',
        values: pathValues,
        isAutoDetected: true,
      });

      // Build variabilized path
      result.variabilizedPath = `${comparison.commonPathPrefix}{private.backend_info_${currentKvmIndex}}${comparison.commonPathSuffix}`;
      currentKvmIndex++;
    }
  }

  // If no variabilization needed, use the first server's path
  if (!result.hasVariabilization && servers.length > 0) {
    result.variabilizedPath = firstParsed.path || '/';

    // Still fill hosts per environment for consistency
    for (const server of servers) {
      const env = server.environment || detectEnvironmentFromUrl(server.url, server.description);
      result.hostsPerEnvironment[env] = parseUrl(server.url).host;
    }
    fillMissingEnvironmentHosts(result.hostsPerEnvironment, servers);
  }

  return result;
}

/**
 * Create empty values for all environments
 */
function createEmptyEnvValues(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const env of ALL_ENVIRONMENTS) {
    values[env] = '';
  }
  return values;
}

/**
 * Fill missing environment hosts using smart defaults
 */
function fillMissingEnvironmentHosts(
  hostsPerEnv: Record<string, string>,
  servers: DetectedServer[]
): void {
  // Find prod and non-prod hosts
  let prodHost = hostsPerEnv.prod1 || '';
  let nonProdHost = '';

  for (const server of servers) {
    const env = server.environment || detectEnvironmentFromUrl(server.url, server.description);
    const host = parseUrl(server.url).host;

    if (env === 'prod1' || env.includes('prod')) {
      prodHost = host;
    } else if (!nonProdHost) {
      nonProdHost = host;
    }
  }

  // Fill missing environments
  for (const env of ALL_ENVIRONMENTS) {
    if (!hostsPerEnv[env]) {
      hostsPerEnv[env] = env === 'prod1' ? (prodHost || nonProdHost) : (nonProdHost || prodHost);
    }
  }
}

/**
 * Fill missing environment values using smart defaults
 */
function fillMissingEnvironmentValues(
  values: Record<string, string>
): void {
  // Find prod and non-prod values
  let prodValue = values.prod1 || '';
  let nonProdValue = '';

  for (const [env, value] of Object.entries(values)) {
    if (env === 'prod1' || env.includes('prod')) {
      prodValue = value;
    } else if (!nonProdValue && value) {
      nonProdValue = value;
    }
  }

  // Fill missing environments
  for (const env of ALL_ENVIRONMENTS) {
    if (!values[env]) {
      values[env] = env === 'prod1' ? prodValue : nonProdValue;
    }
  }
}

