export interface ParsedOpenAPI {
  version: string;
  paths: PathInfo[];
  securitySchemes: Record<string, any>;
  globalSecurity: any[];
  rawSpec: any;
}

export interface PathInfo {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  security?: any[];
}
