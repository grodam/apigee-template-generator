import type { ApiConfiguration } from '../../models/ApiConfiguration';
import type { OpenAPIDocument, OpenAPIPathItem, OpenAPIOperation, SecurityRequirement, HttpMethod } from '../../types/openapi';
import { pathToPathSuffix, scopeToPolicyName } from '../../utils/stringUtils';
import { escapeXml } from '../../utils/xmlUtils';

const SUPPORTED_METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

export class FlowGenerator {
  private openAPI: OpenAPIDocument;

  constructor(_config: ApiConfiguration, openAPI: OpenAPIDocument) {
    this.openAPI = openAPI;
  }

  generateFlows(): string {
    const flows: string[] = [];

    // Extraire les scopes globaux
    const globalScopes = this.extractGlobalScopes();

    // Pour chaque path et methode
    const paths = this.openAPI.paths || {};
    for (const [path, pathItem] of Object.entries(paths)) {
      const typedPathItem = pathItem as OpenAPIPathItem;

      for (const method of SUPPORTED_METHODS) {
        const operation = typedPathItem[method] as OpenAPIOperation | undefined;
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
    operation: OpenAPIOperation,
    globalScopes: string[]
  ): string {
    // Nom du flow: "GET /customer/{id}"
    const flowName = method + ' ' + path;

    // Convertir path en pathsuffix: /customer/{id} -> /customer/*
    const pathSuffix = pathToPathSuffix(path);

    // Condition de routing - escape XML special characters
    const condition = `(proxy.pathsuffix MatchesPath "${escapeXml(pathSuffix)}") and (request.verb = "${method}")`;

    // Extraire les scopes pour cette operation
    const operationScopes = this.extractOperationScopes(operation, globalScopes);

    // Generer les Steps pour les scopes OAuth2
    const steps = operationScopes.map(scope => {
      const policyName = scopeToPolicyName(scope);
      return `        <Step><Name>${escapeXml(policyName)}</Name></Step>`;
    }).join('\n');

    const requestSection = steps ? '        <Request>\n' + steps + '\n        </Request>' : '        <Request/>';

    return `    <Flow name="${escapeXml(flowName)}">\n` +
           requestSection + '\n' +
           '        <Response/>\n' +
           `        <Condition>${condition}</Condition>\n` +
           '    </Flow>';
  }

  private extractGlobalScopes(): string[] {
    const globalSecurity: SecurityRequirement[] = this.openAPI.security || [];
    const scopes: string[] = [];

    for (const secReq of globalSecurity) {
      for (const schemeScopes of Object.values(secReq)) {
        scopes.push(...schemeScopes);
      }
    }

    return scopes;
  }

  private extractOperationScopes(operation: OpenAPIOperation, globalScopes: string[]): string[] {
    // Si l'operation a des scopes specifiques, ils ecrasent les globaux
    if (operation.security && operation.security.length > 0) {
      const scopes: string[] = [];
      for (const secReq of operation.security) {
        for (const schemeScopes of Object.values(secReq)) {
          scopes.push(...schemeScopes);
        }
      }
      return scopes;
    }

    return globalScopes;
  }
}
