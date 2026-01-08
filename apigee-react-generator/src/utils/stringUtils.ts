/**
 * Generate proxy name following the convention:
 * [entity].[domain].[backendapp1-backendapp2-...].[businessobject].[version]
 *
 * @param entity - 'elis' or 'ext'
 * @param domain - Business domain (finance, rh, supply-chain, etc.)
 * @param backendApps - Array of backend application names
 * @param businessObject - Business object (invoice, customer, order, etc.)
 * @param version - Version (v1, v2, etc.)
 * @returns Formatted proxy name
 */
export function generateProxyName(
  entity: string,
  domain: string,
  backendApps: string[],
  businessObject: string,
  version: string
): string {
  const backendAppsStr = backendApps.join('-');
  return `${entity}.${domain}.${backendAppsStr}.${businessObject}.${version}`;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use the new generateProxyName with all parameters
 */
export function generateProxyNameLegacy(entity: string, apiname: string, version: string): string {
  return `${entity}.${apiname}.${version}`;
}

export function sanitizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function pathToPathSuffix(path: string): string {
  // Convertir /customer/{id} -> /customer/*
  return path.replace(/{[^}]+}/g, '*');
}

export function scopeToPolicyName(scope: string): string {
  // Convertir customer:read -> O2-VerifyAccessToken-customer.read
  return `O2-VerifyAccessToken-${scope.replace(/:/g, '.')}`;
}

export function extractPathPrefixes(paths: string[]): string[] {
  const prefixes = new Set<string>();

  for (const path of paths) {
    const parts = path.split('/').filter(p => p);
    if (parts.length > 0) {
      prefixes.add('/' + parts[0]);
    }
  }

  return Array.from(prefixes);
}
