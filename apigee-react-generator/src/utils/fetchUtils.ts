/**
 * Fetch Utilities
 *
 * Provides enhanced fetch functionality with timeout support and HTTPS validation.
 */

import { logger } from './logger';

const log = logger.scope('FetchUtils');

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/** Maximum timeout allowed */
const MAX_TIMEOUT = 120000; // 2 minutes

/**
 * Fetch with timeout using AbortController
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns Promise<Response>
 * @throws Error if request times out or fails
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const effectiveTimeout = Math.min(timeout, MAX_TIMEOUT);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${effectiveTimeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Validate that a URL uses HTTPS protocol
 *
 * @param url - URL to validate
 * @returns true if URL uses HTTPS or is localhost
 * @throws Error if URL is not secure
 */
export function validateHttps(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Allow localhost for development
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      return true;
    }

    // Require HTTPS for all other URLs
    if (parsedUrl.protocol !== 'https:') {
      log.warn(`Insecure URL detected: ${url}`);
      throw new Error(`Security Error: URL must use HTTPS protocol. Got: ${parsedUrl.protocol}`);
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Security Error:')) {
      throw error;
    }
    throw new Error(`Invalid URL: ${url}`);
  }
}
