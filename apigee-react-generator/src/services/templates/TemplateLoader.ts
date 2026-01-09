import { TEMPLATE_BASE_PATH } from '../../utils/constants';
import { templatesCacheService } from './TemplatesCacheService';

export type TemplateSource = 'cache' | 'local' | 'fallback';

export interface LoadedTemplate {
  content: string;
  source: TemplateSource;
}

export class TemplateLoader {
  private memoryCache: Map<string, string> = new Map();
  private useRemoteCache: boolean = false;

  /**
   * Enable loading from IndexedDB cache (synced from Azure DevOps)
   */
  setUseRemoteCache(enabled: boolean): void {
    this.useRemoteCache = enabled;
  }

  /**
   * Check if remote cache is available and has templates
   */
  async isRemoteCacheAvailable(): Promise<boolean> {
    try {
      return await templatesCacheService.hasCache();
    } catch {
      return false;
    }
  }

  /**
   * Load a template, trying cache first, then local files
   */
  async load(templatePath: string): Promise<string> {
    const result = await this.loadWithSource(templatePath);
    return result.content;
  }

  /**
   * Load a template and return its source
   */
  async loadWithSource(templatePath: string): Promise<LoadedTemplate> {
    // Check memory cache first
    if (this.memoryCache.has(templatePath)) {
      return {
        content: this.memoryCache.get(templatePath)!,
        source: 'cache'
      };
    }

    // Try IndexedDB cache if enabled
    if (this.useRemoteCache) {
      try {
        const cached = await templatesCacheService.getTemplate(templatePath);
        if (cached) {
          this.memoryCache.set(templatePath, cached.content);
          return {
            content: cached.content,
            source: 'cache'
          };
        }
      } catch (error) {
        console.warn(`Failed to load from cache: ${templatePath}`, error);
      }
    }

    // Fall back to local files in public folder
    const fullPath = `${TEMPLATE_BASE_PATH}/${templatePath}`;

    try {
      const response = await fetch(fullPath);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${fullPath}`);
      }

      const content = await response.text();
      this.memoryCache.set(templatePath, content);
      return {
        content,
        source: this.useRemoteCache ? 'fallback' : 'local'
      };
    } catch (error) {
      console.error(`Error loading template ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple templates
   */
  async loadMultiple(templatePaths: string[]): Promise<Map<string, string>> {
    const templates = new Map<string, string>();

    await Promise.all(
      templatePaths.map(async (path) => {
        const content = await this.load(path);
        templates.set(path, content);
      })
    );

    return templates;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get template source info for a path
   */
  async getTemplateSource(templatePath: string): Promise<TemplateSource | null> {
    if (this.useRemoteCache) {
      try {
        const cached = await templatesCacheService.getTemplate(templatePath);
        if (cached) {
          return 'cache';
        }
      } catch {
        // Ignore
      }
    }

    // Check if local file exists
    const fullPath = `${TEMPLATE_BASE_PATH}/${templatePath}`;
    try {
      const response = await fetch(fullPath, { method: 'HEAD' });
      if (response.ok) {
        return this.useRemoteCache ? 'fallback' : 'local';
      }
    } catch {
      // Ignore
    }

    return null;
  }
}
