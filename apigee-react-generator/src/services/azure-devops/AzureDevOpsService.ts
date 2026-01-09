import type { AzureDevOpsConfig, AzureDevOpsRepository, AzureDevOpsPipeline } from '../../models/AzureDevOpsConfig';
import type { GeneratedProject } from '../../models/GeneratedProject';

export class AzureDevOpsService {
  private baseUrl: string;
  private token: string;
  private organization: string;
  private useProxy: boolean;
  private proxyUrl: string;

  constructor(organization: string, token: string, useProxy: boolean = true) {
    this.organization = organization;
    this.token = token;
    this.baseUrl = `https://dev.azure.com/${organization}`;
    this.useProxy = useProxy;
    this.proxyUrl = 'http://localhost:3001/api/azure-devops-proxy';
  }

  /**
   * Make an API request (via proxy or direct)
   */
  private async makeRequest(
    url: string,
    method: string = 'GET',
    body?: any
  ): Promise<Response> {
    if (this.useProxy) {
      // Use proxy server to avoid CORS
      const response = await fetch(this.proxyUrl, {
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
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.statusText}`);
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
      // Direct API call (may have CORS issues)
      return fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
    }
  }

  /**
   * Test connection to Azure DevOps
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/_apis/projects?api-version=7.0`;
      const response = await this.makeRequest(url, 'GET');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Azure DevOps connection test failed:', response.status, errorData);

        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your Personal Access Token.');
        } else if (response.status === 404) {
          throw new Error('Organization not found. Please verify your organization name.');
        }
      }

      return response.ok;
    } catch (error: any) {
      console.error('Azure DevOps connection test failed:', error);
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
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get project details');
    }
  }

  /**
   * Create a new repository in Azure DevOps
   */
  async createRepository(
    projectName: string,
    repositoryName: string,
    defaultBranch: string = 'main'
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
    } catch (error: any) {
      console.error('Failed to create repository:', error);
      throw new Error(error.message || 'Failed to create repository in Azure DevOps');
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
    } catch (error: any) {
      // If repository is already initialized, ignore the error
      if (!error.message.includes('already exists')) {
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
      console.log('Could not fetch existing files, assuming empty repository');
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

      // Convert files to Azure DevOps Git changes format
      const changes: any[] = [];

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
        console.log('Branch does not exist yet, will create it');
      }

      // Split changes into batches (Azure DevOps has a limit per push)
      const batchSize = 100;
      const batches: any[][] = [];

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
    } catch (error: any) {
      console.error('Failed to push files:', error);
      throw new Error(error.message || 'Failed to push files to repository');
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
          config.repositoryName,
          config.defaultBranch
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
    } catch (error: any) {
      console.error('Push to Azure DevOps failed:', error);

      let errorMessage = error.message || 'Failed to push to Azure DevOps';

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
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get repository details');
    }
  }

  /**
   * Create CI/CD pipeline (Future implementation)
   */
  async createPipeline(
    projectName: string,
    repositoryName: string,
    pipelineName: string
  ): Promise<AzureDevOpsPipeline> {
    // Future implementation
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
