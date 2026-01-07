import type { ApiConfiguration } from '../../models/ApiConfiguration';
import { pathToPathSuffix, scopeToPolicyName } from '../../utils/stringUtils';

export class FlowGenerator {
  private openAPI: any;

  constructor(_config: ApiConfiguration, openAPI: any) {
    this.openAPI = openAPI;
  }

  generateFlows(): string {
    const flows: string[] = [];

    // Extraire les scopes globaux
    const globalScopes = this.extractGlobalScopes();

    // Pour chaque path et methode
    for (const [path, pathItem] of Object.entries(this.openAPI.paths || {})) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (operation) {
          const flow = this.generateFlow(
            path,
            method.toUpperCase(),
            operation,
            globalScopes
          );
          flows.push(flow);
        }
      }
    }

    return flows.join('\n');
  }

  private generateFlow(
    path: string,
    method: string,
    operation: any,
    globalScopes: string[]
  ): string {
    // Nom du flow: "GET /customer/{id}"
    const flowName = method + ' ' + path;

    // Convertir path en pathsuffix: /customer/{id} -> /customer/*
    const pathSuffix = pathToPathSuffix(path);

    // Condition de routing
    const condition = '(proxy.pathsuffix MatchesPath "' + pathSuffix + '") and (request.verb = "' + method + '")';

    // Extraire les scopes pour cette operation
    const operationScopes = this.extractOperationScopes(operation, globalScopes);

    // Generer les Steps pour les scopes OAuth2
    const steps = operationScopes.map(scope => {
      const policyName = scopeToPolicyName(scope);
      return '        <Step><Name>' + policyName + '</Name></Step>';
    }).join('\n');

    const requestSection = steps ? '        <Request>\n' + steps + '\n        </Request>' : '        <Request/>';

    return '    <Flow name="' + flowName + '">\n' +
           requestSection + '\n' +
           '        <Response/>\n' +
           '        <Condition>' + condition + '</Condition>\n' +
           '    </Flow>';
  }

  private extractGlobalScopes(): string[] {
    const globalSecurity = this.openAPI.security || [];
    const scopes: string[] = [];

    for (const secReq of globalSecurity) {
      for (const [, schemeScopes] of Object.entries(secReq)) {
        scopes.push(...(schemeScopes as string[]));
      }
    }

    return scopes;
  }

  private extractOperationScopes(operation: any, globalScopes: string[]): string[] {
    // Si l'operation a des scopes specifiques, ils ecrasent les globaux
    if (operation.security && operation.security.length > 0) {
      const scopes: string[] = [];
      for (const secReq of operation.security) {
        for (const [, schemeScopes] of Object.entries(secReq)) {
          scopes.push(...(schemeScopes as string[]));
        }
      }
      return scopes;
    }

    return globalScopes;
  }
}
