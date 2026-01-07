import SwaggerParser from '@apidevtools/swagger-parser';
import * as YAML from 'js-yaml';
import type { ParsedOpenAPI, PathInfo } from '../../models/OpenAPISpec';

export class OpenAPIParserService {
  async parse(spec: string, format: 'json' | 'yaml'): Promise<ParsedOpenAPI> {
    try {
      const parsedSpec = format === 'json' ? JSON.parse(spec) : YAML.load(spec);
      const api = await SwaggerParser.validate(parsedSpec as any);

      return {
        version: (api as any).openapi || (api as any).swagger || '3.0.0',
        paths: this.extractPaths(api),
        securitySchemes: this.extractSecuritySchemes(api),
        globalSecurity: (api as any).security || [],
        rawSpec: api
      };
    } catch (error) {
      console.error('Error parsing OpenAPI spec:', error);
      throw new Error(`Failed to parse OpenAPI specification: ${error}`);
    }
  }

  async validate(spec: string, format: 'json' | 'yaml'): Promise<boolean> {
    try {
      const parsedSpec = format === 'json' ? JSON.parse(spec) : YAML.load(spec);
      await SwaggerParser.validate(parsedSpec as any);
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  private extractPaths(api: any): PathInfo[] {
    const paths: PathInfo[] = [];

    for (const [path, pathItem] of Object.entries(api.paths || {})) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      for (const method of methods) {
        const operation = (pathItem as any)[method];
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

  private extractSecuritySchemes(api: any): Record<string, any> {
    // Pour OpenAPI 3.x
    if (api.components?.securitySchemes) {
      return api.components.securitySchemes;
    }
    // Pour Swagger 2.0
    if (api.securityDefinitions) {
      return api.securityDefinitions;
    }
    return {};
  }

  extractScopes(api: any): string[] {
    const scopes = new Set<string>();

    // Scopes globaux
    const globalSecurity = api.security || [];
    for (const secReq of globalSecurity) {
      for (const [name, reqScopes] of Object.entries(secReq)) {
        for (const scope of reqScopes as string[]) {
          scopes.add(scope);
        }
      }
    }

    // Scopes par opération
    for (const pathItem of Object.values(api.paths || {})) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (operation?.security) {
          for (const secReq of operation.security) {
            for (const [name, reqScopes] of Object.entries(secReq)) {
              for (const scope of reqScopes as string[]) {
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
