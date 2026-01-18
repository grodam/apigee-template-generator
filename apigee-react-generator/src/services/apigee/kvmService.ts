/**
 * Apigee KVM Service
 * Handles CRUD operations for Key-Value Maps (both environment and proxy scoped)
 */

import { ApigeeClient } from './apigeeClient';
import type {
  ApigeeKvm,
  ApigeeKvmEntry,
  ApigeeKvmListResponse,
  ApigeeOrganization,
  ApigeeApiProxy,
  CreateKvmRequest,
  UpsertKvmEntryRequest,
} from './types';
import { logger } from '@/utils/logger';

const log = logger.scope('KvmService');

/** Generic save function type */
type SaveEntryFn = (entry: UpsertKvmEntryRequest) => Promise<ApigeeKvmEntry>;
type DeleteEntryFn = (entryName: string) => Promise<void>;

export class KvmService {
  private client: ApigeeClient;
  private orgId: string;

  constructor(client: ApigeeClient) {
    this.client = client;
    this.orgId = client.getOrganizationId();
  }

  // ============================================
  // Organization & Environment Operations
  // ============================================

  /**
   * Get organization info including environments list
   */
  async getOrganization(): Promise<ApigeeOrganization> {
    return this.client.request<ApigeeOrganization>(`/organizations/${this.orgId}`);
  }

  /**
   * List all environments in the organization
   */
  async listEnvironments(): Promise<string[]> {
    const org = await this.getOrganization();
    return org.environments || [];
  }

  // ============================================
  // API Proxy Operations
  // ============================================

  /**
   * List all API proxies in the organization
   */
  async listProxies(): Promise<string[]> {
    const response = await this.client.request<{ proxies?: ApigeeApiProxy[] }>(
      `/organizations/${this.orgId}/apis`
    );

    // The API returns an array of proxy objects
    if (Array.isArray(response)) {
      return (response as ApigeeApiProxy[]).map((p) => p.name);
    }

    // Or it might return { proxies: [...] }
    return response.proxies?.map((p) => p.name) || [];
  }

  // ============================================
  // Environment-Scoped KVM Operations
  // ============================================

  /**
   * List all KVMs in an environment
   */
  async listEnvKvms(environment: string): Promise<string[]> {
    log.info(`Listing KVMs for environment: ${environment}`);

    const response = await this.client.request<ApigeeKvmListResponse | string[]>(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps`
    );

    // API returns array of strings (KVM names) directly
    if (Array.isArray(response)) {
      return response as string[];
    }

    // Or it might return { keyValueMap: [...] }
    return response.keyValueMap?.map((kvm) => kvm.name) || [];
  }

  /**
   * Get a specific KVM with its entries (environment-scoped)
   * Note: For Apigee X, we need to fetch entries separately
   */
  async getEnvKvm(environment: string, kvmName: string): Promise<ApigeeKvm> {
    log.info(`Getting KVM: ${kvmName} from environment: ${environment}`);

    // Get KVM metadata
    const kvm = await this.client.request<ApigeeKvm>(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps/${kvmName}`
    );

    // For Apigee X, entries are not included - fetch them separately
    if (!kvm.keyValueEntries || kvm.keyValueEntries.length === 0) {
      try {
        const entries = await this.listEnvKvmEntries(environment, kvmName);
        kvm.keyValueEntries = entries;
      } catch (error) {
        log.warn(`Could not fetch entries for KVM ${kvmName}: ${error}`);
        kvm.keyValueEntries = [];
      }
    }

    return kvm;
  }

  /**
   * List all entries in an environment-scoped KVM
   */
  async listEnvKvmEntries(environment: string, kvmName: string): Promise<ApigeeKvmEntry[]> {
    log.info(`Listing entries for KVM: ${kvmName} in environment: ${environment}`);

    const response = await this.client.request<{ keyValueEntries?: ApigeeKvmEntry[] } | ApigeeKvmEntry[]>(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps/${kvmName}/entries`
    );

    // API might return array directly or wrapped in object
    if (Array.isArray(response)) {
      return response;
    }

    return response.keyValueEntries || [];
  }

  /**
   * Create a new KVM in an environment
   */
  async createEnvKvm(environment: string, kvm: CreateKvmRequest): Promise<ApigeeKvm> {
    log.info(`Creating KVM: ${kvm.name} in environment: ${environment}`);

    return this.client.request<ApigeeKvm>(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps`,
      'POST',
      kvm
    );
  }

