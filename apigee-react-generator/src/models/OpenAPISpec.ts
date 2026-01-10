import type { OpenAPIDocument, OpenAPISecurityScheme, SecurityRequirement } from '../types/openapi';
import type { AutoDetectedConfig } from './AutoDetectedConfig';

export interface ParsedOpenAPI {
  version: string;
  paths: PathInfo[];
  securitySchemes: Record<string, OpenAPISecurityScheme>;
  globalSecurity: SecurityRequirement[];
  rawSpec: OpenAPIDocument;
  // Auto-detected configuration for pre-filling forms
  autoDetected?: AutoDetectedConfig;
}

export interface PathInfo {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  security?: SecurityRequirement[];
}
