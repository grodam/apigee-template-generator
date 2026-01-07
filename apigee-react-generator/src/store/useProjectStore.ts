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

const createDefaultEnvironmentConfig = (env: string, proxyName: string): EnvironmentConfig => ({
  name: env,
  targetServers: [{
    name: `${proxyName}.backend`,
    host: `backend-${env}.elis.com`,
    isEnabled: true,
    port: 443,
    sSLInfo: {
      enabled: true,
      clientAuthEnabled: false,
    }
  }],
  apiProducts: [{
    name: `${proxyName}-product-${env}`,
    displayName: `${proxyName} Product ${env.toUpperCase()}`,
    approvalType: 'auto',
    environments: [env],
    attributes: [
      { name: 'access', value: env === 'prod1' ? 'private' : 'public' }
    ]
  }],
  developers: [],
  developerApps: [],
  kvms: []
});

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

        // Auto-calculate proxyName if entity, apiname, and version are present
        if (newConfig.entity && newConfig.apiname && newConfig.version) {
          newConfig.proxyName = generateProxyName(newConfig.entity, newConfig.apiname, newConfig.version);

          // Initialize environments with defaults if not present
          if (!newConfig.environments) {
            newConfig.environments = {
              dev1: createDefaultEnvironmentConfig('dev1', newConfig.proxyName),
              uat1: createDefaultEnvironmentConfig('uat1', newConfig.proxyName),
              staging: createDefaultEnvironmentConfig('staging', newConfig.proxyName),
              prod1: createDefaultEnvironmentConfig('prod1', newConfig.proxyName),
            };
          }
        }

        return { apiConfig: newConfig };
      }),

      setOpenAPISpec: (spec: string) => set({ openAPISpec: spec }),

      setParsedOpenAPI: (parsed: ParsedOpenAPI | null) => set({ parsedOpenAPI: parsed }),

      setGeneratedProject: (project: GeneratedProject | null) => set({ generatedProject: project }),

      updateEnvironmentConfig: (env: 'dev1' | 'uat1' | 'staging' | 'prod1', config: EnvironmentConfig) =>
        set((state) => ({
          apiConfig: {
            ...state.apiConfig,
            environments: {
              ...state.apiConfig.environments,
              [env]: config
            }
          }
        })),

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

        if (!apiConfig.entity || !apiConfig.apiname || !apiConfig.version ||
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
          createRepository: state.azureDevOpsConfig.createRepository,
          createPipelines: state.azureDevOpsConfig.createPipelines,
          pushAfterGeneration: state.azureDevOpsConfig.pushAfterGeneration,
          enabled: state.azureDevOpsConfig.enabled,
        },
        templateOverrides: state.templateOverrides,
      }),
    }
  )
);