  /**
   * Delete a KVM from an environment
   */
  async deleteEnvKvm(environment: string, kvmName: string): Promise<void> {
    log.info(`Deleting KVM: ${kvmName} from environment: ${environment}`);

    await this.client.request(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps/${kvmName}`,
      'DELETE'
    );
  }

  /**
   * Create a new KVM entry (environment-scoped)
   */
  async createEnvKvmEntry(
    environment: string,
    kvmName: string,
    entry: UpsertKvmEntryRequest
  ): Promise<ApigeeKvmEntry> {
    log.info(`Creating entry in KVM: ${kvmName} (env: ${environment})`);

    return this.client.request<ApigeeKvmEntry>(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps/${kvmName}/entries`,
      'POST',
      entry
    );
  }

  /**
   * Update an existing KVM entry (environment-scoped)
   */
  async updateEnvKvmEntry(
    environment: string,
    kvmName: string,
    entry: UpsertKvmEntryRequest
  ): Promise<ApigeeKvmEntry> {
    log.info(`Updating entry in KVM: ${kvmName} (env: ${environment})`);

    return this.client.request<ApigeeKvmEntry>(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps/${kvmName}/entries/${entry.name}`,
      'PUT',
      entry
    );
  }

  /**
   * Delete a KVM entry (environment-scoped)
   */
  async deleteEnvKvmEntry(
    environment: string,
    kvmName: string,
    entryName: string
  ): Promise<void> {
    log.info(`Deleting entry from KVM: ${kvmName} (env: ${environment})`);

    await this.client.request(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps/${kvmName}/entries/${entryName}`,
      'DELETE'
    );
  }

  // ============================================
  // Proxy-Scoped KVM Operations
  // ============================================

  /**
   * List all KVMs attached to an API proxy
   */
  async listProxyKvms(proxyName: string): Promise<string[]> {
    log.info(`Listing KVMs for proxy: ${proxyName}`);

    const response = await this.client.request<ApigeeKvmListResponse | string[]>(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps`
    );

    if (Array.isArray(response)) {
      return response as string[];
    }

    return response.keyValueMap?.map((kvm) => kvm.name) || [];
  }

  /**
   * Get a specific KVM with its entries (proxy-scoped)
   * Note: For Apigee X, we need to fetch entries separately
   */
  async getProxyKvm(proxyName: string, kvmName: string): Promise<ApigeeKvm> {
    log.info(`Getting KVM: ${kvmName} from proxy: ${proxyName}`);

    // Get KVM metadata
    const kvm = await this.client.request<ApigeeKvm>(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}`
    );

    // For Apigee X, entries are not included - fetch them separately
    if (!kvm.keyValueEntries || kvm.keyValueEntries.length === 0) {
      try {
        const entries = await this.listProxyKvmEntries(proxyName, kvmName);
        kvm.keyValueEntries = entries;
      } catch (error) {
        log.warn(`Could not fetch entries for proxy KVM ${kvmName}: ${error}`);
        kvm.keyValueEntries = [];
      }
    }

    return kvm;
  }

