import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ApiConfiguration, EnvironmentConfig, ApiProduct } from '../models/ApiConfiguration';
import type { ParsedOpenAPI } from '../models/OpenAPISpec';
import type { GeneratedProject } from '../models/GeneratedProject';
import type { AzureDevOpsConfig, TemplateRepoConfig, PortalConfig } from '../models/AzureDevOpsConfig';
import type { AutoDetectedConfig, BackendInfoEntry } from '../models/AutoDetectedConfig';
import { DEFAULT_AZURE_DEVOPS_CONFIG, DEFAULT_TEMPLATE_REPO_CONFIG, DEFAULT_PORTAL_CONFIG } from '../models/AzureDevOpsConfig';
import { generateProxyName } from '../utils/stringUtils';
import { mergeKvmEntries, updateBackendInfoValue as updateKvmValue } from '../utils/kvmGenerator';
import { suggestProductsFromPaths, createProductForEnv, getDefaultAuthorizedPaths, findSmallestCommonRoot, type SuggestedProduct, type PathInfo } from '../utils/pathAnalyzer';

export type Theme = 'light' | 'dark' | 'system';

interface ProjectState {
  // Current step in the wizard
  currentStep: number;

  // API Configuration
  apiConfig: Partial<ApiConfiguration>;

  // OpenAPI Specification
  openAPISpec: string;
  parsedOpenAPI: ParsedOpenAPI | null;

  // Auto-detected configuration from OpenAPI spec
  autoDetectedConfig: AutoDetectedConfig | null;

  // Azure DevOps Configuration
  azureDevOpsConfig: AzureDevOpsConfig;

  // Template Repository Configuration
  templateRepoConfig: TemplateRepoConfig;

  // Portal and OAuth Configuration
  portalConfig: PortalConfig;

  // Generated project
  generatedProject: GeneratedProject | null;

  // Settings modal state
  isSettingsModalOpen: boolean;
  settingsActiveTab: 'azure-devops' | 'template-sync' | 'portal';

  // Template overrides (persisted)
  templateOverrides: Record<string, string>;

  // Theme
  theme: Theme;

  // Generated backend_info KVM entries from URL variabilization
  generatedBackendInfoEntries: BackendInfoEntry[];

  // Suggested products from OpenAPI path analysis
  suggestedProducts: SuggestedProduct[];

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;

  updateApiConfig: (config: Partial<ApiConfiguration>) => void;
  setOpenAPISpec: (spec: string) => void;
  setParsedOpenAPI: (parsed: ParsedOpenAPI | null) => void;
  setAutoDetectedConfig: (config: AutoDetectedConfig | null) => void;
  applyAutoDetectedConfig: () => void;
  setGeneratedProject: (project: GeneratedProject | null) => void;

  updateEnvironmentConfig: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', config: EnvironmentConfig) => void;

  // Product management actions
  setProductsMode: (mode: 'single' | 'multi') => void;
  addProduct: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', product: ApiProduct) => void;
  removeProduct: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', productIndex: number) => void;
  updateProduct: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', productIndex: number, updates: Partial<ApiProduct>) => void;
  generateProductsFromPaths: () => void;
  syncProductsToAllEnvironments: () => void;
  setSuggestedProducts: (products: SuggestedProduct[]) => void;
  applySelectedSuggestions: (suggestions: SuggestedProduct[]) => void;

  // Backend info actions
  setGeneratedBackendInfoEntries: (entries: BackendInfoEntry[]) => void;
  updateBackendInfoValue: (kvmIndex: number, environment: string, value: string) => void;

  // Azure DevOps actions
  updateAzureDevOpsConfig: (config: Partial<AzureDevOpsConfig>) => void;

  // Template Repository actions
  updateTemplateRepoConfig: (config: Partial<TemplateRepoConfig>) => void;

  // Portal Configuration actions
  updatePortalConfig: (config: Partial<PortalConfig>) => void;

  // Settings modal actions
  setSettingsModalOpen: (open: boolean) => void;
  setSettingsActiveTab: (tab: 'azure-devops' | 'template-sync' | 'portal') => void;

  // Template override actions
  setTemplateOverride: (id: string, content: string) => void;
  removeTemplateOverride: (id: string) => void;
  clearTemplateOverrides: () => void;

