/**
 * TemplatesCacheService
 *
 * Manages local caching of templates using IndexedDB.
 * Provides offline access and versioning for synced templates.
 */

const DB_NAME = 'apigee-templates-cache';
const DB_VERSION = 1;
const STORE_TEMPLATES = 'templates';
const STORE_METADATA = 'metadata';

export interface CachedTemplate {
  path: string;           // File path in repository (e.g., 'policies/AM-NotFound.xml')
  content: string;        // File content
  commitSha: string;      // Commit SHA when this file was synced
  syncedAt: string;       // ISO date when synced
}

export interface CacheMetadata {
  key: string;            // Metadata key (e.g., 'lastSync')
  value: any;             // Metadata value
}

export interface SyncInfo {
  lastCommitSha: string;
  lastSyncDate: string;
  totalFiles: number;
  organization: string;
  project: string;
  repository: string;
  branch: string;
}

class TemplatesCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open templates cache database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create templates store with path as key
        if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
          const templatesStore = db.createObjectStore(STORE_TEMPLATES, { keyPath: 'path' });
          templatesStore.createIndex('commitSha', 'commitSha', { unique: false });
        }

        // Create metadata store for sync info
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get a template from cache by path
   */
  async getTemplate(path: string): Promise<CachedTemplate | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_TEMPLATES, 'readonly');
      const store = transaction.objectStore(STORE_TEMPLATES);
      const request = store.get(path);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all cached templates
   */
  async getAllTemplates(): Promise<CachedTemplate[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_TEMPLATES, 'readonly');
      const store = transaction.objectStore(STORE_TEMPLATES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store a template in cache
   */
  async setTemplate(template: CachedTemplate): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_TEMPLATES, 'readwrite');
      const store = transaction.objectStore(STORE_TEMPLATES);
      const request = store.put(template);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store multiple templates in cache (batch operation)
   */
  async setTemplates(templates: CachedTemplate[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_TEMPLATES, 'readwrite');
      const store = transaction.objectStore(STORE_TEMPLATES);

      let completed = 0;
      let hasError = false;

      templates.forEach(template => {
        const request = store.put(template);

        request.onsuccess = () => {
          completed++;
          if (completed === templates.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });

      if (templates.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Clear all cached templates
   */
  async clearTemplates(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_TEMPLATES, 'readwrite');
      const store = transaction.objectStore(STORE_TEMPLATES);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync metadata
   */
  async getSyncInfo(): Promise<SyncInfo | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_METADATA, 'readonly');
      const store = transaction.objectStore(STORE_METADATA);
      const request = store.get('syncInfo');

      request.onsuccess = () => {
        const result = request.result as CacheMetadata | undefined;
        resolve(result?.value || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store sync metadata
   */
  async setSyncInfo(info: SyncInfo): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_METADATA, 'readwrite');
      const store = transaction.objectStore(STORE_METADATA);
      const request = store.put({ key: 'syncInfo', value: info });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if cache has any templates
   */
  async hasCache(): Promise<boolean> {
    const templates = await this.getAllTemplates();
    return templates.length > 0;
  }

  /**
   * Get template count
   */
  async getTemplateCount(): Promise<number> {
    const templates = await this.getAllTemplates();
    return templates.length;
  }

  /**
   * Delete the entire database (for reset)
   */
  async deleteDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const templatesCacheService = new TemplatesCacheService();
