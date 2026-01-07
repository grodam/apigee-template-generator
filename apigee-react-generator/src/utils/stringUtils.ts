export function generateProxyName(entity: string, apiname: string, version: string): string {
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
