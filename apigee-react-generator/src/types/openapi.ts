/**
 * OpenAPI Types
 *
 * Type definitions for OpenAPI 2.0 (Swagger) and OpenAPI 3.x specifications.
 * These types replace the usage of 'any' throughout the codebase.
 */

// Security requirement object
export interface SecurityRequirement {
  [securitySchemeName: string]: string[];
}

// OpenAPI Operation (GET, POST, etc.)
export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: SecurityRequirement[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

// OpenAPI Parameter
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
}

// OpenAPI Request Body
export interface OpenAPIRequestBody {
  description?: string;
  content?: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

// OpenAPI Response
export interface OpenAPIResponse {
  description?: string;
  content?: Record<string, OpenAPIMediaType>;
}

// OpenAPI Media Type
export interface OpenAPIMediaType {
  schema?: OpenAPISchema;
}

// OpenAPI Schema (simplified)
export interface OpenAPISchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  $ref?: string;
}

// OpenAPI Path Item
export interface OpenAPIPathItem {
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

// Security Scheme
export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

// OAuth Flows
export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

// OAuth Flow
export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

// OpenAPI Components
export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
  parameters?: Record<string, OpenAPIParameter>;
  responses?: Record<string, OpenAPIResponse>;
}

// Server object
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

// Server variable
export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

// Info object
export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

// Main OpenAPI Document type (supports both 2.0 and 3.x)
export interface OpenAPIDocument {
  // OpenAPI 3.x
  openapi?: string;
  // Swagger 2.0
  swagger?: string;

  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components?: OpenAPIComponents;
  security?: SecurityRequirement[];
  tags?: Array<{ name: string; description?: string }>;
  externalDocs?: { url: string; description?: string };

  // Swagger 2.0 specific
  host?: string;
  basePath?: string;
  schemes?: string[];
  securityDefinitions?: Record<string, OpenAPISecurityScheme>;
}

// HTTP Methods type
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

// All HTTP methods as array
export const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

// Helper type to get operation from path item
export type GetOperation<T extends OpenAPIPathItem, M extends HttpMethod> = T[M];

// Type guard to check if a value is an OpenAPI operation
export function isOpenAPIOperation(value: unknown): value is OpenAPIOperation {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guard to check if document is OpenAPI 3.x
export function isOpenAPI3(doc: OpenAPIDocument): boolean {
  return !!doc.openapi && doc.openapi.startsWith('3.');
}

// Type guard to check if document is Swagger 2.0
export function isSwagger2(doc: OpenAPIDocument): boolean {
  return !!doc.swagger && doc.swagger.startsWith('2.');
}

// Get security schemes based on version
export function getSecuritySchemes(doc: OpenAPIDocument): Record<string, OpenAPISecurityScheme> {
  if (isOpenAPI3(doc)) {
    return doc.components?.securitySchemes || {};
  }
  return doc.securityDefinitions || {};
}

// Get version string
export function getOpenAPIVersion(doc: OpenAPIDocument): string {
  return doc.openapi || doc.swagger || '3.0.0';
}
