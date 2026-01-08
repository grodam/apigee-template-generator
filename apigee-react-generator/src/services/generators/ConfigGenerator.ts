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
    // Map KVMs and remove empty entries arrays
    const kvms = (envConfig.kvms || []).map(kvm => {
      const kvmObj: any = {
        name: kvm.name,
        encrypted: kvm.encrypted,
      };
      // Only include entries if not empty
      if (kvm.entries && kvm.entries.length > 0) {
        kvmObj.entries = kvm.entries;
      }
      return kvmObj;
    });

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
          kvms,
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

    // Each operation should be in its own operationConfig
    return {
      operationConfigs: operations.map(op => ({
        apiSource: this.config.proxyName,
        operations: [op]
      })),
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
      entity: this.config.entity,
      description: this.config.description,
      version: this.config.version,
      apiname: this.config.apiname,
      'oas.version': this.config.oasVersion,
      'oas.format': 'json',
      'proxy.basepath': this.config.proxyBasepath,
      'target.path': this.config.targetPath,
      'global-rate-limit': this.config.globalRateLimit,
      'auth-southbound': this.config.authSouthbound?.toLowerCase(),
      'mock.url': this.config.mockUrl || ''
    };
  }
}
