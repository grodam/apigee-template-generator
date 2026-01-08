import type { ApiConfiguration, EnvironmentConfig } from '../../models/ApiConfiguration';
import { extractPathPrefixes } from '../../utils/stringUtils';

export class ConfigGenerator {
  private config: ApiConfiguration;
  private openAPI: any;

  constructor(config: ApiConfiguration, openAPI: any) {
    this.config = config;
    this.openAPI = openAPI;
  }

  generateEdgeEnvJson(env: string, envConfig: EnvironmentConfig): any {
    return {
      version: "1.0",
      envConfig: {
        [env]: {
          targetServers: envConfig.targetServers.map(ts => ({
            name: ts.name,
            host: ts.host,
            isEnabled: ts.isEnabled,
            port: ts.port,
            sSLInfo: ts.sSLInfo || {
              enabled: true,
              clientAuthEnabled: false,
            }
          })),
          kvms: envConfig.kvms || [],
          virtualHosts: [],
          references: [],
          caches: [],
          resourcefiles: [],
          flowhooks: [],
          extensions: [],
          keystores: [],
          aliases: [],
        }
      }
    };
  }

  generateEdgeOrgJson(env: string, envConfig: EnvironmentConfig): any {
    return {
      version: "1.0",
      orgConfig: {
        specs: [],
        apiProducts: envConfig.apiProducts.map(product => ({
          name: product.name,
          displayName: product.displayName,
          description: product.description || this.config.description,
          approvalType: product.approvalType,
          attributes: product.attributes || [
            { name: "access", value: "private" }
          ],
          environments: product.environments,
          operationGroup: product.operationGroup || this.generateOperationGroup(),
        })),
        userroles: [],
        reports: [],
        developers: envConfig.developers || [],
        developerApps: this.formatDeveloperApps(envConfig.developerApps || []),
        importKeys: {},
      }
    };
  }

  private generateOperationGroup(): any {
    const operations = this.extractOperationsFromOpenAPI();

    return {
      operationConfigs: [
        {
          apiSource: this.config.proxyName,
          operations: operations,
          quota: {}
        }
      ],
      operationConfigType: "proxy"
    };
  }

  private extractOperationsFromOpenAPI(): Array<{ resource: string }> {
    const paths = Object.keys(this.openAPI?.paths || {});
    const operations: Array<{ resource: string }> = [];

    // Extraire les préfixes de chemins
    const pathPrefixes = extractPathPrefixes(paths);

    for (const prefix of pathPrefixes) {
      operations.push({ resource: prefix });
      operations.push({ resource: prefix + '/**' });
    }

    // Si aucun préfixe, ajouter un wildcard global
    if (operations.length === 0) {
      operations.push({ resource: '/' });
      operations.push({ resource: '/**' });
    }

    return operations;
  }

  private formatDeveloperApps(apps: any[]): Record<string, any[]> {
    const formatted: Record<string, any[]> = {};

    // Cette logique dépend de la structure de vos données
    // Pour l'instant, retourner un objet vide
    return formatted;
  }

  generateApigeConfiguration(): any {
    return {
      proxyName: this.config.proxyName,
      entity: this.config.entity,
      apiname: this.config.apiname,
      version: this.config.version,
      description: this.config.description,
      proxyBasepath: this.config.proxyBasepath,
      targetPath: this.config.targetPath,
      mockUrl: this.config.mockUrl,
      globalRateLimit: this.config.globalRateLimit,
      authSouthbound: this.config.authSouthbound?.toLowerCase(),
      oasVersion: this.config.oasVersion,
      oasFormat: 'json'
    };
  }
}
