export interface AzureDevOpsConfig {
  enabled: boolean;                    // Enable Azure DevOps integration
  organization: string;                // Azure DevOps organization name
  project: string;                     // Project name
  repositoryName: string;              // Repository name
  personalAccessToken?: string;        // PAT token (not stored, only used during push)
  createRepository: boolean;           // Always true - auto-create repository if it doesn't exist
  defaultBranch: string;               // Default branch (main, master, develop, etc.)
  acceptInvalidCerts?: boolean;        // Accept invalid SSL certs (for corporate proxy with SSL inspection)
}

// Configuration for template repository synchronization
export interface TemplateRepoConfig {
  enabled: boolean;                    // Enable template sync from Azure DevOps
  organization: string;                // Azure DevOps organization (can be different from push org)
  project: string;                     // Project name containing the templates repo
  repositoryName: string;              // Template repository name (e.g., 'apigee-templates')
  branch: string;                      // Branch to sync from (e.g., 'main')
  lastSyncCommit?: string;             // Last synced commit SHA
  lastSyncDate?: string;               // ISO date of last sync
  autoSyncOnStartup: boolean;          // Auto-sync when app starts
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
  defaultBranch: 'main',
  acceptInvalidCerts: false
};

export const DEFAULT_TEMPLATE_REPO_CONFIG: TemplateRepoConfig = {
  enabled: false,
  organization: 'elisdevops',
  project: 'Apigee',
  repositoryName: 'apigee-templates',
  branch: 'main',
  autoSyncOnStartup: true
};

// Portal and OAuth Configuration
export interface PortalConfig {
  // Okta URLs (one for non-prod, one for prod)
  oktaNonProdUrl: string;              // Ex: "https://elis-employees.oktapreview.com/oauth2/aus4i6p4rkZwGMAJC0x7/v1/token"
  oktaProdUrl: string;                 // Ex: "https://elis-employees.okta.com/oauth2/aus4i6p4rkZwGMAJC0x7/v1/token"

  // Portal base URLs per environment
  portalUrls: {
    dev1: string;                      // Ex: "https://dev-api.elis.com"
    uat1: string;                      // Ex: "https://uat-api.elis.com"
    staging: string;                   // Ex: "https://staging-api.elis.com"
    prod1: string;                     // Ex: "https://api.elis.com"
  };
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  oktaNonProdUrl: 'https://elis-employees.oktapreview.com/oauth2/aus4i6p4rkZwGMAJC0x7/v1/token',
  oktaProdUrl: 'https://elis-employees.okta.com/oauth2/aus4i6p4rkZwGMAJC0x7/v1/token',
  portalUrls: {
    dev1: 'https://dev-api.elis.com',
    uat1: 'https://uat-api.elis.com',
    staging: 'https://staging-api.elis.com',
    prod1: 'https://api.elis.com'
  }
};
