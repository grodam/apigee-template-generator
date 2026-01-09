import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ApiConfiguration, EnvironmentConfig } from '../models/ApiConfiguration';
import type { ParsedOpenAPI } from '../models/OpenAPISpec';
import type { GeneratedProject } from '../models/GeneratedProject';
import type { AzureDevOpsConfig } from '../models/AzureDevOpsConfig';
import { DEFAULT_AZURE_DEVOPS_CONFIG } from '../models/AzureDevOpsConfig';
import { generateProxyName } from '../utils/stringUtils';

interface ProjectState {
  // Current step in the wizard
  currentStep: number;

  // API Configuration
  apiConfig: Partial<ApiConfiguration>;

  // OpenAPI Specification
  openAPISpec: string;
  parsedOpenAPI: ParsedOpenAPI | null;

  // Azure DevOps Configuration
  azureDevOpsConfig: AzureDevOpsConfig;

  // Generated project
  generatedProject: GeneratedProject | null;

  // Settings modal state
  isSettingsModalOpen: boolean;
  settingsActiveTab: 'templates' | 'azure-devops';

  // Template overrides (persisted)
  templateOverrides: Record<string, string>;

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;

  updateApiConfig: (config: Partial<ApiConfiguration>) => void;
  setOpenAPISpec: (spec: string) => void;
  setParsedOpenAPI: (parsed: ParsedOpenAPI | null) => void;
  setGeneratedProject: (project: GeneratedProject | null) => void;

  updateEnvironmentConfig: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', config: EnvironmentConfig) => void;

  // Azure DevOps actions
  updateAzureDevOpsConfig: (config: Partial<AzureDevOpsConfig>) => void;

  // Settings modal actions
  setSettingsModalOpen: (open: boolean) => void;
  setSettingsActiveTab: (tab: 'templates' | 'azure-devops') => void;

  // Template override actions
  setTemplateOverride: (id: string, content: string) => void;
  removeTemplateOverride: (id: string) => void;
  clearTemplateOverrides: () => void;

  // Helper to get complete API config with defaults
  getCompleteConfig: () => ApiConfiguration | null;
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

// Helper to capitalize first letter
const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

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
  const { entity, backendApps, businessObject, version } = params;
  const envNormalized = normalizeEnvName(params.env);
  const entityLabel = entity === 'elis' ? 'internal' : 'external';
  const backendList = backendApps.join(', ').toUpperCase();
  return `API Product for ${businessObject} (${version}) - Environment: ${envNormalized.toUpperCase()}.\nBackend: ${backendList}.\nType: ${entityLabel}.`;
};

const createDefaultEnvironmentConfig = (params: EnvConfigParams): EnvironmentConfig => {
  const { env, proxyName, entity, backendApps, businessObject, version } = params;
  const envNormalized = normalizeEnvName(env);
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
      approvalType: 'auto',
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
      azureDevOpsConfig: DEFAULT_AZURE_DEVOPS_CONFIG,
      generatedProject: null,
      isSettingsModalOpen: false,
      settingsActiveTab: 'templates' as const,
      templateOverrides: {},

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

      setGeneratedProject: (project: GeneratedProject | null) => set({ generatedProject: project }),

      updateEnvironmentConfig: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', config: EnvironmentConfig) =>
        set((state) => {
          const envs = state.apiConfig.environments;
          if (!envs) return state;

          // If updating dev1, sync KVM entries to all other environments
          if (env === 'dev1' && config.kvms) {
            const syncedEnvironments = {
              dev1: config,
              uat1: {
                ...envs.uat1,
                kvms: config.kvms.map(devKvm => {
                  const existingKvm = envs.uat1.kvms?.find(k => k.name === devKvm.name);
                  return {
                    ...devKvm,
                    // Keep the same name, encrypted status, and entries from dev1
                    entries: devKvm.entries || []
                  };
                })
              },
              staging: {
                ...envs.staging,
                kvms: config.kvms.map(devKvm => {
                  return {
                    ...devKvm,
                    entries: devKvm.entries || []
                  };
                })
              },
              prod1: {
                ...envs.prod1,
                kvms: config.kvms.map(devKvm => {
                  return {
                    ...devKvm,
                    entries: devKvm.entries || []
                  };
                })
              },
            };

            return {
              apiConfig: {
                ...state.apiConfig,
                environments: syncedEnvironments
              }
            };
          }

          // For other environments, just update that environment
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

      updateAzureDevOpsConfig: (config: Partial<AzureDevOpsConfig>) =>
        set((state) => ({
          azureDevOpsConfig: {
            ...state.azureDevOpsConfig,
            ...config
          }
        })),

      setSettingsModalOpen: (open: boolean) => set({ isSettingsModalOpen: open }),

      setSettingsActiveTab: (tab: 'templates' | 'azure-devops') => set({ settingsActiveTab: tab }),

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

      getCompleteConfig: () => {
        const { apiConfig } = get();

        // Check all required fields including new naming convention fields
        if (!apiConfig.entity || !apiConfig.domain || !apiConfig.backendApps?.length ||
            !apiConfig.businessObject || !apiConfig.version ||
            !apiConfig.description || !apiConfig.proxyBasepath || !apiConfig.targetPath ||
            !apiConfig.authSouthbound || !apiConfig.oasFormat || !apiConfig.oasVersion) {
          return null;
        }

        return apiConfig as ApiConfiguration;
      }
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
          // createRepository and pushAfterGeneration are always true (not configurable)
          createRepository: true,
          createPipelines: DEFAULT_AZURE_DEVOPS_CONFIG.createPipelines,
          pushAfterGeneration: true,
          enabled: state.azureDevOpsConfig.enabled,
        },
        templateOverrides: state.templateOverrides,
      }),
    }
  )
);
