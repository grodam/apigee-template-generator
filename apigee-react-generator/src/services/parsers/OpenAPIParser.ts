import SwaggerParser from '@apidevtools/swagger-parser';
import * as YAML from 'js-yaml';
import type { ParsedOpenAPI, PathInfo } from '../../models/OpenAPISpec';
import type { OpenAPIDocument, OpenAPIPathItem, OpenAPIOperation, HttpMethod, OpenAPISecurityScheme } from '../../types/openapi';
import { getOpenAPIVersion, getSecuritySchemes, isOpenAPI3, isSwagger2 } from '../../types/openapi';
import type { AutoDetectedConfig, DetectedServer, DetectedAuth, EnvironmentHostConfig, VariabilizedBasePath } from '../../models/AutoDetectedConfig';
import { detectEnvironment } from '../../models/AutoDetectedConfig';
import { logger } from '../../utils/logger';

const log = logger.scope('OpenAPIParser');

const SUPPORTED_METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

export class OpenAPIParserService {
  async parse(spec: string, format: 'json' | 'yaml'): Promise<ParsedOpenAPI> {
    try {
      const parsedSpec = format === 'json' ? JSON.parse(spec) : YAML.load(spec);
      const api = await SwaggerParser.validate(parsedSpec) as unknown as OpenAPIDocument;
      const securitySchemes = getSecuritySchemes(api) as Record<string, OpenAPISecurityScheme>;

      return {
        version: getOpenAPIVersion(api),
        paths: this.extractPaths(api),
        securitySchemes,
        globalSecurity: api.security || [],
        rawSpec: api,
        autoDetected: this.extractAutoConfig(api, securitySchemes)
      };
    } catch (error) {
      log.error('Error parsing OpenAPI spec', error);
      throw new Error(`Failed to parse OpenAPI specification: ${error}`);
    }
  }

  /**
   * Extract auto-detected configuration from OpenAPI spec
   */
  private extractAutoConfig(api: OpenAPIDocument, securitySchemes: Record<string, OpenAPISecurityScheme>): AutoDetectedConfig {
    const servers = this.extractServers(api);
    const environmentHosts = this.mapServersToEnvironments(servers);
    const auth = this.extractAuth(securitySchemes, api.security);
    const { targetPath, variabilizedBasePath, hasVariablePath } = this.extractTargetPaths(servers);

    return {
      servers,
      environmentHosts,
      auth,
      targetPath,
      variabilizedBasePath,
      hasVariablePath,
      title: api.info?.title,
      description: api.info?.description,
      apiVersion: api.info?.version,
    };
  }

  /**
   * Extract servers from OpenAPI 3.x or Swagger 2.0
   */
  private extractServers(api: OpenAPIDocument): DetectedServer[] {
    const servers: DetectedServer[] = [];

    if (isOpenAPI3(api) && api.servers) {
      // OpenAPI 3.x - use servers array
      for (const server of api.servers) {
        const parsed = this.parseServerUrl(server.url);
        if (parsed) {
          servers.push({
            url: server.url,
            host: parsed.host,
            basePath: parsed.basePath,
            scheme: parsed.scheme,
            description: server.description,
            environment: detectEnvironment(server.url, server.description),
          });
        }
      }
    } else if (isSwagger2(api)) {
      // Swagger 2.0 - use host + basePath + schemes
      const schemes = api.schemes || ['https'];
      const host = api.host || '';
      const basePath = api.basePath || '';

      for (const scheme of schemes) {
        if (host) {
          servers.push({
            url: `${scheme}://${host}${basePath}`,
            host: host.split(':')[0],
            basePath,
            scheme,
            environment: detectEnvironment(host, ''),
          });
        }
      }
    }

    return servers;
  }

