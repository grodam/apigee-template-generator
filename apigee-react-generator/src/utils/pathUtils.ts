export function joinPaths(...paths: string[]): string {
  return paths
    .map(p => p.replace(/^\/+|\/+$/g, ''))
    .filter(p => p)
    .join('/');
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function getFileName(path: string): string {
  const normalizedPath = normalizePath(path);
  const parts = normalizedPath.split('/');
  return parts[parts.length - 1];
}
