import type { AzureDevOpsConfig, AzureDevOpsRepository, AzureDevOpsPipeline } from '../../models/AzureDevOpsConfig';
import type { GeneratedProject } from '../../models/GeneratedProject';
import { config as appConfig } from '../../utils/config';
import { logger } from '../../utils/logger';
import { fetchWithTimeout, validateHttps } from '../../utils/fetchUtils';
import { tauriFetch, isTauri } from '../../utils/tauriHttp';

const log = logger.scope('AzureDevOpsService');

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 30000;

/** Request body type for API calls */
interface RequestBody {
  [key: string]: unknown;
}

export class AzureDevOpsService {
  private baseUrl: string;
  private token: string;
  private useProxy: boolean;
  private proxyUrl: string;

  constructor(organization: string, token: string, useProxy: boolean = true) {
    this.token = token;
    this.baseUrl = `https://dev.azure.com/${organization}`;
    this.useProxy = useProxy;
    this.proxyUrl = appConfig.proxyUrl;

    // Validate HTTPS for Azure DevOps URL (always HTTPS)
    validateHttps(this.baseUrl);
  }

  /**
   * Make an API request (via Tauri HTTP, proxy, or direct) with timeout
   */
  private async makeRequest(
    url: string,
    method: string = 'GET',
    body?: RequestBody
  ): Promise<Response> {
    // Validate target URL uses HTTPS
    validateHttps(url);

    // Use Tauri HTTP plugin when running in Tauri (no CORS restrictions)
    if (isTauri()) {
      const response = await tauriFetch(url, {
        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        headers: this.getHeaders() as Record<string, string>,
        body,
        timeout: REQUEST_TIMEOUT,
      });

      // Create a Response-like object from Tauri response
      return new Response(
        JSON.stringify(response.data),
        {
          status: response.status,
          statusText: response.ok ? 'OK' : 'Error',
          headers: new Headers(response.headers)
        }
      );
    }

    // Fall back to proxy for browser development
    if (this.useProxy) {
      // Use proxy server to avoid CORS
      const response = await fetchWithTimeout(
        this.proxyUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            method,
            headers: this.getHeaders(),
            body
          })
        },
        REQUEST_TIMEOUT
      );

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${method} ${url} - ${response.status} ${response.statusText}`);
      }

      const proxyResponse = await response.json();

      // Create a Response-like object from proxy response
      return new Response(
        JSON.stringify(proxyResponse.data),
        {
          status: proxyResponse.statusCode,
          statusText: proxyResponse.statusCode === 200 ? 'OK' : 'Error',
          headers: new Headers(proxyResponse.headers)
        }
      );
    } else {
      // Direct API call (may have CORS issues in browser)
      return fetchWithTimeout(
        url,
        {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined
        },
        REQUEST_TIMEOUT
      );
    }
  }

  /**
   * Test connection to Azure DevOps
   */
  async testConnection(): Promise<boolean> {
    const url = `${this.baseUrl}/_apis/projects?api-version=7.0`;
    log.info(`Testing connection to: ${url}`);

    try {
      const response = await this.makeRequest(url, 'GET');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        log.error(`Azure DevOps connection test failed: ${response.status}`, { status: response.status, data: errorData });

        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your Personal Access Token.');
        } else if (response.status === 404) {
          throw new Error('Organization not found. Please verify your organization name.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. Your PAT may lack required permissions or the organization restricts access.');
        } else {
          throw new Error(`Connection failed with status ${response.status}. Please verify your settings.`);
        }
      }

      log.info('Azure DevOps connection test successful');
      return response.ok;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Azure DevOps connection test failed:', { error: errorMessage, url });
      // Re-throw the original error - it already contains detailed info from tauriFetch
      throw error;
    }
  }

  /**
   * Check if repository exists
   */
  async repositoryExists(projectName: string, repositoryName: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${projectName}/_apis/git/repositories/${repositoryName}?api-version=7.0`;
      const response = await this.makeRequest(url, 'GET');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get project details by name
   */
  async getProject(projectName: string): Promise<{ id: string; name: string }> {
    try {
      const url = `${this.baseUrl}/_apis/projects/${encodeURIComponent(projectName)}?api-version=7.0`;
      const response = await this.makeRequest(url, 'GET');

      if (!response.ok) {
        throw new Error('Project not found');
      }

      const data = await response.json();
      return {
        id: data.id,
        name: data.name
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get project details';
      throw new Error(message);
    }
  }

  /**
   * Create a new repository in Azure DevOps
   */
  async createRepository(
    projectName: string,
    repositoryName: string
  ): Promise<AzureDevOpsRepository> {
    try {
      // First, get the project ID
      const project = await this.getProject(projectName);

      const url = `${this.baseUrl}/${projectName}/_apis/git/repositories?api-version=7.0`;

      const body = {
        name: repositoryName,
        project: {
          id: project.id
        }
      };

      const response = await this.makeRequest(url, 'POST', body);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMessage = errorData.message || 'Unknown error';

        if (response.status === 400) {
          throw new Error(`Invalid request: ${errorMessage}`);
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Your PAT token may have expired or lacks permissions.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Your PAT token needs "Code (Read, Write, & Manage)" permissions.');
        } else if (response.status === 409) {
          throw new Error(`Repository "${repositoryName}" already exists in project "${projectName}".`);
        } else {
          throw new Error(`Failed to create repository (${response.status}): ${errorMessage}`);
        }
      }

      const data = await response.json();

      return {
        id: data.id,
        name: data.name,
        url: data.url,
        remoteUrl: data.remoteUrl,
        sshUrl: data.sshUrl,
        webUrl: data.webUrl
      };
    } catch (error) {
      log.error('Failed to create repository:', error);
      const message = error instanceof Error ? error.message : 'Failed to create repository in Azure DevOps';
      throw new Error(message);
    }
  }

  /**
   * Initialize repository with a README file
   */
  async initializeRepository(
    projectName: string,
    repositoryName: string,
    defaultBranch: string = 'main'
  ): Promise<void> {
    try {
      const repository = await this.getRepository(projectName, repositoryName);

      // Create initial commit with README
      const url = `${this.baseUrl}/${projectName}/_apis/git/repositories/${repository.id}/pushes?api-version=7.0`;

      const readmeContent = `# ${repositoryName}\n\nApigee proxy generated automatically.\n`;

      const body = {
        refUpdates: [
          {
            name: `refs/heads/${defaultBranch}`,
            oldObjectId: '0000000000000000000000000000000000000000'
          }
        ],
        commits: [
          {
            comment: 'Initial commit',
            changes: [
              {
                changeType: 'add',
                item: {
                  path: '/README.md'
                },
                newContent: {
                  content: Buffer.from(readmeContent).toString('base64'),
                  contentType: 'base64encoded'
                }
              }
            ]
          }
        ]
      };

      const response = await this.makeRequest(url, 'POST', body);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to initialize repository: ${error}`);
      }
    } catch (error) {
      // If repository is already initialized, ignore the error
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Get list of existing files in repository
   */
  private async getExistingFiles(
    projectName: string,
    repositoryId: string,
    branch: string
  ): Promise<Set<string>> {
    const existingFiles = new Set<string>();

    try {
      const url = `${this.baseUrl}/${projectName}/_apis/git/repositories/${repositoryId}/items?recursionLevel=Full&versionDescriptor.version=${branch}&api-version=7.0`;
      const response = await this.makeRequest(url, 'GET');

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          data.value.forEach((item: any) => {
            if (!item.isFolder) {
              existingFiles.add(item.path);
            }
          });
        }
      }
    } catch (error) {
      // If we can't get existing files, assume none exist
      log.debug('Could not fetch existing files, assuming empty repository');
    }

    return existingFiles;
  }

  /**
   * Push all files from generated project to Azure DevOps repository
   */
  async pushFilesToRepository(
    config: AzureDevOpsConfig,
    project: GeneratedProject,
    repository: AzureDevOpsRepository,
    onProgress?: (currentBatch: number, totalBatches: number, totalFiles: number) => void
  ): Promise<void> {
    try {
      // Get list of existing files in the repository
      const existingFiles = await this.getExistingFiles(config.project, repository.id, config.defaultBranch);

      // Azure DevOps Git change item interface
      interface GitChange {
        changeType: 'add' | 'edit' | 'delete';
        item: { path: string };
        newContent?: { content: string; contentType: string };
      }

      // Convert files to Azure DevOps Git changes format
      const changes: GitChange[] = [];

      project.files.forEach((content, filePath) => {
        const fullPath = `/${filePath}`;
        const fileExists = existingFiles.has(fullPath);

        changes.push({
          changeType: fileExists ? 'edit' : 'add',
          item: {
            path: fullPath
          },
          newContent: {
            content: Buffer.from(content).toString('base64'),
            contentType: 'base64encoded'
          }
        });
      });

      // Get the latest commit from main branch
      let oldObjectId = '0000000000000000000000000000000000000000';

      try {
        const refsUrl = `${this.baseUrl}/${config.project}/_apis/git/repositories/${repository.id}/refs?filter=heads/${config.defaultBranch}&api-version=7.0`;
        const refsResponse = await this.makeRequest(refsUrl, 'GET');

        if (refsResponse.ok) {
          const refsData = await refsResponse.json();
          if (refsData.value && refsData.value.length > 0) {
            oldObjectId = refsData.value[0].objectId;
          }
        }
      } catch (error) {
        // Branch doesn't exist yet, will create it
        log.debug('Branch does not exist yet, will create it');
      }

      // Split changes into batches (Azure DevOps has a limit per push)
      const batchSize = 100;
      const batches: GitChange[][] = [];

      for (let i = 0; i < changes.length; i += batchSize) {
        batches.push(changes.slice(i, i + batchSize));
      }

      // Push each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const isFirstBatch = i === 0;
        const isLastBatch = i === batches.length - 1;

        // Report progress
        if (onProgress) {
          onProgress(i + 1, batches.length, project.files.size);
        }

        const url = `${this.baseUrl}/${config.project}/_apis/git/repositories/${repository.id}/pushes?api-version=7.0`;

        const body = {
          refUpdates: [
            {
              name: `refs/heads/${config.defaultBranch}`,
              oldObjectId: oldObjectId
            }
          ],
          commits: [
            {
              comment: isFirstBatch
                ? `Update Apigee proxy - ${project.files.size} files (batch ${i + 1}/${batches.length})`
                : `Update files batch ${i + 1}/${batches.length}`,
              changes: batch
            }
          ]
        };

        const response = await this.makeRequest(url, 'POST', body);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          const errorMessage = errorData.message || 'Unknown error';

          if (response.status === 400) {
            // Check if files already exist
            if (errorMessage.includes('already exists')) {
              throw new Error('Files already exist in the repository. The repository already contains these files. Please use a different repository name or delete the existing repository first.');
            }
            throw new Error(`Invalid request for batch ${i + 1}: ${errorMessage}`);
          } else if (response.status === 401) {
            throw new Error('Authentication failed during push. Your PAT token may have expired.');
          } else if (response.status === 403) {
            throw new Error('Access denied during push. Please check your permissions.');
          } else if (response.status === 404) {
            throw new Error(`Repository or branch not found. Batch ${i + 1} failed.`);
          } else {
            throw new Error(`Failed to push batch ${i + 1} (${response.status}): ${errorMessage}`);
          }
        }

        // Update oldObjectId for next batch
        if (!isLastBatch) {
          const pushData = await response.json();
          if (pushData.commits && pushData.commits.length > 0) {
            oldObjectId = pushData.commits[0].commitId;
          }
        }
      }
    } catch (error) {
      log.error('Failed to push files:', error);
      const message = error instanceof Error ? error.message : 'Failed to push files to repository';
      throw new Error(message);
    }
  }

  /**
   * Push generated project to Azure DevOps repository
   */
  async pushProject(
    config: AzureDevOpsConfig,
    project: GeneratedProject,
    onProgress?: (currentBatch: number, totalBatches: number, totalFiles: number) => void
  ): Promise<{ success: boolean; message: string; repositoryUrl?: string }> {
    try {
      // Step 1: Check if repository exists
      const exists = await this.repositoryExists(config.project, config.repositoryName);

      let repository: AzureDevOpsRepository;

      // Step 2: Create repository if it doesn't exist
      if (!exists) {
        repository = await this.createRepository(
          config.project,
          config.repositoryName
        );
      } else {
        // Get repository details
        repository = await this.getRepository(config.project, config.repositoryName);
      }

      // Step 3: Push all files to the repository
      await this.pushFilesToRepository(config, project, repository, onProgress);

      return {
        success: true,
        message: `Successfully pushed ${project.files.size} files to Azure DevOps repository: ${config.repositoryName}`,
        repositoryUrl: repository.webUrl
      };
    } catch (error) {
      log.error('Push to Azure DevOps failed:', error);

      let errorMessage = error instanceof Error ? error.message : 'Failed to push to Azure DevOps';

      // Add additional context based on error type
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('CORS')) {
        errorMessage = 'Network error: Unable to connect to Azure DevOps. Please ensure the proxy server is running.';
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        errorMessage = 'Authentication failed. Your Personal Access Token is invalid or expired.';
      } else if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
        errorMessage = 'Access denied. Your PAT token lacks required permissions. Please ensure it has "Code (Read, Write, & Manage)" scope.';
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Get repository details
   */
  async getRepository(projectName: string, repositoryName: string): Promise<AzureDevOpsRepository> {
    try {
      const url = `${this.baseUrl}/${projectName}/_apis/git/repositories/${repositoryName}?api-version=7.0`;
      const response = await this.makeRequest(url, 'GET');

      if (!response.ok) {
        throw new Error('Repository not found');
      }

      const data = await response.json();

      return {
        id: data.id,
        name: data.name,
        url: data.url,
        remoteUrl: data.remoteUrl,
        sshUrl: data.sshUrl,
        webUrl: data.webUrl
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get repository details';
      throw new Error(message);
    }
  }

  /**
   * Create CI/CD pipeline
   * @todo Implement pipeline creation functionality
   */
  async createPipeline(
    _projectName: string,
    _repositoryName: string,
    _pipelineName: string
  ): Promise<AzureDevOpsPipeline> {
    log.warn('Pipeline creation is not yet implemented');
    throw new Error('Pipeline creation not yet implemented');
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`:${this.token}`)}`
    };
  }

  /**
   * Generate git commands for manual push
   */
  static generateGitCommands(
    repositoryUrl: string,
    branch: string = 'main'
  ): string {
    return `# Initialize Git and push to Azure DevOps
git init
git add .
git commit -m "Initial commit - Generated Apigee proxy"
git branch -M ${branch}
git remote add origin ${repositoryUrl}
git push -u origin ${branch}`;
  }
}