  // Theme actions
  setTheme: (theme: Theme) => void;

  // Helper to get complete API config with defaults
  getCompleteConfig: () => ApiConfiguration | null;

  // Reset configuration for new spec import
  resetForNewSpec: () => void;
}

// Helper to remove trailing '1' from environment name (dev1 -> dev, prod1 -> prod)
const normalizeEnvName = (env: string): string => env.replace(/1$/, '');

// Helper to get environment suffix for product/display names
// prod/prod1: no suffix, staging: "stg", others: normalized env name
const getEnvSuffix = (env: string, separator: string = '-'): string => {
  const normalized = normalizeEnvName(env);
  if (normalized === 'prod') return '';
  if (normalized === 'staging') return `${separator}stg`;
  return `${separator}${normalized}`;
};

// Helper to extract resource suffix from product name
// e.g., "elis.finance.sap.invoice.v1.cases.dev" -> "cases"
const extractResourceSuffix = (productName: string, proxyName: string): string | null => {
  // Remove environment suffix (.dev, .uat, .stg, etc.)
  const envSuffixes = ['.dev', '.uat', '.staging', '.stg', '.prod'];
  let nameWithoutEnv = productName;
  for (const suffix of envSuffixes) {
    if (nameWithoutEnv.endsWith(suffix)) {
      nameWithoutEnv = nameWithoutEnv.slice(0, -suffix.length);
      break;
    }
  }

  // If the product name starts with the proxy name, extract the suffix
  if (nameWithoutEnv.startsWith(proxyName + '.')) {
    return nameWithoutEnv.slice(proxyName.length + 1) || null;
  }

  return null;
};

interface EnvConfigParams {
  env: string;
  proxyName: string;
  entity: string;
  backendApps: string[];
  businessObject: string;
  version: string;
}

// Generate API Product description from naming components
const generateProductDescription = (params: EnvConfigParams): string => {
  const { env, businessObject, version } = params;
  const envLabel = normalizeEnvName(env).toUpperCase();
  return `API Product for ${businessObject} (${version}) - ${envLabel} environment.`;
};

const createDefaultEnvironmentConfig = (params: EnvConfigParams): EnvironmentConfig => {
  const { env, proxyName, entity, backendApps, businessObject, version } = params;
  // Target Server Name: [entity].[backendapp].[version].backend
  const targetServerName = `${entity}.${backendApps.join('-')}.${version}.backend`;
  // Product Name: [proxyName].[env] (prod: no suffix, staging: .stg)
  const productName = `${proxyName}${getEnvSuffix(env, '.')}`;
  // Display Name: [businessObject]-[version]-[env] (prod: no suffix, staging: -stg)
  const displayName = `${businessObject}-${version}${getEnvSuffix(env)}`;
  // Description: auto-generated
  const description = generateProductDescription(params);

  // Create one KVM per backend app with name format: [backendapp].[version].backend
  const kvms = backendApps.map(backendApp => ({
    name: `${backendApp}.${version}.backend`,
    encrypted: true,
    entries: []
  }));

  return {
    name: env,
    targetServers: [{
      name: targetServerName,
      host: '',
      isEnabled: true,
      port: 443,
      sSLInfo: {
        enabled: true,
        clientAuthEnabled: false,
      }
    }],
    apiProducts: [{
      name: productName,
      displayName: displayName,
      description: description,
      approvalType: 'manual',
      environments: [env],
      attributes: [
        { name: 'access', value: 'private' }
      ]
    }],
    developers: [],
    developerApps: [],
    kvms: kvms
  };
};

