/**
 * Tauri HTTP wrapper - Uses Tauri's HTTP plugin when running in Tauri,
 * falls back to browser fetch when running in browser (dev mode).
 */

// Check if running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Record<string, string>;
}

/**
 * Make an HTTP request using Tauri's HTTP plugin (no CORS restrictions)
 * or fall back to browser fetch in development mode.
 */
export async function tauriFetch<T = unknown>(
  url: string,
  options: HttpOptions = {}
): Promise<HttpResponse<T>> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  if (isTauri()) {
    // Use Tauri HTTP plugin - no CORS restrictions
    const { fetch } = await import('@tauri-apps/plugin-http');

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      connectTimeout: timeout,
    });

    // Parse response
    let data: T;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json() as T;
    } else {
      data = await response.text() as unknown as T;
    }

    // Convert headers to object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: responseHeaders,
    };
  } else {
    // Fall back to browser fetch (will have CORS issues with Azure DevOps)
    // This path is used in development when running in browser without Tauri
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: T;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json() as T;
    } else {
      data = await response.text() as unknown as T;
    }

    // Convert headers to object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: responseHeaders,
    };
  }
}

/**
 * Create Azure DevOps API headers with PAT authentication
 */
export function createAzureDevOpsHeaders(pat: string): Record<string, string> {
  return {
    'Authorization': `Basic ${btoa(`:${pat}`)}`,
    'Content-Type': 'application/json',
  };
}
