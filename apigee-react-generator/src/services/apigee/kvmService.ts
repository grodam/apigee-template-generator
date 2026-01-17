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
   * Create or update a KVM entry (environment-scoped)
   */
  async upsertEnvKvmEntry(
    environment: string,
    kvmName: string,
    entry: UpsertKvmEntryRequest
  ): Promise<ApigeeKvmEntry> {
    log.info(`Upserting entry: ${entry.name} in KVM: ${kvmName}`);

    return this.client.request<ApigeeKvmEntry>(
      `/organizations/${this.orgId}/environments/${environment}/keyvaluemaps/${kvmName}/entries`,
      'POST',
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
    log.info(`Deleting entry: ${entryName} from KVM: ${kvmName}`);

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
   * Create or update a KVM entry (proxy-scoped)
   */
  async upsertProxyKvmEntry(
    proxyName: string,
    kvmName: string,
    entry: UpsertKvmEntryRequest
  ): Promise<ApigeeKvmEntry> {
    log.info(`Upserting entry: ${entry.name} in proxy KVM: ${kvmName}`);

    return this.client.request<ApigeeKvmEntry>(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}/entries`,
      'POST',
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
    log.info(`Deleting entry: ${entryName} from proxy KVM: ${kvmName}`);

    await this.client.request(
      `/organizations/${this.orgId}/apis/${proxyName}/keyvaluemaps/${kvmName}/entries/${entryName}`,
      'DELETE'
    );
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Save all modified entries to a KVM (environment-scoped)
   * Compares with original and only updates changed entries
   */
  async saveEnvKvmEntries(
    environment: string,
    kvmName: string,
    newEntries: ApigeeKvmEntry[],
    originalEntries: ApigeeKvmEntry[]
  ): Promise<{ added: number; updated: number; deleted: number }> {
    const stats = { added: 0, updated: 0, deleted: 0 };

    const originalMap = new Map(originalEntries.map((e) => [e.name, e.value]));
    const newMap = new Map(newEntries.map((e) => [e.name, e.value]));

    // Find entries to add or update
    for (const entry of newEntries) {
      const originalValue = originalMap.get(entry.name);

      if (originalValue === undefined) {
        // New entry
        await this.upsertEnvKvmEntry(environment, kvmName, entry);
        stats.added++;
      } else if (originalValue !== entry.value) {
        // Updated entry
        await this.upsertEnvKvmEntry(environment, kvmName, entry);
        stats.updated++;
      }
    }

    // Find entries to delete
    for (const original of originalEntries) {
      if (!newMap.has(original.name)) {
        await this.deleteEnvKvmEntry(environment, kvmName, original.name);
        stats.deleted++;
      }
    }

    return stats;
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
    const stats = { added: 0, updated: 0, deleted: 0 };

    const originalMap = new Map(originalEntries.map((e) => [e.name, e.value]));
    const newMap = new Map(newEntries.map((e) => [e.name, e.value]));

    // Find entries to add or update
    for (const entry of newEntries) {
      const originalValue = originalMap.get(entry.name);

      if (originalValue === undefined) {
        await this.upsertProxyKvmEntry(proxyName, kvmName, entry);
        stats.added++;
      } else if (originalValue !== entry.value) {
        await this.upsertProxyKvmEntry(proxyName, kvmName, entry);
        stats.updated++;
      }
    }

    // Find entries to delete
    for (const original of originalEntries) {
      if (!newMap.has(original.name)) {
        await this.deleteProxyKvmEntry(proxyName, kvmName, original.name);
        stats.deleted++;
      }
    }

    return stats;
  }

  // ============================================
  // KVM-to-Proxy Mapping (Scan Policies)
  // ============================================

  /**
   * Get deployments for an environment to find which proxies are deployed
   */
  async getEnvironmentDeployments(environment: string): Promise<string[]> {
    log.info(`Getting deployments for environment: ${environment}`);

    try {
      const response = await this.client.request<{ deployments?: Array<{ apiProxy: string }> }>(
        `/organizations/${this.orgId}/environments/${environment}/deployments`
      );

      const proxies = response.deployments?.map((d) => d.apiProxy) || [];
      return [...new Set(proxies)]; // Remove duplicates
    } catch (error) {
      log.warn(`Failed to get deployments for ${environment}: ${error}`);
      return [];
    }
  }

  /**
   * Get the latest deployed revision for a proxy in an environment
   */
  async getProxyDeployedRevision(environment: string, proxyName: string): Promise<string | null> {
    try {
      const response = await this.client.request<{ deployments?: Array<{ revision: string }> }>(
        `/organizations/${this.orgId}/environments/${environment}/apis/${proxyName}/deployments`
      );

      if (response.deployments && response.deployments.length > 0) {
        // Return the highest revision number
        const revisions = response.deployments.map((d) => parseInt(d.revision, 10));
        return Math.max(...revisions).toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get policies for a proxy revision
   */
  async getProxyPolicies(proxyName: string, revision: string): Promise<string[]> {
    try {
      const response = await this.client.request<string[]>(
        `/organizations/${this.orgId}/apis/${proxyName}/revisions/${revision}/policies`
      );
      return Array.isArray(response) ? response : [];
    } catch {
      return [];
    }
  }

  /**
   * Get a specific policy content (XML)
   */
  async getPolicyContent(proxyName: string, revision: string, policyName: string): Promise<string | null> {
    try {
      // Request XML content using Accept header
      const response = await this.client.request<string>(
        `/organizations/${this.orgId}/apis/${proxyName}/revisions/${revision}/policies/${policyName}`,
        'GET',
        undefined,
        { acceptXml: true }
      );
      return typeof response === 'string' ? response : JSON.stringify(response);
    } catch {
      return null;
    }
  }

  /**
   * Extract KVM name from a KeyValueMapOperations policy XML
   */
  private extractKvmFromPolicy(policyContent: string): string | null {
    // Look for <MapName> or mapIdentifier attribute
    const mapNameMatch = policyContent.match(/<MapName[^>]*>([^<]+)<\/MapName>/i);
    if (mapNameMatch) return mapNameMatch[1].trim();

    const mapIdentifierMatch = policyContent.match(/mapIdentifier\s*=\s*["']([^"']+)["']/i);
    if (mapIdentifierMatch) return mapIdentifierMatch[1].trim();

    return null;
  }

  /**
   * Find which KVMs a proxy uses by scanning its policies
   */
  async findKvmsUsedByProxy(proxyName: string, revision: string): Promise<string[]> {
    const kvms: string[] = [];

    try {
      const policies = await this.getProxyPolicies(proxyName, revision);

      // Filter for likely KVM policies (by naming convention)
      const kvmPolicies = policies.filter(
        (p) =>
          p.toLowerCase().includes('kvm') ||
          p.toLowerCase().includes('keyvalue') ||
          p.toLowerCase().includes('kvmget') ||
          p.toLowerCase().includes('kvmput')
      );

      for (const policyName of kvmPolicies) {
        const content = await this.getPolicyContent(proxyName, revision, policyName);
        if (content) {
          const kvmName = this.extractKvmFromPolicy(content);
          if (kvmName && !kvms.includes(kvmName)) {
            kvms.push(kvmName);
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to scan policies for proxy ${proxyName}: ${error}`);
    }

    return kvms;
  }

  /**
   * Build a mapping of KVM -> Proxy for an environment
   * Returns a Map where key is KVM name and value is proxy name
   */
  async buildKvmToProxyMapping(
    environment: string,
    onProgress?: (current: number, total: number, proxyName: string) => void
  ): Promise<Map<string, string>> {
    const kvmToProxy = new Map<string, string>();

    log.info(`Building KVM-to-Proxy mapping for environment: ${environment}`);

    // Get deployed proxies in this environment
    const deployedProxies = await this.getEnvironmentDeployments(environment);
    log.info(`Found ${deployedProxies.length} deployed proxies`);

    let processed = 0;
    for (const proxyName of deployedProxies) {
      processed++;
      onProgress?.(processed, deployedProxies.length, proxyName);

      // Get the deployed revision
      const revision = await this.getProxyDeployedRevision(environment, proxyName);
      if (!revision) continue;

      // Find KVMs used by this proxy
      const kvms = await this.findKvmsUsedByProxy(proxyName, revision);

      for (const kvm of kvms) {
        if (!kvmToProxy.has(kvm)) {
          kvmToProxy.set(kvm, proxyName);
        }
      }
    }

    log.info(`Mapping complete: ${kvmToProxy.size} KVM-to-Proxy associations found`);
    return kvmToProxy;
  }
}
