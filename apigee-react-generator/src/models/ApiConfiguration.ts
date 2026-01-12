export interface ApiConfiguration {
  // Informations de base - Naming Convention: [entity].[domain].[backendApps].[businessObject].[version]
  entity: 'elis' | 'ext';            // Ex: "elis" ou "ext"
  domain: string;                    // Ex: "finance", "rh", "supply-chain"
  backendApps: string[];             // Ex: ["sap", "salesforce"] -> "sap-salesforce"
  businessObject: string;            // Ex: "invoice", "customer", "order"
  version: string;                   // Ex: "v1"
  description: string;               // Description de l'API

  // Legacy field kept for compatibility (auto-calculated)
  apiname: string;                   // Deprecated: use businessObject instead

  // Configuration OpenAPI
  oasVersion: string;                // "2.0" | "3.0.0" | "3.0.1" | "3.0.3" | "3.1.0"
  oasFormat: "json" | "yaml";

  // Configuration Proxy
  proxyBasepath: string;             // Ex: "customer-api/v2"
  targetPath: string;                // Ex: "/v1"
  mockUrl?: string;                  // Ex: "https://stoplight.io/mocks/..."

  // Sécurité
  globalRateLimit?: string;          // Ex: "500pm", "1000ps"
  authSouthbound: "Basic" | "OAuth2-ClientCredentials" | "ApiKey" | "None";
  apiKeyHeaderName?: string;         // Ex: "X-API-Key" (pour authSouthbound: "ApiKey")

  // Nom du proxy calculé
  proxyName: string;                 // Calculé: {entity}.{domain}.{backendApps}.{businessObject}.{version}

  // Multi-product mode: 'single' = one product per env, 'multi' = multiple products per env
  productsMode: 'single' | 'multi';

  // Configuration des environnements
  environments: {
    dev1: EnvironmentConfig;
    uat1: EnvironmentConfig;
    staging: EnvironmentConfig;
    prod1: EnvironmentConfig;
  };
}

export interface EnvironmentConfig {
  name: string;                      // "dev1" | "uat1" | "staging" | "prod1"
  targetServers: TargetServer[];
  apiProducts: ApiProduct[];
  developers?: Developer[];
  developerApps?: DeveloperApp[];
  kvms?: KVM[];
}

export interface TargetServer {
  name: string;                      // Ex: "elis.customer.v1.backend"
  host: string;                      // Ex: "backend-dev.elis.com"
  isEnabled: boolean;
  port: number;                      // 443, 445, 8080, etc.
  sSLInfo?: {
    enabled: boolean;
    clientAuthEnabled?: boolean;
    keyStore?: string;
    keyAlias?: string;
    trustStore?: string;
    ignoreValidationErrors?: boolean;
  };
}

// Resource group for multi-product mode
export interface ResourceGroup {
  id: string;                        // UUID for React key
  pathPrefix: string;                // Ex: "/api/Cases"
  authorizedPaths: string[];         // Ex: ["/api/Cases", "/api/Cases/**"]
}

export interface ApiProduct {
  name: string;                      // Ex: "customer-v1-product-dev1"
  displayName: string;
  description?: string;
  approvalType: "auto" | "manual";
  attributes?: Array<{ name: string; value: string }>;
  environments: string[];            // ["dev1"]
  // Authorized paths for this product (defaults to ["/", "/**"] if not specified)
  authorizedPaths?: string[];
  // Resource groups for multi-product mode (optional, for grouping related paths)
  resourceGroups?: ResourceGroup[];
  operationGroup?: {
    operationConfigs: Array<{
      apiSource: string;             // Nom du proxy
      operations: Array<{
        resource: string;            // Ex: "/customer", "/customer/**"
      }>;
      quota?: object;
    }>;
    operationConfigType: "proxy" | "remoteservice";
  };
  proxies?: string[];                // Pour Apigee Edge (legacy)
  scopes?: string[];                 // Pour Apigee Edge (legacy)
}

export interface Developer {
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  attributes?: Array<{ name: string; value: string }>;
}

export interface DeveloperApp {
  name: string;
  apiProducts: string[];
  scopes?: string[];
  callbackUrl?: string | null;
  attributes?: Array<{ name: string; value: string }>;
}

export interface KVM {
  name: string;                      // Ex: "customer-backend"
  encrypted: boolean;
  entries?: Array<{
    name: string;
    value: string;
  }>;
}
