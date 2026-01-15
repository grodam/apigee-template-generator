/**
 * Tauri HTTP wrapper - Uses Tauri's HTTP plugin when running in Tauri,
 * falls back to browser fetch when running in browser (dev mode).
 */

// Check if running in Tauri (supports both Tauri 1.x and 2.x)
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Tauri 2.x uses __TAURI_INTERNALS__, Tauri 1.x uses __TAURI__
  const hasTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
  console.log('[TauriHTTP] isTauri check:', {
    hasTauri,
    has__TAURI__: '__TAURI__' in window,
    has__TAURI_INTERNALS__: '__TAURI_INTERNALS__' in window
  });
  return hasTauri;
};

interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  /** Accept invalid/self-signed SSL certificates (for corporate proxies with SSL inspection) */
  dangerAcceptInvalidCerts?: boolean;
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
  const { method = 'GET', headers = {}, body, timeout = 30000, dangerAcceptInvalidCerts = false } = options;

  if (isTauri()) {
    // Use Tauri HTTP plugin - no CORS restrictions
    const { fetch } = await import('@tauri-apps/plugin-http');

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        connectTimeout: timeout,
        // Allow accepting invalid certs for corporate proxy environments with SSL inspection
        danger: dangerAcceptInvalidCerts ? { acceptInvalidCerts: true } : undefined,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorLower = errorMessage.toLowerCase();

      // Log full error for debugging
      console.error('[TauriHTTP] Request failed:', { url, method, error: errorMessage, fullError: err });

      // Provide more helpful error message for common enterprise issues
      if (errorLower.includes('certificate') || errorLower.includes('ssl') || errorLower.includes('tls')) {
        throw new Error(`SSL/Certificate error - Your corporate proxy may be intercepting HTTPS traffic. Contact IT to whitelist this application. (Original: ${errorMessage})`);
      }
      if (errorLower.includes('proxy') || errorLower.includes('connect')) {
        throw new Error(`Connection error - Check your network/proxy settings. (Original: ${errorMessage})`);
      }
      if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
        throw new Error(`Request timeout - The server took too long to respond. Check your network connection. (Original: ${errorMessage})`);
      }
      if (errorLower.includes('dns') || errorLower.includes('resolve') || errorLower.includes('getaddrinfo')) {
        throw new Error(`DNS resolution failed - Cannot resolve hostname. Check your network/DNS settings. (Original: ${errorMessage})`);
      }
      if (errorLower.includes('failed to fetch') || errorLower.includes('network') || errorLower.includes('fetch')) {
        throw new Error(`Network error connecting to ${url}. This could be caused by: (1) Corporate firewall/proxy blocking the request, (2) SSL inspection interfering with HTTPS, (3) Network connectivity issues. (Original: ${errorMessage})`);
      }
      throw new Error(`Request to ${url} failed: ${errorMessage}`);
    }

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