// Update environment config with new proxy name while preserving user customizations
const updateEnvironmentWithProxyName = (envConfig: EnvironmentConfig, params: EnvConfigParams): EnvironmentConfig => {
  const { env, proxyName, entity, backendApps, businessObject, version } = params;
  // Target Server Name: [entity].[backendapp].[version].backend
  const targetServerName = `${entity}.${backendApps.join('-')}.${version}.backend`;
  // Product Name: [proxyName].[env] (prod: no suffix, staging: .stg)
  const productName = `${proxyName}${getEnvSuffix(env, '.')}`;
  // Display Name: [businessObject]-[version]-[env] (prod: no suffix, staging: -stg)
  const displayName = `${businessObject}-${version}${getEnvSuffix(env)}`;
  // Description: auto-generated
  const description = generateProductDescription(params);

  // Create one KVM per backend app with name format: [backendapp].[version].backend
  // Preserve existing KVM entries if KVM with same name exists
  const newKvms = backendApps.map(backendApp => {
    const kvmName = `${backendApp}.${version}.backend`;
    const existingKvm = envConfig.kvms?.find(kvm => kvm.name === kvmName);
    return existingKvm || {
      name: kvmName,
      encrypted: true,
      entries: []
    };
  });

  return {
    ...envConfig,
    targetServers: envConfig.targetServers.map((ts, index) => ({
      ...ts,
      name: index === 0 ? targetServerName : ts.name,
    })),
    apiProducts: envConfig.apiProducts.map((product, index) => ({
      ...product,
      name: index === 0 ? productName : product.name,
      displayName: index === 0 ? displayName : product.displayName,
      description: index === 0 ? description : product.description,
    })),
    kvms: newKvms,
  };
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      apiConfig: {},
      openAPISpec: '',
      parsedOpenAPI: null,
      autoDetectedConfig: null,
      azureDevOpsConfig: DEFAULT_AZURE_DEVOPS_CONFIG,
      templateRepoConfig: DEFAULT_TEMPLATE_REPO_CONFIG,
      portalConfig: DEFAULT_PORTAL_CONFIG,
      generatedProject: null,
      isSettingsModalOpen: false,
      settingsActiveTab: 'azure-devops' as const,
      templateOverrides: {},
      theme: 'light' as Theme,
      generatedBackendInfoEntries: [],
      suggestedProducts: [],

      setCurrentStep: (step: number) => set({ currentStep: step }),

      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 5) })),

      previousStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),

      updateApiConfig: (config: Partial<ApiConfiguration>) => set((state) => {
        const newConfig = { ...state.apiConfig, ...config };

        // Auto-calculate proxyName using the new naming convention:
        // [entity].[domain].[backendapp1-backendapp2-...].[businessobject].[version]
        if (newConfig.entity && newConfig.domain && newConfig.backendApps?.length && newConfig.businessObject && newConfig.version) {
          const newProxyName = generateProxyName(
            newConfig.entity,
            newConfig.domain,
            newConfig.backendApps,
            newConfig.businessObject,
            newConfig.version
          );

          const proxyNameChanged = newConfig.proxyName !== newProxyName;
          newConfig.proxyName = newProxyName;

          // Keep apiname in sync for backward compatibility
          newConfig.apiname = newConfig.businessObject;

          // Common params for environment config
          const envConfigParams = {
            proxyName: newConfig.proxyName,
            entity: newConfig.entity,
            backendApps: newConfig.backendApps,
            businessObject: newConfig.businessObject,
            version: newConfig.version,
          };

          // Initialize or update environments
          if (!newConfig.environments) {
            // Create new environments if not present
            newConfig.environments = {
              dev1: createDefaultEnvironmentConfig({ ...envConfigParams, env: 'dev1' }),
              uat1: createDefaultEnvironmentConfig({ ...envConfigParams, env: 'uat1' }),
              staging: createDefaultEnvironmentConfig({ ...envConfigParams, env: 'staging' }),
              prod1: createDefaultEnvironmentConfig({ ...envConfigParams, env: 'prod1' }),
            };
          } else if (proxyNameChanged) {
            // Update existing environments with new proxy name
            newConfig.environments = {
              dev1: updateEnvironmentWithProxyName(newConfig.environments.dev1, { ...envConfigParams, env: 'dev1' }),
              uat1: updateEnvironmentWithProxyName(newConfig.environments.uat1, { ...envConfigParams, env: 'uat1' }),
              staging: updateEnvironmentWithProxyName(newConfig.environments.staging, { ...envConfigParams, env: 'staging' }),
              prod1: updateEnvironmentWithProxyName(newConfig.environments.prod1, { ...envConfigParams, env: 'prod1' }),
            };
          }

          // Apply backend_info KVM entries from URL variabilization if available
          // Read from both state.generatedBackendInfoEntries AND autoDetectedConfig (for timing safety)
          const backendInfoEntries = state.generatedBackendInfoEntries.length > 0
            ? state.generatedBackendInfoEntries
            : state.autoDetectedConfig?.urlVariabilization?.kvmEntries || [];

          if (backendInfoEntries.length > 0 && newConfig.environments) {
            const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
            for (const envName of envNames) {
              const envConfig = newConfig.environments[envName];
              if (envConfig) {
                envConfig.kvms = mergeKvmEntries(
                  envConfig.kvms || [],
                  backendInfoEntries,
                  envName,
                  newConfig.proxyName
                );
              }
            }
          }

          // Add backend_api_key KVM entry for ApiKey auth
          if (newConfig.authSouthbound === 'ApiKey' && newConfig.environments) {
            const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
            for (const envName of envNames) {
              const envConfig = newConfig.environments[envName];
              if (envConfig && envConfig.kvms && envConfig.kvms.length > 0) {
                const firstKvm = envConfig.kvms[0];
                if (!firstKvm.entries) {
                  firstKvm.entries = [];
                }
                const hasApiKeyEntry = firstKvm.entries.some(e => e.name === 'backend_api_key');
                if (!hasApiKeyEntry) {
                  firstKvm.entries.push({
                    name: 'backend_api_key',
                    value: ''
                  });
                }
              }
            }
          }
        }

        // Auto-generate repository name: [backendapp]-[version]
        const newRepoName = newConfig.backendApps?.length && newConfig.version
          ? `${newConfig.backendApps.join('-')}-${newConfig.version}`
          : '';

        return {
          apiConfig: newConfig,
          // Update Azure DevOps repository name if it was empty or auto-generated
          azureDevOpsConfig: newRepoName ? {
            ...state.azureDevOpsConfig,
            repositoryName: newRepoName
          } : state.azureDevOpsConfig
        };
      }),

      setOpenAPISpec: (spec: string) => set({ openAPISpec: spec }),

      setParsedOpenAPI: (parsed: ParsedOpenAPI | null) => set({ parsedOpenAPI: parsed }),

      setAutoDetectedConfig: (config: AutoDetectedConfig | null) => set({ autoDetectedConfig: config }),

      applyAutoDetectedConfig: () => set((state) => {
        const autoConfig = state.autoDetectedConfig;
        if (!autoConfig) return state;

        const newApiConfig = { ...state.apiConfig };
        let newBackendInfoEntries: BackendInfoEntry[] = [];

        // Apply auth type
        if (autoConfig.auth.type) {
          newApiConfig.authSouthbound = autoConfig.auth.type;
        }

        // Apply API Key header name if detected
        if (autoConfig.auth.type === 'ApiKey' && autoConfig.auth.apiKeyName) {
          newApiConfig.apiKeyHeaderName = autoConfig.auth.apiKeyName;
        }

        // Add backend_api_key KVM entry for ApiKey auth
        if (autoConfig.auth.type === 'ApiKey' && newApiConfig.environments) {
          const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
          for (const envName of envNames) {
            const envConfig = newApiConfig.environments[envName];
            if (envConfig && envConfig.kvms && envConfig.kvms.length > 0) {
              // Add backend_api_key entry to first KVM if not already present
              const firstKvm = envConfig.kvms[0];
              if (!firstKvm.entries) {
                firstKvm.entries = [];
              }
              const hasApiKeyEntry = firstKvm.entries.some(e => e.name === 'backend_api_key');
              if (!hasApiKeyEntry) {
                firstKvm.entries.push({
                  name: 'backend_api_key',
                  value: ''
                });
              }
            }
          }
        }

        // Apply URL variabilization (new enhanced format)
        if (autoConfig.urlVariabilization?.hasVariabilization) {
          const urlVar = autoConfig.urlVariabilization;

          // Set variabilized target path
          newApiConfig.targetPath = urlVar.variabilizedPath;

          // Store generated backend_info entries
          newBackendInfoEntries = urlVar.kvmEntries;

          // Apply per-environment hosts (for Case 2: URL comparison)
          if (urlVar.hostsPerEnvironment && Object.keys(urlVar.hostsPerEnvironment).length > 0) {
            const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
            for (const envName of envNames) {
              const host = urlVar.hostsPerEnvironment[envName];
              if (host && newApiConfig.environments?.[envName]) {
                const envConfig = newApiConfig.environments[envName];
                if (envConfig.targetServers.length > 0) {
                  envConfig.targetServers[0] = {
                    ...envConfig.targetServers[0],
                    host: host,
                  };
                }
              }
            }
          }

          // Merge backend_info KVM entries into environment KVMs
          if (newBackendInfoEntries.length > 0 && newApiConfig.environments) {
            const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
            for (const envName of envNames) {
              const envConfig = newApiConfig.environments[envName];
              if (envConfig) {
                envConfig.kvms = mergeKvmEntries(
                  envConfig.kvms || [],
                  newBackendInfoEntries,
                  envName,
                  newApiConfig.proxyName
                );
              }
            }
          }
        } else if (autoConfig.hasVariablePath && autoConfig.variabilizedBasePath) {
          // Fallback to legacy format
          newApiConfig.targetPath = autoConfig.variabilizedBasePath.targetPathTemplate;
        } else if (autoConfig.targetPath) {
          newApiConfig.targetPath = autoConfig.targetPath;
        }

        // Note: Description is NOT auto-filled from spec - it's generated from proxy name components

        // Apply environment hosts from legacy format if not already applied
        if (newApiConfig.environments && autoConfig.environmentHosts && !autoConfig.urlVariabilization?.hasVariabilization) {
          const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;

          for (const envName of envNames) {
            const envHost = autoConfig.environmentHosts[envName];
            if (envHost && newApiConfig.environments[envName]) {
              const envConfig = newApiConfig.environments[envName];
              if (envConfig.targetServers.length > 0) {
                envConfig.targetServers[0] = {
                  ...envConfig.targetServers[0],
                  host: envHost.host,
                  port: envHost.port,
                };
              }

              // Add KVM entries for variabilized paths (legacy)
              if (autoConfig.hasVariablePath && autoConfig.variabilizedBasePath) {
                for (const kvmVar of autoConfig.variabilizedBasePath.kvmVariables) {
                  const varValue = kvmVar.values[envName] || '';

                  // Find or create KVM for this variable
                  const existingKvmIndex = envConfig.kvms?.findIndex(
                    kvm => kvm.entries?.some(e => e.name === kvmVar.variableName)
                  );

                  if (envConfig.kvms && existingKvmIndex !== undefined && existingKvmIndex >= 0) {
                    // Update existing KVM entry
                    const kvm = envConfig.kvms[existingKvmIndex];
                    const entryIndex = kvm.entries?.findIndex(e => e.name === kvmVar.variableName);
                    if (entryIndex !== undefined && entryIndex >= 0 && kvm.entries) {
                      kvm.entries[entryIndex].value = varValue;
                    }
                  } else if (envConfig.kvms && envConfig.kvms.length > 0) {
                    // Add entry to first KVM
                    if (!envConfig.kvms[0].entries) {
                      envConfig.kvms[0].entries = [];
                    }
                    envConfig.kvms[0].entries.push({
                      name: kvmVar.variableName,
                      value: varValue
                    });
                  }
                }
              }
            }
          }
        }

        return {
          apiConfig: newApiConfig,
          generatedBackendInfoEntries: newBackendInfoEntries,
        };
      }),

      setGeneratedProject: (project: GeneratedProject | null) => set({ generatedProject: project }),

      updateEnvironmentConfig: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', config: EnvironmentConfig) =>
        set((state) => {
          const envs = state.apiConfig.environments;
          if (!envs) return state;

          // Update only the specified environment (no sync between environments)
          return {
            apiConfig: {
              ...state.apiConfig,
              environments: {
                ...envs,
                [env]: config
              } as {
                dev1: EnvironmentConfig;
                uat1: EnvironmentConfig;
                staging: EnvironmentConfig;
                prod1: EnvironmentConfig;
              }
            }
          };
        }),

      // Product management actions
      setProductsMode: (mode: 'single' | 'multi') =>
        set((state) => ({
          apiConfig: {
            ...state.apiConfig,
            productsMode: mode
          }
        })),

      addProduct: (_env: 'dev1' | 'uat1' | 'staging' | 'prod1', product: ApiProduct) =>
        set((state) => {
          const envs = state.apiConfig.environments;
          if (!envs) return state;

          const proxyName = state.apiConfig.proxyName || '';
          const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
          const newEnvironments = { ...envs };

          // Extract OpenAPI paths for computing default authorized paths
          const openAPIPaths = state.parsedOpenAPI?.rawSpec?.paths
            ? Object.keys(state.parsedOpenAPI.rawSpec.paths)
            : undefined;

          // Extract resource suffix from the product name to create env-specific versions
          const resourceSuffix = extractResourceSuffix(product.name, proxyName) || `product-${(envs.dev1.apiProducts?.length || 0) + 1}`;

          for (const targetEnv of envNames) {
            // Create a product with env-specific naming
            const envProduct = createProductForEnv(
              proxyName,
              resourceSuffix,
              targetEnv,
              product.authorizedPaths,
              openAPIPaths
            );

            // Preserve description and other custom fields from original
            envProduct.description = product.description || envProduct.description;
            envProduct.approvalType = product.approvalType;
            envProduct.attributes = product.attributes;

            newEnvironments[targetEnv] = {
              ...newEnvironments[targetEnv],
              apiProducts: [...(newEnvironments[targetEnv].apiProducts || []), envProduct]
            };
          }

          return {
            apiConfig: {
              ...state.apiConfig,
              environments: newEnvironments
            }
          };
        }),

      removeProduct: (_env: 'dev1' | 'uat1' | 'staging' | 'prod1', productIndex: number) =>
        set((state) => {
          const envs = state.apiConfig.environments;
          if (!envs) return state;

          // Remove product at the same index from all environments
          const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
          const newEnvironments = { ...envs };

          for (const targetEnv of envNames) {
            const envConfig = newEnvironments[targetEnv];
            newEnvironments[targetEnv] = {
              ...envConfig,
              apiProducts: envConfig.apiProducts.filter((_, i) => i !== productIndex)
            };
          }

          return {
            apiConfig: {
              ...state.apiConfig,
              environments: newEnvironments
            }
          };
        }),

      updateProduct: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', productIndex: number, updates: Partial<ApiProduct>) =>
        set((state) => {
          const envs = state.apiConfig.environments;
          if (!envs) return state;

          // Fields that should be synced across all environments
          const syncedFields: (keyof ApiProduct)[] = ['authorizedPaths', 'approvalType', 'attributes', 'resourceGroups'];
          const hasSyncedFieldUpdate = syncedFields.some(field => field in updates);

          // If updating a synced field, apply to all environments
          if (hasSyncedFieldUpdate) {
            const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
            const newEnvironments = { ...envs };

            // Extract only the synced field updates
            const syncedUpdates: Partial<ApiProduct> = {};
            for (const field of syncedFields) {
              if (field in updates) {
                (syncedUpdates as any)[field] = (updates as any)[field];
              }
            }

            for (const targetEnv of envNames) {
              const envConfig = newEnvironments[targetEnv];
              const updatedProducts = envConfig.apiProducts.map((product, i) => {
                if (i === productIndex) {
                  // For the original env, apply all updates
                  // For other envs, only apply synced fields
                  return targetEnv === env
                    ? { ...product, ...updates }
                    : { ...product, ...syncedUpdates };
                }
                return product;
              });

              newEnvironments[targetEnv] = {
                ...envConfig,
                apiProducts: updatedProducts
              };
            }

            return {
              apiConfig: {
                ...state.apiConfig,
                environments: newEnvironments
              }
            };
          }

          // For non-synced fields (name, displayName, description), only update the specific env
          const envConfig = envs[env];
          const updatedProducts = envConfig.apiProducts.map((product, i) =>
            i === productIndex ? { ...product, ...updates } : product
          );

          return {
            apiConfig: {
              ...state.apiConfig,
              environments: {
                ...envs,
                [env]: {
                  ...envConfig,
                  apiProducts: updatedProducts
                }
              }
            }
          };
        }),

      generateProductsFromPaths: () =>
        set((state) => {
          const { parsedOpenAPI, apiConfig } = state;
          if (!parsedOpenAPI || !apiConfig.proxyName) return state;

          // Extract path info from OpenAPI
          const paths: PathInfo[] = Object.entries(parsedOpenAPI.rawSpec.paths || {}).map(([path, methods]) => ({
            path,
            methods: Object.keys(methods as object).filter(m =>
              ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(m.toLowerCase())
            )
          }));

          // Generate suggestions
          const suggestions = suggestProductsFromPaths(paths, apiConfig.proxyName);

          return { suggestedProducts: suggestions };
        }),

      syncProductsToAllEnvironments: () =>
        set((state) => {
          const envs = state.apiConfig.environments;
          if (!envs) return state;

          // Use dev1 as the source
          const sourceProducts = envs.dev1.apiProducts;
          const proxyName = state.apiConfig.proxyName || '';

          // Extract OpenAPI paths for computing default authorized paths
          const openAPIPaths = state.parsedOpenAPI?.rawSpec?.paths
            ? Object.keys(state.parsedOpenAPI.rawSpec.paths)
            : undefined;

          const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
          const newEnvironments = { ...envs };

          for (const env of envNames) {
            // Create products with environment-specific names
            const envProducts = sourceProducts.map(product => {
              const resourceSuffix = extractResourceSuffix(product.name, proxyName);
              return createProductForEnv(
                proxyName,
                resourceSuffix,
                env,
                product.authorizedPaths,
                openAPIPaths
              );
            });

            newEnvironments[env] = {
              ...newEnvironments[env],
              apiProducts: envProducts
            };
          }

          return {
            apiConfig: {
              ...state.apiConfig,
              environments: newEnvironments
            }
          };
        }),

      setSuggestedProducts: (products: SuggestedProduct[]) =>
        set({ suggestedProducts: products }),

      applySelectedSuggestions: (suggestions: SuggestedProduct[]) =>
        set((state) => {
          const selected = suggestions.filter(s => s.selected);
          if (selected.length === 0) return state;

          const envs = state.apiConfig.environments;
          if (!envs) return state;

          const proxyName = state.apiConfig.proxyName || '';
          const envNames = ['dev1', 'uat1', 'staging', 'prod1'] as const;
          const newEnvironments = { ...envs };

          for (const env of envNames) {
            const newProducts: ApiProduct[] = selected.map(suggestion =>
              createProductForEnv(
                proxyName,
                suggestion.name,
                env,
                suggestion.authorizedPaths
              )
            );

            newEnvironments[env] = {
              ...newEnvironments[env],
              apiProducts: newProducts
            };
          }

          return {
            apiConfig: {
              ...state.apiConfig,
              productsMode: 'multi',
              environments: newEnvironments
            },
            suggestedProducts: []
          };
        }),

      setGeneratedBackendInfoEntries: (entries: BackendInfoEntry[]) =>
        set({ generatedBackendInfoEntries: entries }),

      updateBackendInfoValue: (kvmIndex: number, environment: string, value: string) =>
        set((state) => {
          const updatedEntries = updateKvmValue(
            state.generatedBackendInfoEntries,
            kvmIndex,
            environment,
            value
          );

          // Also update the KVM in the environment config
          const newApiConfig = { ...state.apiConfig };
          if (newApiConfig.environments) {
            const envConfig = newApiConfig.environments[environment as 'dev1' | 'uat1' | 'staging' | 'prod1'];
            if (envConfig) {
              // Find the backend-info KVM and update the entry
              const backendInfoKvm = envConfig.kvms?.find(
                kvm => kvm.name.endsWith('.backend-info') || kvm.name === 'backend-info'
              );
              if (backendInfoKvm?.entries) {
                const entryToUpdate = backendInfoKvm.entries.find(
                  e => e.name === `backend_info_${kvmIndex}`
                );
                if (entryToUpdate) {
                  entryToUpdate.value = value;
                }
              }
            }
          }

          return {
            generatedBackendInfoEntries: updatedEntries,
            apiConfig: newApiConfig,
          };
        }),

      updateAzureDevOpsConfig: (config: Partial<AzureDevOpsConfig>) =>
        set((state) => ({
          azureDevOpsConfig: {
            ...state.azureDevOpsConfig,
            ...config
          }
        })),

      updateTemplateRepoConfig: (config: Partial<TemplateRepoConfig>) =>
        set((state) => ({
          templateRepoConfig: {
            ...state.templateRepoConfig,
            ...config
          }
        })),

      updatePortalConfig: (config: Partial<PortalConfig>) =>
        set((state) => ({
          portalConfig: {
            ...state.portalConfig,
            ...config,
            // Handle nested portalUrls update
            portalUrls: config.portalUrls
              ? { ...state.portalConfig.portalUrls, ...config.portalUrls }
              : state.portalConfig.portalUrls
          }
        })),

      setSettingsModalOpen: (open: boolean) => set({ isSettingsModalOpen: open }),

      setSettingsActiveTab: (tab: 'azure-devops' | 'template-sync' | 'portal') => set({ settingsActiveTab: tab }),

      setTemplateOverride: (id: string, content: string) =>
        set((state) => ({
          templateOverrides: {
            ...state.templateOverrides,
            [id]: content
          }
        })),

      removeTemplateOverride: (id: string) =>
        set((state) => {
          const { [id]: removed, ...rest } = state.templateOverrides;
          return { templateOverrides: rest };
        }),

      clearTemplateOverrides: () => set({ templateOverrides: {} }),

      setTheme: (theme: Theme) => {
        set({ theme });
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },

      getCompleteConfig: () => {
        const { apiConfig, autoDetectedConfig } = get();

        // Check all required fields including new naming convention fields
        // Note: targetPath is optional - it can come from autoDetectedConfig or be omitted
        if (!apiConfig.entity || !apiConfig.domain || !apiConfig.backendApps?.length ||
            !apiConfig.businessObject || !apiConfig.version ||
            !apiConfig.proxyBasepath || !apiConfig.authSouthbound) {
          return null;
        }

        // Build complete config, using autoDetectedConfig values as fallbacks
        const completeConfig = {
          ...apiConfig,
          // Use description from apiConfig or generate a default
          description: apiConfig.description || `API Proxy for ${apiConfig.businessObject} ${apiConfig.version}`,
          // Use targetPath from apiConfig or autoDetectedConfig or default to "/"
          targetPath: apiConfig.targetPath || autoDetectedConfig?.targetPath || '/',
          // oasFormat and oasVersion have sensible defaults
          oasFormat: apiConfig.oasFormat || 'json',
          oasVersion: apiConfig.oasVersion || '3.0.0',
        };

        return completeConfig as ApiConfiguration;
      },

      resetForNewSpec: () => set({
        // Reset API configuration (keep only what's not auto-filled)
        apiConfig: {},
        // Clear parsed OpenAPI
        parsedOpenAPI: null,
        // Clear auto-detected config
        autoDetectedConfig: null,
        // Clear generated project
        generatedProject: null,
        // Clear generated backend info entries
        generatedBackendInfoEntries: [],
        // Clear suggested products
        suggestedProducts: [],
      })
    }),
    {
      name: 'apigee-generator-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist Azure DevOps config (without repositoryName) and template overrides
        azureDevOpsConfig: {
          organization: state.azureDevOpsConfig.organization,
          project: state.azureDevOpsConfig.project,
          personalAccessToken: state.azureDevOpsConfig.personalAccessToken,
          defaultBranch: state.azureDevOpsConfig.defaultBranch,
          // repositoryName is NOT persisted - it's dynamic per project
          repositoryName: DEFAULT_AZURE_DEVOPS_CONFIG.repositoryName,
          // createRepository is always true (not configurable)
          createRepository: true,
          enabled: state.azureDevOpsConfig.enabled,
        },
        // Persist template repository config
        templateRepoConfig: {
          enabled: state.templateRepoConfig.enabled,
          organization: state.templateRepoConfig.organization,
          project: state.templateRepoConfig.project,
          repositoryName: state.templateRepoConfig.repositoryName,
          branch: state.templateRepoConfig.branch,
          autoSyncOnStartup: state.templateRepoConfig.autoSyncOnStartup,
          lastSyncCommit: state.templateRepoConfig.lastSyncCommit,
          lastSyncDate: state.templateRepoConfig.lastSyncDate,
        },
        // Persist portal configuration
        portalConfig: {
          oktaNonProdUrl: state.portalConfig.oktaNonProdUrl,
          oktaProdUrl: state.portalConfig.oktaProdUrl,
          portalUrls: state.portalConfig.portalUrls,
        },
        templateOverrides: state.templateOverrides,
        // Persist theme preference
        theme: state.theme,
      }),
    }
  )
);
