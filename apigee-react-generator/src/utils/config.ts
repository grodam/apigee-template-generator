/**
 * Application Configuration
 *
 * Centralized configuration using environment variables.
 * All environment variables should be accessed through this module.
 */

interface AppConfig {
  // Proxy server URL for Azure DevOps API calls
  proxyUrl: string;

  // Development mode
  isDev: boolean;

  // Application version
  version: string;
}

/**
 * Get configuration from environment variables with defaults
 */
function loadConfig(): AppConfig {
  return {
    proxyUrl: import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/api/azure-devops-proxy',
    isDev: import.meta.env.DEV,
    version: import.meta.env.VITE_APP_VERSION || '2.0.0',
  };
}

// Export singleton config
export const config = loadConfig();

// Export type
export type { AppConfig };
