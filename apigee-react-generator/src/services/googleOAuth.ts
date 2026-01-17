/**
 * Google OAuth 2.0 with PKCE for Desktop Apps
 *
 * Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. Open browser to Google authorization URL
 * 3. Listen for callback on localhost
 * 4. Exchange authorization code for tokens
 * 5. Use refresh token to get new access tokens
 */

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Apigee API scopes
const APIGEE_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
];

// Storage keys
const STORAGE_KEYS = {
  REFRESH_TOKEN: 'google_oauth_refresh_token',
  CLIENT_ID: 'google_oauth_client_id',
  CODE_VERIFIER: 'google_oauth_code_verifier',
};

/**
 * Generate a cryptographically random string for PKCE
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join('');
}

/**
 * Generate SHA-256 hash and encode as base64url
 */
async function sha256Base64Url(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}

/**
 * Get stored OAuth client ID
 */
export function getStoredClientId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
}

/**
 * Store OAuth client ID
 */
export function storeClientId(clientId: string): void {
  localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
}

/**
 * Get stored refresh token
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Store refresh token
 */
function storeRefreshToken(refreshToken: string): void {
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
}

/**
 * Clear stored credentials
 */
export function clearStoredCredentials(): void {
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  expiresAt: Date;
  tokenType: string;
}

export interface OAuthError {
  error: string;
  errorDescription?: string;
}

/**
 * Build the Google OAuth authorization URL
 */
export async function buildAuthorizationUrl(
  clientId: string,
  redirectPort: number
): Promise<{ url: string; verifier: string }> {
  const { verifier, challenge } = await generatePKCE();

  // Store verifier for later use
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, verifier);

  const redirectUri = `http://127.0.0.1:${redirectPort}/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: APIGEE_SCOPES.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent to get refresh token
  });

  return {
    url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    verifier,
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  clientId: string,
  code: string,
  redirectPort: number
): Promise<OAuthTokens> {
  const verifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  if (!verifier) {
    throw new Error('Code verifier not found. Please restart the OAuth flow.');
  }

  const redirectUri = `http://127.0.0.1:${redirectPort}/callback`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  // Store refresh token for future use
  if (data.refresh_token) {
    storeRefreshToken(data.refresh_token);
  }

  // Clean up verifier
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    tokenType: data.token_type,
  };
}

/**
 * Refresh access token using stored refresh token
 */
export async function refreshAccessToken(clientId: string): Promise<OAuthTokens> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available. Please sign in again.');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    // If refresh fails, clear stored credentials
    if (data.error === 'invalid_grant') {
      clearStoredCredentials();
    }
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Keep existing refresh token
    expiresIn: data.expires_in,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    tokenType: data.token_type,
  };
}

/**
 * Check if we have a valid refresh token stored
 */
export function hasStoredCredentials(): boolean {
  return !!getStoredRefreshToken() && !!getStoredClientId();
}

/**
 * Parse OAuth callback URL and extract code or error
 */
export function parseCallbackUrl(url: string): { code?: string; error?: string; errorDescription?: string } {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;

  const error = params.get('error');
  if (error) {
    return {
      error,
      errorDescription: params.get('error_description') || undefined,
    };
  }

  const code = params.get('code');
  return { code: code || undefined };
}
