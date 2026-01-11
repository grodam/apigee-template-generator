/**
 * KVM Generator Utility
 *
 * Generates Key-Value Map entries for URL variabilization with
 * the backend_info_N naming convention.
 */

import type { KVM } from '../models/ApiConfiguration';
import type { BackendInfoEntry } from './urlVariabilizer';

/**
 * Create a dedicated backend_info KVM for URL variabilization
 *
 * @param proxyName - Proxy name for KVM naming
 * @param entries - Backend info entries to include
 * @param environment - Target environment for value lookup
 * @returns KVM object with name format: {proxyName}.backend-info
 */
export function createBackendInfoKvm(
  proxyName: string,
  entries: BackendInfoEntry[],
  environment: string
): KVM {
  const kvmName = proxyName ? `${proxyName}.backend-info` : 'backend-info';

  return {
    name: kvmName,
    encrypted: true, // Backend info typically contains sensitive data
    entries: entries.map(entry => ({
      name: entry.variableName,
      value: entry.values[environment] || '',
    })),
  };
}

/**
 * Merge generated backend_info entries into existing environment KVMs
 *
 * @param existingKvms - Current KVMs for an environment
 * @param entries - New backend_info entries
 * @param environment - Target environment
 * @param proxyName - Proxy name for KVM naming
 * @returns Merged KVM array
 */
export function mergeKvmEntries(
  existingKvms: KVM[],
  entries: BackendInfoEntry[],
  environment: string,
  proxyName?: string
): KVM[] {
  if (entries.length === 0) {
    return existingKvms;
  }

  // Check if a backend-info KVM already exists
  const kvmName = proxyName ? `${proxyName}.backend-info` : 'backend-info';
  const existingBackendInfoIndex = existingKvms.findIndex(kvm =>
    kvm.name === kvmName || kvm.name.endsWith('.backend-info')
  );

  const newBackendInfoKvm = createBackendInfoKvm(proxyName || '', entries, environment);

  if (existingBackendInfoIndex >= 0) {
    // Merge entries into existing backend-info KVM
    const existingKvm = existingKvms[existingBackendInfoIndex];
    const existingEntryNames = new Set(existingKvm.entries?.map(e => e.name) || []);

    const mergedEntries = [
      ...(existingKvm.entries || []),
      ...(newBackendInfoKvm.entries || []).filter(e => !existingEntryNames.has(e.name)),
    ];

    const updatedKvms = [...existingKvms];
    updatedKvms[existingBackendInfoIndex] = {
      ...existingKvm,
      entries: mergedEntries,
    };

    return updatedKvms;
  }

  // Add new backend-info KVM at the beginning
  return [newBackendInfoKvm, ...existingKvms];
}

/**
 * Get the next available KVM index from existing entries
 *
 * @param existingEntries - Current backend_info entries
 * @returns Next available index (e.g., if 1,2 exist, returns 3)
 */
export function getNextKvmIndex(existingEntries: BackendInfoEntry[]): number {
  if (existingEntries.length === 0) return 1;
  return Math.max(...existingEntries.map(e => e.kvmIndex)) + 1;
}

/**
 * Convert BackendInfoEntry array to KVM entries for a specific environment
 *
 * @param entries - Backend info entries
 * @param environment - Target environment
 * @returns Array of KVM entry objects
 */
export function convertToKvmEntries(
  entries: BackendInfoEntry[],
  environment: string
): Array<{ name: string; value: string }> {
  return entries.map(entry => ({
    name: entry.variableName,
    value: entry.values[environment] || '',
  }));
}

/**
 * Update a specific backend_info entry value for an environment
 *
 * @param entries - Current backend info entries
 * @param kvmIndex - Index of the entry to update
 * @param environment - Environment to update
 * @param value - New value
 * @returns Updated entries array
 */
export function updateBackendInfoValue(
  entries: BackendInfoEntry[],
  kvmIndex: number,
  environment: string,
  value: string
): BackendInfoEntry[] {
  return entries.map(entry => {
    if (entry.kvmIndex === kvmIndex) {
      return {
        ...entry,
        values: {
          ...entry.values,
          [environment]: value,
        },
        isAutoDetected: false, // Mark as user-edited
      };
    }
    return entry;
  });
}

/**
 * Check if any backend_info entries have empty values that need to be filled
 *
 * @param entries - Backend info entries to check
 * @param environment - Environment to check
 * @returns True if there are entries with empty values
 */
export function hasEmptyValues(entries: BackendInfoEntry[], environment: string): boolean {
  return entries.some(entry => !entry.values[environment]);
}

/**
 * Get a summary of the variabilization for display
 *
 * @param variabilizedPath - The variabilized path template
 * @param variabilizedHost - Optional variabilized host template
 * @param entries - Backend info entries
 * @returns Human-readable summary
 */
export function getVariabilizationSummary(
  variabilizedPath: string,
  variabilizedHost: string | undefined,
  entries: BackendInfoEntry[]
): string {
  const parts: string[] = [];

  if (variabilizedHost) {
    parts.push(`Host: ${variabilizedHost}`);
  }

  if (variabilizedPath !== '/') {
    parts.push(`Path: ${variabilizedPath}`);
  }

  if (entries.length > 0) {
    const varNames = entries.map(e => e.variableName).join(', ');
    parts.push(`Variables: ${varNames}`);
  }

  return parts.join(' | ');
}
