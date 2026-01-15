/**
 * TemplatesSyncService
 *
 * Synchronizes templates from Azure DevOps repository to local cache.
 * Uses Tauri HTTP plugin when running in Tauri, falls back to proxy for browser dev.
 */

import type { TemplateRepoConfig } from '../../models/AzureDevOpsConfig';
import { templatesCacheService, type CachedTemplate, type SyncInfo } from './TemplatesCacheService';
import { config as appConfig } from '../../utils/config';
import { logger } from '../../utils/logger';
import { tauriFetch, isTauri } from '../../utils/tauriHttp';

const log = logger.scope('TemplatesSyncService');

export interface SyncProgress {
  status: 'idle' | 'checking' | 'downloading' | 'complete' | 'error';
  message: string;
  currentFile?: string;
  filesDownloaded: number;
  totalFiles: number;
  error?: string;
}

export interface FileItem {
  path: string;
  isFolder: boolean;
  url: string;
  commitId?: string;
}

class TemplatesSyncService {
  private proxyUrl = appConfig.proxyUrl;

  /**
   * Make an API request (via Tauri HTTP or proxy)
   */
  private async makeRequest(
    url: string,
    token: string,
    method: string = 'GET'
  ): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`:${token}`)}`
    };

    // Use Tauri HTTP plugin when running in Tauri (no CORS restrictions)
    if (isTauri()) {
      const response = await tauriFetch(url, {
        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        headers,
      });

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
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method, headers })
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.statusText}`);
    }

    const proxyResponse = await response.json();

    return new Response(
      JSON.stringify(proxyResponse.data),
      {
        status: proxyResponse.statusCode,
        statusText: proxyResponse.statusCode === 200 ? 'OK' : 'Error',
        headers: new Headers(proxyResponse.headers)
      }
    );
  }

  /**
   * Get the latest commit SHA for the branch
   */
  async getLatestCommit(config: TemplateRepoConfig, token: string): Promise<string | null> {
    try {
      const baseUrl = `https://dev.azure.com/${config.organization}`;
      const url = `${baseUrl}/${config.project}/_apis/git/repositories/${config.repositoryName}/refs?filter=heads/${config.branch}&api-version=7.0`;

      const response = await this.makeRequest(url, token);
      if (!response.ok) {
        log.error('Failed to get refs:', response.status);
        return null;
      }

      const data = await response.json();
      if (data.value && data.value.length > 0) {
        return data.value[0].objectId;
      }

      return null;
    } catch (error) {
      log.error('Error getting latest commit:', error);
      return null;
    }
  }

  /**
   * Check if sync is needed (compare local vs remote commit)
   */
  async checkForUpdates(config: TemplateRepoConfig, token: string): Promise<{
    needsSync: boolean;
    localCommit: string | null;
    remoteCommit: string | null;
  }> {
    const syncInfo = await templatesCacheService.getSyncInfo();
    const localCommit = syncInfo?.lastCommitSha || null;
    const remoteCommit = await this.getLatestCommit(config, token);

    return {
      needsSync: !localCommit || localCommit !== remoteCommit,
      localCommit,
      remoteCommit
    };
  }

  /**
   * Get all files from the repository
   */
  async getRepositoryFiles(config: TemplateRepoConfig, token: string): Promise<FileItem[]> {
    const baseUrl = `https://dev.azure.com/${config.organization}`;
    const url = `${baseUrl}/${config.project}/_apis/git/repositories/${config.repositoryName}/items?recursionLevel=Full&versionDescriptor.version=${config.branch}&api-version=7.0`;

    const response = await this.makeRequest(url, token);
    if (!response.ok) {
      throw new Error(`Failed to get repository files: ${response.status}`);
    }

    const data = await response.json();
    if (!data.value) {
      return [];
    }

    // Filter to only include template files (not folders, not README, etc.)
    return data.value
      .filter((item: any) => {
        if (item.isFolder) return false;
        const path = item.path.toLowerCase();
        // Include XML files and specific template files
        return path.endsWith('.xml') ||
               path.endsWith('.js') ||
               path.endsWith('.yaml') ||
               path.endsWith('.yml');
      })
      .map((item: any) => ({
        path: item.path.startsWith('/') ? item.path.substring(1) : item.path,
        isFolder: item.isFolder,
        url: item.url,
        commitId: item.commitId
      }));
  }

  /**
   * Download a single file content
   */
  async downloadFile(config: TemplateRepoConfig, token: string, filePath: string): Promise<string> {
    const baseUrl = `https://dev.azure.com/${config.organization}`;
    // URL encode the path, but keep forward slashes
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    const url = `${baseUrl}/${config.project}/_apis/git/repositories/${config.repositoryName}/items?path=/${encodedPath}&versionDescriptor.version=${config.branch}&api-version=7.0`;

    const response = await this.makeRequest(url, token);
    if (!response.ok) {
      throw new Error(`Failed to download file ${filePath}: ${response.status}`);
    }

    // The response is the raw file content wrapped in JSON by our proxy
    const data = await response.json();

    // If the response is an object with content, extract it
    // Otherwise, the response itself is the content
    if (typeof data === 'string') {
      return data;
    } else if (data && typeof data === 'object') {
      // Azure DevOps returns file content directly for text files
      // But our proxy wraps it in { data: ... }
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }

    return '';
  }

  /**
   * Download file content as text (handles Tauri or proxy response)
   */
  private async downloadFileContent(config: TemplateRepoConfig, token: string, filePath: string): Promise<string> {
    const baseUrl = `https://dev.azure.com/${config.organization}`;
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    // Use download=true to get raw file content
    const url = `${baseUrl}/${config.project}/_apis/git/repositories/${config.repositoryName}/items?path=/${encodedPath}&versionDescriptor.version=${config.branch}&download=true&api-version=7.0`;

    const headers = {
      'Authorization': `Basic ${btoa(`:${token}`)}`,
      'Accept': 'application/octet-stream'
    };

    // Use Tauri HTTP plugin when running in Tauri (no CORS restrictions)
    if (isTauri()) {
      const response = await tauriFetch(url, {
        method: 'GET',
        headers,
      });

      if (response.status !== 200) {
        throw new Error(`Failed to download file ${filePath}: ${response.status}`);
      }

      const data = response.data;

      if (typeof data === 'string') {
        return data;
      }

      if (data && typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }

      return '';
    }

    // Fall back to proxy for browser development
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method: 'GET', headers })
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.statusText}`);
    }

    const proxyResponse = await response.json();

    if (proxyResponse.statusCode !== 200) {
      throw new Error(`Failed to download file ${filePath}: ${proxyResponse.statusCode}`);
    }

    // Handle different response types
    const data = proxyResponse.data;

    // Raw file content is returned as string by the proxy
    if (typeof data === 'string') {
      return data;
    }

    // If it's an object with content property (base64 encoded)
    if (data && typeof data === 'object' && data.content) {
      // Try to decode base64
      try {
        return atob(data.content);
      } catch {
        return data.content;
      }
    }

    // If it's any other object, it might be JSON file content
    if (data && typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return '';
  }

  /**
   * Sync all templates from Azure DevOps to local cache
   */
  async syncTemplates(
    config: TemplateRepoConfig,
    token: string,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<{ success: boolean; message: string; filesCount: number }> {
    const updateProgress = (progress: SyncProgress) => {
      onProgress?.(progress);
    };

    try {
      // Step 1: Check for updates
      updateProgress({
        status: 'checking',
        message: 'Checking for updates...',
        filesDownloaded: 0,
        totalFiles: 0
      });

      const latestCommit = await this.getLatestCommit(config, token);
      if (!latestCommit) {
        throw new Error('Could not get latest commit from repository');
      }

      // Step 2: Get list of files
      updateProgress({
        status: 'checking',
        message: 'Getting file list...',
        filesDownloaded: 0,
        totalFiles: 0
      });

      const files = await this.getRepositoryFiles(config, token);
      if (files.length === 0) {
        throw new Error('No template files found in repository');
      }

      // Step 3: Download all files
      const templates: CachedTemplate[] = [];
      const failedFiles: string[] = [];
      const syncedAt = new Date().toISOString();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        updateProgress({
          status: 'downloading',
          message: `Downloading ${file.path}...`,
          currentFile: file.path,
          filesDownloaded: i,
          totalFiles: files.length
        });

        try {
          const content = await this.downloadFileContent(config, token, file.path);
          if (content && content.length > 0) {
            templates.push({
              path: file.path,
              content,
              commitSha: latestCommit,
              syncedAt
            });
          } else {
            log.warn(`Empty content for ${file.path}`);
            failedFiles.push(file.path);
          }
        } catch (error: any) {
          log.error(`Failed to download ${file.path}:`, error.message || error);
          failedFiles.push(file.path);
          // Continue with other files
        }
      }

      // Check if we got any templates
      if (templates.length === 0) {
        throw new Error(`Failed to download any templates. ${failedFiles.length} files failed.`);
      }

      // Log summary
      if (failedFiles.length > 0) {
        log.warn(`Sync completed with ${failedFiles.length} failed files:`, failedFiles);
      }

      // Step 4: Clear old cache and store new templates
      await templatesCacheService.clearTemplates();
      await templatesCacheService.setTemplates(templates);

      // Step 5: Update sync metadata
      const syncInfo: SyncInfo = {
        lastCommitSha: latestCommit,
        lastSyncDate: syncedAt,
        totalFiles: templates.length,
        organization: config.organization,
        project: config.project,
        repository: config.repositoryName,
        branch: config.branch
      };
      await templatesCacheService.setSyncInfo(syncInfo);

      const successMessage = failedFiles.length > 0
        ? `Synchronized ${templates.length} templates (${failedFiles.length} failed)`
        : `Synchronized ${templates.length} templates`;

      updateProgress({
        status: 'complete',
        message: successMessage,
        filesDownloaded: templates.length,
        totalFiles: files.length
      });

      return {
        success: true,
        message: successMessage,
        filesCount: templates.length
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error during sync';

      updateProgress({
        status: 'error',
        message: errorMessage,
        filesDownloaded: 0,
        totalFiles: 0,
        error: errorMessage
      });

      return {
        success: false,
        message: errorMessage,
        filesCount: 0
      };
    }
  }

  /**
   * Test connection to template repository
   */
  async testConnection(config: TemplateRepoConfig, token: string): Promise<{
    success: boolean;
    message: string;
    filesCount?: number;
  }> {
    try {
      // Try to get the latest commit
      const latestCommit = await this.getLatestCommit(config, token);
      if (!latestCommit) {
        return {
          success: false,
          message: 'Repository or branch not found. Please check your settings.'
        };
      }

      // Try to get file list
      const files = await this.getRepositoryFiles(config, token);

      return {
        success: true,
        message: `Connection successful! Found ${files.length} template files.`,
        filesCount: files.length
      };
    } catch (error: any) {
      let message = error.message || 'Connection failed';

      if (message.includes('401') || message.includes('Unauthorized')) {
        message = 'Authentication failed. Please check your PAT token.';
      } else if (message.includes('404') || message.includes('Not Found')) {
        message = 'Repository not found. Please check organization, project, and repository name.';
      } else if (message.includes('Network') || message.includes('fetch')) {
        message = 'Network error. Please ensure the proxy server is running.';
      }

      return {
        success: false,
        message
      };
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<{
    hasCachedTemplates: boolean;
    syncInfo: SyncInfo | null;
    templateCount: number;
  }> {
    const syncInfo = await templatesCacheService.getSyncInfo();
    const templateCount = await templatesCacheService.getTemplateCount();

    return {
      hasCachedTemplates: templateCount > 0,
      syncInfo,
      templateCount
    };
  }
}

// Export singleton instance
export const templatesSyncService = new TemplatesSyncService();
