/**
 * Apigee Management API HTTP Client
 * Uses tauriFetch for cross-platform HTTP requests without CORS issues
 */

import { tauriFetch } from '@/utils/tauriHttp';
import { logger } from '@/utils/logger';
import type { ApigeeErrorResponse } from './types';

const log = logger.scope('ApigeeClient');

const APIGEE_BASE_URL = 'https://apigee.googleapis.com/v1';

export interface ApigeeClientConfig {
  organizationId: string;
  accessToken: string;
}

export class ApigeeClient {
  private config: ApigeeClientConfig;

  constructor(config: ApigeeClientConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make a request to the Apigee Management API
   */
  async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
    options?: { acceptXml?: boolean }
  ): Promise<T> {
    const url = `${APIGEE_BASE_URL}${endpoint}`;

    log.info(`${method} ${endpoint}`);

    const headers = this.getHeaders();
    if (options?.acceptXml) {
      headers['Accept'] = 'application/xml';
    }

    try {
      const response = await tauriFetch<T | ApigeeErrorResponse>(url, {
        method,
        headers,
        body,
        timeout: 30000,
      });

      if (!response.ok) {
        const errorData = response.data as ApigeeErrorResponse;
        const errorMessage = this.getErrorMessage(response.status, errorData);
        log.error(`API error: ${response.status}`, errorData);
        throw new Error(errorMessage);
      }

      return response.data as T;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Re-throw if already a formatted error
        if (error.message.includes('Authentication') ||
            error.message.includes('Permission') ||
            error.message.includes('not found')) {
          throw error;
        }
      }

      const message = error instanceof Error ? error.message : String(error);
      log.error(`Request failed: ${endpoint}`, { error: message });
      throw new Error(`Apigee API request failed: ${message}`);
    }
  }

  /**
   * Get user-friendly error message based on status code
   */
  private getErrorMessage(status: number, errorData: ApigeeErrorResponse | unknown): string {
    const apiError = errorData as ApigeeErrorResponse;
    const serverMessage = apiError?.error?.message || 'Unknown error';

    switch (status) {
      case 401:
        return 'Authentication failed. Your access token may be invalid or expired. Please reconnect with a fresh token.';
      case 403:
        return `Permission denied. You may not have access to this resource. ${serverMessage}`;
      case 404:
        return `Resource not found. ${serverMessage}`;
      case 409:
        return `Conflict: ${serverMessage}`;
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      default:
        return `API error (${status}): ${serverMessage}`;
    }
  }

  /**
   * Update the access token (for token refresh)
   */
  updateToken(accessToken: string): void {
    this.config.accessToken = accessToken;
  }

  /**
   * Get the organization ID
   */
  getOrganizationId(): string {
    return this.config.organizationId;
  }
}

/**
 * Validate a GCP access token by making a test API call
 */
export async function validateGcpToken(
  token: string,
  organizationId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = `${APIGEE_BASE_URL}/organizations/${organizationId}`;

    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid or expired access token' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'Access denied. Check your permissions for this organization.' };
    }

    if (response.status === 404) {
      return { valid: false, error: `Organization "${organizationId}" not found` };
    }

    return { valid: false, error: `Unexpected error: ${response.status}` };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: message };
  }
}

/**
 * Parse JWT token to extract expiry time
 */
export function parseTokenExpiry(token: string): Date | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Token info response from Google OAuth tokeninfo endpoint
 */
export interface GoogleTokenInfo {
  azp?: string;
  aud?: string;
  sub?: string;
  scope?: string;
  exp?: string;
  expires_in?: string;
  email?: string;
  email_verified?: string;
  access_type?: string;
  error?: string;
  error_description?: string;
}

/**
 * Get token info from Google OAuth endpoint to retrieve real expiry time
 * This works for all Google OAuth tokens, not just JWTs
 */
export async function getGoogleTokenInfo(token: string): Promise<{
  expiresIn: number | null;
  expiryDate: Date | null;
  email?: string;
  error?: string;
}> {
  // Validate token format first
  if (!token || token.length < 20) {
    return { expiresIn: null, expiryDate: null, error: 'Invalid token format' };
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`;

    log.info('Fetching token info from Google OAuth endpoint');

    const response = await tauriFetch<GoogleTokenInfo>(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (!response.ok || response.data.error) {
      const errorMsg = response.data.error_description || response.data.error || 'Invalid token';
      log.error('Token info error:', errorMsg);
      return { expiresIn: null, expiryDate: null, error: errorMsg };
    }

    const data = response.data;

    // expires_in is the number of seconds until the token expires
    if (data.expires_in) {
      const expiresInSeconds = parseInt(data.expires_in, 10);
      const expiryDate = new Date(Date.now() + expiresInSeconds * 1000);

      log.info(`Token expires in ${expiresInSeconds} seconds (${Math.floor(expiresInSeconds / 60)} minutes)`);

      return {
        expiresIn: expiresInSeconds,
        expiryDate,
        email: data.email,
      };
    }

    // Fallback to exp field if expires_in is not present
    if (data.exp) {
      const expTimestamp = parseInt(data.exp, 10);
      const expiryDate = new Date(expTimestamp * 1000);
      const expiresInSeconds = Math.floor((expiryDate.getTime() - Date.now()) / 1000);

      log.info(`Token expires at ${expiryDate.toISOString()} (${Math.floor(expiresInSeconds / 60)} minutes remaining)`);

      return {
        expiresIn: expiresInSeconds,
        expiryDate,
        email: data.email,
      };
    }

    log.warn('Token info response did not contain expiry information');
    return { expiresIn: null, expiryDate: null };
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    // Remove token from error message for security
    const message = rawMessage.replace(/access_token=[^&\s]+/gi, 'access_token=***');
    log.error('Failed to fetch token info:', message);

    // Provide user-friendly error messages
    if (message.includes('SSL') || message.includes('certificate')) {
      return { expiresIn: null, expiryDate: null, error: 'SSL/Certificate error - Corporate proxy may be blocking the request' };
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return { expiresIn: null, expiryDate: null, error: 'Request timeout - Check your network connection' };
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connect')) {
      return { expiresIn: null, expiryDate: null, error: 'Network error - Unable to reach Google servers' };
    }

    return { expiresIn: null, expiryDate: null, error: 'Failed to validate token with Google' };
  }
}

/**
 * Check if token is expired or expiring soon
 */
export function isTokenExpiringSoon(expiry: Date | null, bufferMinutes: number = 5): boolean {
  if (!expiry) return true;
  const buffer = bufferMinutes * 60 * 1000;
  return Date.now() > expiry.getTime() - buffer;
}

/**
 * Get remaining time until token expires
 */
export function getTokenRemainingTime(expiry: Date | null): { minutes: number; seconds: number } | null {
  if (!expiry) return null;

  const remaining = expiry.getTime() - Date.now();
  if (remaining <= 0) return { minutes: 0, seconds: 0 };

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return { minutes, seconds };
}