  /**
   * List all entries in a proxy-scoped KVM
   */
  async listProxyKvmEntries(proxyName: string, kvmName: string): Promise<ApigeeKvmEntry[]> {
    log.info(`Listing entries for KVM: ${kvmName} in proxy: ${proxyName}`);

    const response = await this.client.request<{ keyValueEntries?: ApigeeKvmEntry[] } | ApigeeKvmEntry[]>(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}/entries`
    );

    // API might return array directly or wrapped in object
    if (Array.isArray(response)) {
      return response;
    }

    return response.keyValueEntries || [];
  }

  /**
   * Create a new KVM attached to an API proxy
   */
  async createProxyKvm(proxyName: string, kvm: CreateKvmRequest): Promise<ApigeeKvm> {
    log.info(`Creating KVM: ${kvm.name} for proxy: ${proxyName}`);

    return this.client.request<ApigeeKvm>(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps`,
      'POST',
      kvm
    );
  }

  /**
   * Delete a KVM from an API proxy
   */
  async deleteProxyKvm(proxyName: string, kvmName: string): Promise<void> {
    log.info(`Deleting KVM: ${kvmName} from proxy: ${proxyName}`);

    await this.client.request(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}`,
      'DELETE'
    );
  }

  /**
   * Create a new KVM entry (proxy-scoped)
   */
  async createProxyKvmEntry(
    proxyName: string,
    kvmName: string,
    entry: UpsertKvmEntryRequest
  ): Promise<ApigeeKvmEntry> {
    log.info(`Creating entry in proxy KVM: ${kvmName} (proxy: ${proxyName})`);

    return this.client.request<ApigeeKvmEntry>(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}/entries`,
      'POST',
      entry
    );
  }

  /**
   * Update an existing KVM entry (proxy-scoped)
   */
  async updateProxyKvmEntry(
    proxyName: string,
    kvmName: string,
    entry: UpsertKvmEntryRequest
  ): Promise<ApigeeKvmEntry> {
    log.info(`Updating entry in proxy KVM: ${kvmName} (proxy: ${proxyName})`);

    return this.client.request<ApigeeKvmEntry>(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}/entries/${entry.name}`,
      'PUT',
      entry
    );
  }

  /**
   * Delete a KVM entry (proxy-scoped)
   */
  async deleteProxyKvmEntry(
    proxyName: string,
    kvmName: string,
    entryName: string
  ): Promise<void> {
    log.info(`Deleting entry from proxy KVM: ${kvmName} (proxy: ${proxyName})`);

    await this.client.request(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}/entries/${entryName}`,
      'DELETE'
    );
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Generic function to save KVM entries
   * Compares with original and only updates changed entries
   */
  private async saveKvmEntries(
    newEntries: ApigeeKvmEntry[],
    originalEntries: ApigeeKvmEntry[],
    createFn: SaveEntryFn,
    updateFn: SaveEntryFn,
    deleteFn: DeleteEntryFn
  ): Promise<{ added: number; updated: number; deleted: number }> {
    const stats = { added: 0, updated: 0, deleted: 0 };

    const originalMap = new Map(originalEntries.map((e) => [e.name, e.value]));
    const newMap = new Map(newEntries.map((e) => [e.name, e.value]));

    // Find entries to add or update
    for (const entry of newEntries) {
      const originalValue = originalMap.get(entry.name);

      if (originalValue === undefined) {
        await createFn(entry);
        stats.added++;
      } else if (originalValue !== entry.value) {
        await updateFn(entry);
        stats.updated++;
      }
    }

    // Find entries to delete
    for (const original of originalEntries) {
      if (!newMap.has(original.name)) {
        await deleteFn(original.name);
        stats.deleted++;
      }
    }

    return stats;
  }

  /**
   * Save all modified entries to a KVM (environment-scoped)
   */
  async saveEnvKvmEntries(
    environment: string,
    kvmName: string,
    newEntries: ApigeeKvmEntry[],
    originalEntries: ApigeeKvmEntry[]
  ): Promise<{ added: number; updated: number; deleted: number }> {
    return this.saveKvmEntries(
      newEntries,
      originalEntries,
      (entry) => this.createEnvKvmEntry(environment, kvmName, entry),
      (entry) => this.updateEnvKvmEntry(environment, kvmName, entry),
      (entryName) => this.deleteEnvKvmEntry(environment, kvmName, entryName)
    );
  }

  /**
   * Save all modified entries to a KVM (proxy-scoped)
   */
  async saveProxyKvmEntries(
    proxyName: string,
    kvmName: string,
    newEntries: ApigeeKvmEntry[],
    originalEntries: ApigeeKvmEntry[]
  ): Promise<{ added: number; updated: number; deleted: number }> {
    return this.saveKvmEntries(
      newEntries,
      originalEntries,
      (entry) => this.createProxyKvmEntry(proxyName, kvmName, entry),
      (entry) => this.updateProxyKvmEntry(proxyName, kvmName, entry),
      (entryName) => this.deleteProxyKvmEntry(proxyName, kvmName, entryName)
    );
  }
}
