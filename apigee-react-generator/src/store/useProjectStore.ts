import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ApiConfiguration, EnvironmentConfig } from '../models/ApiConfiguration';
import type { ParsedOpenAPI } from '../models/OpenAPISpec';
import type { GeneratedProject } from '../models/GeneratedProject';
import type { AzureDevOpsConfig, TemplateRepoConfig } from '../models/AzureDevOpsConfig';
import type { AutoDetectedConfig, BackendInfoEntry } from '../models/AutoDetectedConfig';
import { DEFAULT_AZURE_DEVOPS_CONFIG, DEFAULT_TEMPLATE_REPO_CONFIG } from '../models/AzureDevOpsConfig';
import { generateProxyName } from '../utils/stringUtils';
import { mergeKvmEntries, updateBackendInfoValue as updateKvmValue } from '../utils/kvmGenerator';

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

  // Generated project
  generatedProject: GeneratedProject | null;

  // Settings modal state
  isSettingsModalOpen: boolean;
  settingsActiveTab: 'azure-devops' | 'template-sync';

  // Template overrides (persisted)
  templateOverrides: Record<string, string>;

  // Theme
  theme: Theme;

  // Generated backend_info KVM entries from URL variabilization
  generatedBackendInfoEntries: BackendInfoEntry[];

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

  // Backend info actions
  setGeneratedBackendInfoEntries: (entries: BackendInfoEntry[]) => void;
  updateBackendInfoValue: (kvmIndex: number, environment: string, value: string) => void;

  // Azure DevOps actions
  updateAzureDevOpsConfig: (config: Partial<AzureDevOpsConfig>) => void;

  // Template Repository actions
  updateTemplateRepoConfig: (config: Partial<TemplateRepoConfig>) => void;

  // Settings modal actions
  setSettingsModalOpen: (open: boolean) => void;
  setSettingsActiveTab: (tab: 'azure-devops' | 'template-sync') => void;

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
  const { env, entity, backendApps, businessObject, version } = params;
  const envLabel = normalizeEnvName(env).toUpperCase();
  const entityLabel = entity === 'elis' ? 'internal' : 'external';
  const backendList = backendApps.join(', ').toUpperCase();
  return `API Product for ${businessObject} (${version}) - Environment: ${envLabel}.\nBackend: ${backendList}.\nType: ${entityLabel}.`;
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
      generatedProject: null,
      isSettingsModalOpen: false,
      settingsActiveTab: 'azure-devops' as const,
      templateOverrides: {},
      theme: 'light' as Theme,
      generatedBackendInfoEntries: [],

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

      setSettingsModalOpen: (open: boolean) => set({ isSettingsModalOpen: open }),

      setSettingsActiveTab: (tab: 'azure-devops' | 'template-sync') => set({ settingsActiveTab: tab }),

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
        templateOverrides: state.templateOverrides,
        // Persist theme preference
        theme: state.theme,
      }),
    }
  )
);
