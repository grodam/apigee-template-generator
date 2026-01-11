/**
 * Auto-detected configuration from OpenAPI specification
 * These values are extracted from the spec and used to pre-fill the configuration form
 */

import type { BackendInfoEntry, VariabilizationResult } from '../utils/urlVariabilizer';

// Re-export for convenience
export type { BackendInfoEntry, VariabilizationResult };

/**
 * Server information extracted from OpenAPI spec
 */
export interface DetectedServer {
  url: string;
  host: string;
  basePath: string;
  scheme: string;
  description?: string;
  environment?: string; // Detected environment (dev, prod, staging, etc.)
}

/**
 * Variabilized base path configuration
 * Used when different environments have different base paths
 */
export interface VariabilizedBasePath {
  // The final target path template with KVM variables
  // e.g., "{private.envid}/api/v1"
  targetPathTemplate: string;

  // The common suffix shared across all environments
  // e.g., "/api/v1"
  commonSuffix: string;

  // KVM variable configurations for each environment
  // Key is the variable name (e.g., "envid"), value is per-environment values
  kvmVariables: {
    variableName: string;
    values: Record<string, string>; // environment -> value (e.g., { dev1: "/dev", prod1: "" })
  }[];
}

/**
 * Detected authentication configuration
 */
export interface DetectedAuth {
  type: 'Basic' | 'OAuth2-ClientCredentials' | 'None';
  securitySchemeName?: string;
  tokenUrl?: string;
  scopes?: string[];
}

/**
 * Host configuration per environment
 */
export interface EnvironmentHostConfig {
  host: string;
  port: number;
  scheme: string;
  basePath: string;
}

/**
 * Complete auto-detected configuration from OpenAPI spec
 */
export interface AutoDetectedConfig {
  // Detected servers per environment
  servers: DetectedServer[];

  // Host mapping per environment (dev1, uat1, staging, prod1)
  environmentHosts: Partial<Record<'dev1' | 'uat1' | 'staging' | 'prod1', EnvironmentHostConfig>>;

  // Detected authentication type
  auth: DetectedAuth;

  // Variabilized base path (when paths differ between environments)
  variabilizedBasePath?: VariabilizedBasePath;

  // Simple target path (when paths are the same across environments)
  targetPath?: string;

  // Whether path variabilization is needed
  hasVariablePath: boolean;

  // API title from spec
  title?: string;

  // API description from spec
  description?: string;

  // API version from spec (e.g., "1.0.0")
  apiVersion?: string;

  // Enhanced URL variabilization result (new backend_info_N format)
  urlVariabilization?: VariabilizationResult;
}

/**
 * Environment detection patterns
 * Used to map server URLs to environments
 */
export const ENVIRONMENT_PATTERNS: Record<string, RegExp[]> = {
  dev1: [/dev/i, /development/i, /sandbox/i],
  uat1: [/uat/i, /test/i, /qa/i],
  staging: [/stag/i, /preprod/i, /pre-prod/i],
  prod1: [/prod/i, /production/i, /live/i],
};

/**
 * Detect environment from URL or description
 */
export function detectEnvironment(url: string, description?: string): string | undefined {
  const textToCheck = `${url} ${description || ''}`.toLowerCase();

  for (const [env, patterns] of Object.entries(ENVIRONMENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(textToCheck)) {
        return env;
      }
    }
  }

  return undefined;
}