  /**
   * Parse a server URL to extract host, basePath, and scheme
   */
  private parseServerUrl(url: string): { host: string; basePath: string; scheme: string } | null {
    try {
      // Handle relative URLs
      if (url.startsWith('/')) {
        return { host: '', basePath: url, scheme: 'https' };
      }

      // Handle URLs without scheme
      let urlToParse = url;
      if (!url.includes('://')) {
        urlToParse = `https://${url}`;
      }

      const parsed = new URL(urlToParse);
      return {
        host: parsed.hostname,
        basePath: parsed.pathname === '/' ? '' : parsed.pathname,
        scheme: parsed.protocol.replace(':', ''),
      };
    } catch (error) {
      log.warn('Failed to parse server URL', { url, error });
      return null;
    }
  }

  /**
   * Map detected servers to environments
   */
  private mapServersToEnvironments(servers: DetectedServer[]): Partial<Record<'dev1' | 'uat1' | 'staging' | 'prod1', EnvironmentHostConfig>> {
    const envHosts: Partial<Record<'dev1' | 'uat1' | 'staging' | 'prod1', EnvironmentHostConfig>> = {};

    // Separate prod and non-prod servers
    const prodServers = servers.filter(s =>
      s.environment?.includes('prod') ||
      s.url.toLowerCase().includes('prod') ||
      s.description?.toLowerCase().includes('prod')
    );

    const nonProdServers = servers.filter(s =>
      !s.environment?.includes('prod') &&
      !s.url.toLowerCase().includes('prod') &&
      !s.description?.toLowerCase().includes('prod')
    );

    // First pass: map servers with detected environments
    for (const server of servers) {
      if (server.environment && ['dev1', 'uat1', 'staging', 'prod1'].includes(server.environment)) {
        const envName = server.environment as 'dev1' | 'uat1' | 'staging' | 'prod1';
        envHosts[envName] = {
          host: server.host,
          port: server.scheme === 'https' ? 443 : 80,
          scheme: server.scheme,
          basePath: server.basePath,
        };
      }
    }

    // If there's exactly one non-prod server, use it for ALL non-prod environments
    if (nonProdServers.length === 1) {
      const server = nonProdServers[0];
      const nonProdEnvs: ('dev1' | 'uat1' | 'staging')[] = ['dev1', 'uat1', 'staging'];
      for (const env of nonProdEnvs) {
        envHosts[env] = {
          host: server.host,
          port: server.scheme === 'https' ? 443 : 80,
          scheme: server.scheme,
          basePath: server.basePath,
        };
      }
    } else if (nonProdServers.length > 1) {
      // Multiple non-prod servers: try to map them intelligently
      for (const server of nonProdServers) {
        const nonProdEnvs: ('dev1' | 'uat1' | 'staging')[] = ['dev1', 'uat1', 'staging'];
        for (const env of nonProdEnvs) {
          if (!envHosts[env]) {
            envHosts[env] = {
              host: server.host,
              port: server.scheme === 'https' ? 443 : 80,
              scheme: server.scheme,
              basePath: server.basePath,
            };
          }
        }
      }
    }

    // If there's exactly one prod server, use it for prod1
    if (prodServers.length >= 1) {
      const server = prodServers[0];
      envHosts.prod1 = {
        host: server.host,
        port: server.scheme === 'https' ? 443 : 80,
        scheme: server.scheme,
        basePath: server.basePath,
      };
    }

    // If only one server total and no prod detected, use it for all environments
    if (servers.length === 1 && prodServers.length === 0) {
      const server = servers[0];
      const allEnvs: ('dev1' | 'uat1' | 'staging' | 'prod1')[] = ['dev1', 'uat1', 'staging', 'prod1'];
      for (const env of allEnvs) {
        if (!envHosts[env]) {
          envHosts[env] = {
            host: server.host,
            port: server.scheme === 'https' ? 443 : 80,
            scheme: server.scheme,
            basePath: server.basePath,
          };
        }
      }
    }

    return envHosts;
  }

