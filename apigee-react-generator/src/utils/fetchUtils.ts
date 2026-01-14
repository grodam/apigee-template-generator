/**
 * Fetch Utilities
 *
 * Provides enhanced fetch functionality with timeout support,
 * HTTPS validation, and rate limiting helpers.
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

/**
 * Rate limiter class for controlling request frequency
 */
export class RateLimiter {
  private attempts: number[] = [];
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  /**
   * Create a new rate limiter
   *
   * @param maxAttempts - Maximum attempts allowed in the time window
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxAttempts: number = 3, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if an attempt is allowed
   *
   * @returns true if attempt is allowed
   */
  canAttempt(): boolean {
    this.cleanOldAttempts();
    return this.attempts.length < this.maxAttempts;
  }

  /**
   * Record an attempt
   */
  recordAttempt(): void {
    this.attempts.push(Date.now());
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    this.cleanOldAttempts();
    return Math.max(0, this.maxAttempts - this.attempts.length);
  }

  /**
   * Get time until next attempt is allowed (in seconds)
   */
  getWaitTimeSeconds(): number {
    if (this.canAttempt()) return 0;

    const oldestAttempt = Math.min(...this.attempts);
    const waitMs = this.windowMs - (Date.now() - oldestAttempt);
    return Math.ceil(Math.max(0, waitMs) / 1000);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.attempts = [];
  }

  /**
   * Remove attempts outside the time window
   */
  private cleanOldAttempts(): void {
    const now = Date.now();
    this.attempts = this.attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
  }
}

/**
 * Validate Azure DevOps repository name
 *
 * @param name - Repository name to validate
 * @returns Validation result with isValid flag and error message
 */
export function validateRepositoryName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Repository name is required' };
  }

  const trimmedName = name.trim();

  // Check length (Azure DevOps limit is 64 characters)
  if (trimmedName.length > 64) {
    return { isValid: false, error: 'Repository name must be 64 characters or less' };
  }

  // Check for invalid characters
  // Azure DevOps allows: alphanumeric, hyphens, underscores, periods
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  if (!validPattern.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Repository name can only contain letters, numbers, hyphens, underscores, and periods. Must start and end with alphanumeric character.'
    };
  }

  // Check for reserved names
  const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'lpt1', 'lpt2', 'lpt3', 'lpt4'];
  if (reservedNames.includes(trimmedName.toLowerCase())) {
    return { isValid: false, error: 'Repository name cannot be a reserved Windows name' };
  }

  // Check for consecutive special characters
  if (/[._-]{2,}/.test(trimmedName)) {
    return { isValid: false, error: 'Repository name cannot contain consecutive special characters' };
  }

  return { isValid: true };
}

/**
 * Sanitize a string for use as a repository name
 *
 * @param input - String to sanitize
 * @returns Sanitized repository name
 */
export function sanitizeRepositoryName(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .toLowerCase()
    // Replace spaces and invalid characters with hyphens
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    // Remove consecutive special characters
    .replace(/[._-]{2,}/g, '-')
    // Remove leading/trailing special characters
    .replace(/^[._-]+|[._-]+$/g, '')
    // Limit length
    .substring(0, 64);
}
