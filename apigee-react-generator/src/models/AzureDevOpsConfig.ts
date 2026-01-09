export interface AzureDevOpsConfig {
  enabled: boolean;                    // Enable Azure DevOps integration
  organization: string;                // Azure DevOps organization name
  project: string;                     // Project name
  repositoryName: string;              // Repository name
  personalAccessToken?: string;        // PAT token (not stored, only used during push)
  createRepository: boolean;           // Always true - auto-create repository if it doesn't exist
  pushAfterGeneration: boolean;        // Unused - kept for backward compatibility
  createPipelines: boolean;            // Unused - kept for backward compatibility
  defaultBranch: string;               // Default branch (main, master, develop, etc.)
}

export interface AzureDevOpsRepository {
  id: string;
  name: string;
  url: string;
  remoteUrl: string;
  sshUrl: string;
  webUrl: string;
}

export interface AzureDevOpsPipeline {
  id: number;
  name: string;
  folder: string;
  url: string;
}

export const DEFAULT_AZURE_DEVOPS_CONFIG: AzureDevOpsConfig = {
  enabled: false,
  organization: '',
  project: '',
  repositoryName: '',
  personalAccessToken: '',
  createRepository: true,
  pushAfterGeneration: true,
  createPipelines: false,
  defaultBranch: 'main'
};