  /**
   * Extract authentication type from security schemes
   */
  private extractAuth(securitySchemes: Record<string, OpenAPISecurityScheme>, _globalSecurity?: { [key: string]: string[] }[]): DetectedAuth {
    // Default to None
    let auth: DetectedAuth = { type: 'None' };

    for (const [schemeName, scheme] of Object.entries(securitySchemes)) {
      // Check for Basic Auth
      if (scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic') {
        auth = {
          type: 'Basic',
          securitySchemeName: schemeName,
        };
        break;
      }

      // Check for OAuth2 with clientCredentials flow
      if (scheme.type === 'oauth2' && scheme.flows?.clientCredentials) {
        auth = {
          type: 'OAuth2-ClientCredentials',
          securitySchemeName: schemeName,
          tokenUrl: scheme.flows.clientCredentials.tokenUrl,
          scopes: Object.keys(scheme.flows.clientCredentials.scopes || {}),
        };
        break;
      }

      // Swagger 2.0 oauth2 with application flow (equivalent to clientCredentials)
      if (scheme.type === 'oauth2' && (scheme as any).flow === 'application') {
        auth = {
          type: 'OAuth2-ClientCredentials',
          securitySchemeName: schemeName,
          tokenUrl: (scheme as any).tokenUrl,
          scopes: Object.keys((scheme as any).scopes || {}),
        };
        break;
      }
    }

    return auth;
  }

  /**
   * Extract and variabilize target paths from servers
   * Implements smart path variabilization as per requirements
   */
  private extractTargetPaths(servers: DetectedServer[]): {
    targetPath?: string;
    variabilizedBasePath?: VariabilizedBasePath;
    hasVariablePath: boolean;
  } {
    if (servers.length === 0) {
      return { hasVariablePath: false };
    }

    // Get unique base paths
    const basePaths = [...new Set(servers.map(s => s.basePath))];

    // If all servers have the same base path, no variabilization needed
    if (basePaths.length === 1) {
      return {
        targetPath: basePaths[0] || '/',
        hasVariablePath: false,
      };
    }

    // Multiple different base paths - need to variabilize
    const variabilizedBasePath = this.variabilizePaths(servers);

    return {
      targetPath: variabilizedBasePath.targetPathTemplate,
      variabilizedBasePath,
      hasVariablePath: true,
    };
  }

  /**
   * Variabilize paths by finding the variable part (can be anywhere in the path)
   * Example: /1/upcloud_uat and /1/upcloud_prod -> /1/upcloud_{private.envid}
   * Example: /dev/api/v1 and /api/v1 -> {private.envid}/api/v1
   */
  private variabilizePaths(servers: DetectedServer[]): VariabilizedBasePath {
    const pathsByEnv: Map<string, string> = new Map();

    // Group paths by detected environment
    for (const server of servers) {
      const env = server.environment || 'dev1';
      if (!pathsByEnv.has(env)) {
        pathsByEnv.set(env, server.basePath);
      }
    }

    // Get all unique paths
    const paths = [...pathsByEnv.values()];

    if (paths.length < 2) {
      // Only one path, no variabilization needed
      return {
        targetPathTemplate: paths[0] || '/',
        commonSuffix: paths[0] || '/',
        kvmVariables: [],
      };
    }

    // Find common prefix and suffix to identify the variable part
    const { commonPrefix, commonSuffix, variableParts } = this.findVariablePart(paths);

    // Calculate variable values for each environment
    const kvmVariables: VariabilizedBasePath['kvmVariables'] = [];
    const varName = 'envid';
    const values: Record<string, string> = {};

    // Map environments to their variable parts
    const pathToVariablePart = new Map<string, string>();
    paths.forEach((path, index) => {
      pathToVariablePart.set(path, variableParts[index]);
    });

    for (const [env, path] of pathsByEnv) {
      const variablePart = pathToVariablePart.get(path) || '';
      values[env] = variablePart;
    }

    // For non-prod environments without a detected value, use the first non-prod value
    const nonProdValue = Object.entries(values).find(([env]) =>
      !env.includes('prod')
    )?.[1] || '';

    const prodValue = Object.entries(values).find(([env]) =>
      env.includes('prod')
    )?.[1] || '';

    // Fill in missing environments
    const allEnvs = ['dev1', 'uat1', 'staging', 'prod1'];
    for (const env of allEnvs) {
      if (!values[env]) {
        values[env] = env.includes('prod') ? prodValue : nonProdValue;
      }
    }

    kvmVariables.push({ variableName: varName, values });

    // Build the template: prefix{private.envid}suffix
    const targetPathTemplate = `${commonPrefix}{private.${varName}}${commonSuffix}`;

    return {
      targetPathTemplate,
      commonSuffix,
      kvmVariables,
    };
  }

