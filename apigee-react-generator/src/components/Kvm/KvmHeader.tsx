import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Clock,
  HelpCircle,
  Settings2,
  LogIn,
  X,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import {
  ApigeeClient,
  KvmService,
  validateGcpToken,
  getTokenRemainingTime,
  isTokenExpiringSoon,
} from '@/services/apigee';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getStoredClientId,
  storeClientId,
  getStoredRefreshToken,
  hasStoredCredentials,
  clearStoredCredentials,
} from '@/services/googleOAuth';

interface KvmHeaderProps {
  className?: string;
}

interface OAuthCallbackResult {
  code?: string;
  error?: string;
  error_description?: string;
}

export const KvmHeader: React.FC<KvmHeaderProps> = ({ className }) => {
  const { t } = useTranslation();
  const {
    connection,
    isConnecting,
    setConnecting,
    connect,
    disconnect,
    setEnvironments,
    setProxies,
    addConsoleMessage,
    resetData,
    setEnvKvmsForEnvironment,
    toggleEnvironmentExpanded,
    expandedEnvironments,
  } = useKvmStore();

  const [orgId, setOrgId] = useState(connection.organizationId || '');
  const [token, setToken] = useState('');
  const [tokenRemaining, setTokenRemaining] = useState<{ minutes: number; seconds: number } | null>(
    null
  );

  // OAuth state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clientId, setClientId] = useState(getStoredClientId() || '');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(hasStoredCredentials());

  // Update token remaining time every second
  useEffect(() => {
    if (!connection.isConnected || !connection.tokenExpiry) return;

    const updateRemaining = () => {
      setTokenRemaining(getTokenRemainingTime(connection.tokenExpiry));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [connection.isConnected, connection.tokenExpiry]);

  // Check for stored credentials on mount
  useEffect(() => {
    setHasCredentials(hasStoredCredentials());
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    const storedClientId = getStoredClientId();
    if (!storedClientId) {
      setShowConfigModal(true);
      return;
    }

    if (!orgId.trim()) {
      addConsoleMessage({ type: 'error', message: 'Organization ID is required' });
      return;
    }

    setIsSigningIn(true);
    addConsoleMessage({ type: 'info', message: 'Starting Google authentication...' });

    try {
      // Start OAuth server and get port
      const port = await invoke<number>('start_oauth_server');
      addConsoleMessage({ type: 'info', message: `OAuth callback server started on port ${port}` });

      // Build authorization URL
      const { url } = await buildAuthorizationUrl(storedClientId, port);

      // Open browser for authentication
      await openUrl(url);
      addConsoleMessage({ type: 'info', message: 'Waiting for authentication...' });

      // Wait for callback (timeout: 5 minutes)
      const result = await invoke<OAuthCallbackResult>('wait_for_oauth_callback', {
        port,
        timeoutSecs: 300,
      });

      if (result.error) {
        throw new Error(result.error_description || result.error);
      }

      if (!result.code) {
        throw new Error('No authorization code received');
      }

      addConsoleMessage({ type: 'info', message: 'Exchanging code for tokens...' });

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(storedClientId, result.code, port);

      addConsoleMessage({ type: 'success', message: 'Authentication successful!' });

      // Connect with the new token
      await connectWithToken(tokens.accessToken, tokens.expiresAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      addConsoleMessage({ type: 'error', message });
    } finally {
      setIsSigningIn(false);
    }
  }, [orgId, addConsoleMessage]);

  const handleRefreshOAuthToken = useCallback(async () => {
    const storedClientId = getStoredClientId();
    if (!storedClientId || !getStoredRefreshToken()) {
      addConsoleMessage({ type: 'error', message: 'No stored credentials. Please sign in again.' });
      return;
    }

    setConnecting(true);
    addConsoleMessage({ type: 'info', message: 'Refreshing access token...' });

    try {
      const tokens = await refreshAccessToken(storedClientId);
      addConsoleMessage({ type: 'success', message: 'Token refreshed successfully!' });
      await connectWithToken(tokens.accessToken, tokens.expiresAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      addConsoleMessage({ type: 'error', message });
      clearStoredCredentials();
      setHasCredentials(false);
    } finally {
      setConnecting(false);
    }
  }, [addConsoleMessage, setConnecting]);

  const connectWithToken = async (accessToken: string, expiresAt: Date) => {
    if (!orgId.trim()) {
      addConsoleMessage({ type: 'error', message: 'Organization ID is required' });
      return;
    }

    setConnecting(true);
    addConsoleMessage({ type: 'info', message: `Connecting to organization: ${orgId}...` });

    try {
      // Validate token
      const validation = await validateGcpToken(accessToken, orgId);

      if (!validation.valid) {
        addConsoleMessage({
          type: 'error',
          message: validation.error || 'Token validation failed',
        });
        setConnecting(false);
        return;
      }

      // Connect with expiry from OAuth
      useKvmStore.setState({
        connection: {
          organizationId: orgId,
          accessToken,
          tokenExpiry: expiresAt,
          isConnected: true,
        },
      });

      addConsoleMessage({
        type: 'success',
        message: `Connected to organization: ${orgId}`,
      });

      // Initialize service and fetch data
      const client = new ApigeeClient({ organizationId: orgId, accessToken });
      const service = new KvmService(client);

      // Fetch environments
      const environments = await service.listEnvironments();
      setEnvironments(environments);
      addConsoleMessage({
        type: 'success',
        message: `Loaded ${environments.length} environment(s): ${environments.join(', ')}`,
      });

      // Fetch proxies
      const proxies = await service.listProxies();
      setProxies(proxies);
      addConsoleMessage({
        type: 'info',
        message: `Found ${proxies.length} API proxy(ies)`,
      });

      // Auto-load KVMs for all environments
      addConsoleMessage({ type: 'info', message: 'Loading KVMs for all environments...' });
      let totalKvms = 0;
      for (const env of environments) {
        try {
          const kvms = await service.listEnvKvms(env);
          setEnvKvmsForEnvironment(env, kvms);
          totalKvms += kvms.length;
          if (!expandedEnvironments.has(env)) {
            toggleEnvironmentExpanded(env);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          addConsoleMessage({ type: 'warning', message: `Failed to load KVMs for ${env}: ${errorMsg}` });
        }
      }
      addConsoleMessage({
        type: 'success',
        message: `Loaded ${totalKvms} KVM(s) across ${environments.length} environment(s)`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      addConsoleMessage({ type: 'error', message });
      disconnect();
    } finally {
      setConnecting(false);
    }
  };

  const handleManualConnect = async () => {
    if (!orgId.trim()) {
      addConsoleMessage({ type: 'error', message: 'Organization ID is required' });
      return;
    }

    if (!token.trim()) {
      addConsoleMessage({ type: 'error', message: 'Access token is required' });
      return;
    }

    // Default expiry of 1 hour for manual tokens
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await connectWithToken(token, expiresAt);
    setToken('');
  };

  const handleDisconnect = () => {
    disconnect();
    setToken('');
  };

  const handleRefreshToken = () => {
    resetData();
    useKvmStore.setState({
      connection: {
        organizationId: orgId,
        accessToken: '',
        tokenExpiry: null,
        isConnected: false,
      },
    });
    addConsoleMessage({ type: 'info', message: 'Token cleared. Please sign in again.' });
  };

  const handleSaveClientId = () => {
    if (clientId.trim()) {
      storeClientId(clientId.trim());
      setHasCredentials(!!getStoredRefreshToken());
      setShowConfigModal(false);
      addConsoleMessage({ type: 'success', message: 'OAuth Client ID saved' });
    }
  };

  const isTokenExpiring = isTokenExpiringSoon(connection.tokenExpiry, 10);
  const isTokenExpired = isTokenExpiringSoon(connection.tokenExpiry, 0);
  const storedClientId = getStoredClientId();

  return (
    <>
      <div
        className={cn(
          'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
          'rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
          'px-6 py-4',
          className
        )}
      >
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="w-10 h-10 bg-[var(--swiss-black)] dark:bg-[#E5E5E5] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-[var(--swiss-white)] dark:text-[#1A1A1A] font-black text-lg">K</span>
          </div>

          {/* Organization ID Input */}
          <div className="flex-1 max-w-[200px]">
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              disabled={connection.isConnected || isConnecting || isSigningIn}
              placeholder="Organization ID"
              className={cn(
                'w-full h-10 bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                'border-none rounded-lg px-4 text-sm font-mono',
                'placeholder:text-[var(--swiss-gray-400)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--swiss-black)] dark:focus:ring-[var(--swiss-gray-500)]',
                'transition-all duration-200',
                (connection.isConnected || isConnecting || isSigningIn) && 'opacity-60'
              )}
            />
          </div>

          {/* Authentication Options - when not connected */}
          {!connection.isConnected && (
            <div className="flex items-center gap-3 flex-1">
              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isConnecting || isSigningIn || !orgId.trim()}
                className={cn(
                  'flex items-center justify-center gap-2 h-10 px-4 rounded-lg',
                  'text-[11px] font-semibold',
                  'bg-white dark:bg-[#333] border border-[var(--swiss-gray-200)] dark:border-[#444]',
                  'text-[var(--swiss-gray-700)] dark:text-[#E5E5E5]',
                  'hover:bg-[var(--swiss-gray-50)] dark:hover:bg-[#3a3a3a]',
                  'hover:shadow-md',
                  'transition-all duration-200',
                  (isConnecting || isSigningIn || !orgId.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              </button>

              {/* Refresh token button (if has stored credentials) */}
              {hasCredentials && !isSigningIn && (
                <button
                  type="button"
                  onClick={handleRefreshOAuthToken}
                  disabled={isConnecting || !orgId.trim()}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg',
                    'text-[10px] font-semibold',
                    'bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                    'text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]',
                    'hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#333]',
                    'transition-all duration-200',
                    (isConnecting || !orgId.trim()) && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Use stored refresh token"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              )}

              <div className="h-6 w-px bg-[var(--swiss-gray-200)] dark:bg-[#444]" />

              {/* Manual token input */}
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isConnecting || isSigningIn}
                placeholder="Or paste token manually"
                className={cn(
                  'flex-1 max-w-[200px] h-10 bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                  'border-none rounded-lg px-4 text-sm font-mono',
                  'placeholder:text-[var(--swiss-gray-400)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--swiss-black)] dark:focus:ring-[var(--swiss-gray-500)]',
                  'transition-all duration-200',
                  (isConnecting || isSigningIn) && 'opacity-60'
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isConnecting && !isSigningIn && token.trim()) {
                    handleManualConnect();
                  }
                }}
              />

              {/* Manual Connect Button */}
              {token.trim() && (
                <button
                  onClick={handleManualConnect}
                  disabled={isConnecting || isSigningIn}
                  className={cn(
                    'flex items-center justify-center gap-2 h-10 px-4 rounded-lg',
                    'text-[11px] font-bold uppercase tracking-wider',
                    'bg-[var(--swiss-black)] dark:bg-[#E5E5E5]',
                    'text-[var(--swiss-white)] dark:text-[#1A1A1A]',
                    'hover:opacity-90 shadow-md hover:shadow-lg',
                    'transition-all duration-200',
                    (isConnecting || isSigningIn) && 'opacity-75 cursor-not-allowed'
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  Connect
                </button>
              )}

              {/* Settings button */}
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg',
                  'bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                  'text-[var(--swiss-gray-500)] hover:text-[var(--swiss-gray-700)]',
                  'dark:hover:text-[var(--swiss-gray-300)]',
                  'hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#333]',
                  'transition-all duration-200',
                  storedClientId && 'ring-2 ring-green-500/30'
                )}
                title="Configure OAuth Client ID"
              >
                <Settings2 className="h-4 w-4" />
              </button>

              {/* Help Tooltip */}
              <div className="relative group">
                <button
                  type="button"
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg',
                    'bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                    'text-[var(--swiss-gray-500)] hover:text-[var(--swiss-gray-700)]',
                    'dark:hover:text-[var(--swiss-gray-300)]',
                    'hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#333]',
                    'transition-all duration-200'
                  )}
                >
                  <HelpCircle className="h-4 w-4" />
                </button>

                {/* Tooltip */}
                <div className={cn(
                  'absolute right-0 top-full mt-2 z-50',
                  'w-72 p-5 rounded-xl',
                  'bg-[var(--swiss-black)] dark:bg-[#E5E5E5]',
                  'text-[var(--swiss-white)] dark:text-[#1A1A1A]',
                  'shadow-2xl',
                  'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                  'transition-all duration-200'
                )}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-4 opacity-60">
                    Authentication Options
                  </p>

                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center text-[10px] font-bold">1</span>
                      <p className="text-[12px]"><span className="font-semibold">Sign in with Google</span> - Configure OAuth Client ID first</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center text-[10px] font-bold">2</span>
                      <p className="text-[12px]"><span className="font-semibold">Manual token</span> - Paste from OAuth Playground or gcloud CLI</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-[var(--swiss-black)] dark:border-b-[#E5E5E5]" />
                </div>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {connection.isConnected && (
            <div className="flex items-center gap-4 ml-auto">
              {/* Status indicator */}
              <div className="flex items-center gap-2 text-sm text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isTokenExpired
                      ? 'bg-red-500'
                      : isTokenExpiring
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  )}
                />
                <span className="font-medium">
                  {isTokenExpired
                    ? t('kvm.header.tokenExpired', 'Token Expired')
                    : t('kvm.header.connectedTo', 'Connected to')}{' '}
                  {!isTokenExpired && <span className="font-mono">{connection.organizationId}</span>}
                </span>
              </div>

              {/* Token expiry countdown */}
              {tokenRemaining && !isTokenExpired && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono',
                    'bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                    isTokenExpiring ? 'text-yellow-600 dark:text-yellow-400' : 'text-[var(--swiss-gray-500)]'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {tokenRemaining.minutes}:{tokenRemaining.seconds.toString().padStart(2, '0')}
                </div>
              )}

              {/* Refresh token button */}
              <button
                onClick={handleRefreshToken}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  'text-[var(--swiss-gray-500)] hover:text-[var(--swiss-black)]',
                  'hover:bg-[var(--swiss-gray-100)] dark:hover:bg-[#252525]',
                  'dark:hover:text-[var(--swiss-white)]'
                )}
                title={t('kvm.header.refreshToken', 'Refresh Token')}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Connect/Disconnect Button */}
          {connection.isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={isConnecting}
              className={cn(
                'flex items-center justify-center gap-2 h-10 px-5 rounded-lg',
                'text-[11px] font-bold uppercase tracking-wider',
                'transition-all duration-200',
                'bg-[var(--swiss-gray-100)] dark:bg-[#252525] text-[var(--swiss-gray-700)] dark:text-[var(--swiss-gray-300)] hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#333]',
                isConnecting && 'opacity-75 cursor-not-allowed'
              )}
            >
              <PowerOff className="h-4 w-4" />
              {t('kvm.header.disconnect', 'Disconnect')}
            </button>
          )}
        </div>
      </div>

      {/* OAuth Client ID Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={cn(
            'w-full max-w-md p-6 rounded-2xl',
            'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
            'shadow-2xl'
          )}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--swiss-black)] dark:text-[#E5E5E5]">
                OAuth Configuration
              </h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--swiss-gray-100)] dark:hover:bg-[#333] transition-colors"
              >
                <X className="h-5 w-5 text-[var(--swiss-gray-500)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)] mb-2">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxx.apps.googleusercontent.com"
                  className={cn(
                    'w-full h-11 bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                    'border-none rounded-lg px-4 text-sm font-mono',
                    'placeholder:text-[var(--swiss-gray-400)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--swiss-black)] dark:focus:ring-[#555]',
                    'text-[var(--swiss-black)] dark:text-[#E5E5E5]'
                  )}
                />
              </div>

              <div className="p-4 rounded-lg bg-[var(--swiss-gray-50)] dark:bg-[#252525] text-[12px] text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)] space-y-2">
                <p className="font-semibold">How to get a Client ID:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Go to <span className="font-mono">console.cloud.google.com</span></li>
                  <li>Navigate to APIs & Services → Credentials</li>
                  <li>Create OAuth 2.0 Client ID (Desktop app)</li>
                  <li>Copy the Client ID and paste it here</li>
                </ol>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className={cn(
                    'flex-1 h-10 rounded-lg',
                    'text-[11px] font-semibold',
                    'bg-[var(--swiss-gray-100)] dark:bg-[#333]',
                    'text-[var(--swiss-gray-700)] dark:text-[#E5E5E5]',
                    'hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#444]',
                    'transition-all duration-200'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveClientId}
                  disabled={!clientId.trim()}
                  className={cn(
                    'flex-1 h-10 rounded-lg',
                    'text-[11px] font-bold',
                    'bg-[var(--swiss-black)] dark:bg-[#E5E5E5]',
                    'text-[var(--swiss-white)] dark:text-[#1A1A1A]',
                    'hover:opacity-90',
                    'transition-all duration-200',
                    !clientId.trim() && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