  /**
   * Find the variable part by comparing paths character by character
   * Returns common prefix, common suffix, and the variable parts for each path
   */
  private findVariablePart(paths: string[]): {
    commonPrefix: string;
    commonSuffix: string;
    variableParts: string[];
  } {
    if (paths.length === 0) {
      return { commonPrefix: '', commonSuffix: '', variableParts: [] };
    }
    if (paths.length === 1) {
      return { commonPrefix: paths[0], commonSuffix: '', variableParts: [''] };
    }

    // Find common prefix
    let commonPrefix = '';
    const minLen = Math.min(...paths.map(p => p.length));

    for (let i = 0; i < minLen; i++) {
      const char = paths[0][i];
      if (paths.every(p => p[i] === char)) {
        commonPrefix += char;
      } else {
        break;
      }
    }

    // Find common suffix (starting from the end)
    let commonSuffix = '';
    for (let i = 1; i <= minLen - commonPrefix.length; i++) {
      const char = paths[0][paths[0].length - i];
      if (paths.every(p => p[p.length - i] === char)) {
        commonSuffix = char + commonSuffix;
      } else {
        break;
      }
    }

    // Extract variable parts (what's between prefix and suffix)
    const variableParts = paths.map(path => {
      const start = commonPrefix.length;
      const end = path.length - commonSuffix.length;
      return path.slice(start, end);
    });

    return { commonPrefix, commonSuffix, variableParts };
  }

  async validate(spec: string, format: 'json' | 'yaml'): Promise<boolean> {
    try {
      const parsedSpec = format === 'json' ? JSON.parse(spec) : YAML.load(spec);
      await SwaggerParser.validate(parsedSpec);
      return true;
    } catch (error) {
      log.warn('Validation error', error);
      return false;
    }
  }

  private extractPaths(api: OpenAPIDocument): PathInfo[] {
    const paths: PathInfo[] = [];
    const apiPaths = api.paths || {};

    for (const [path, pathItem] of Object.entries(apiPaths)) {
      const typedPathItem = pathItem as OpenAPIPathItem;

      for (const method of SUPPORTED_METHODS) {
        const operation = typedPathItem[method] as OpenAPIOperation | undefined;
        if (operation) {
          paths.push({
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId,
            summary: operation.summary,
            security: operation.security,
          });
        }
      }
    }

    return paths;
  }

  extractScopes(api: OpenAPIDocument): string[] {
    const scopes = new Set<string>();

    // Scopes globaux
    const globalSecurity = api.security || [];
    for (const secReq of globalSecurity) {
      for (const reqScopes of Object.values(secReq)) {
        for (const scope of reqScopes) {
          scopes.add(scope);
        }
      }
    }

    // Scopes par opération
    const apiPaths = api.paths || {};
    for (const pathItem of Object.values(apiPaths)) {
      const typedPathItem = pathItem as OpenAPIPathItem;

      for (const method of SUPPORTED_METHODS) {
        const operation = typedPathItem[method] as OpenAPIOperation | undefined;
        if (operation?.security) {
          for (const secReq of operation.security) {
            for (const reqScopes of Object.values(secReq)) {
              for (const scope of reqScopes) {
                scopes.add(scope);
              }
            }
          }
        }
      }
    }

    return Array.from(scopes);
  }
}
