import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Clock,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import {
  ApigeeClient,
  KvmService,
  validateGcpToken,
  getTokenRemainingTime,
  isTokenExpiringSoon,
  getGoogleTokenInfo,
} from '@/services/apigee';

interface KvmHeaderProps {
  className?: string;
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
  } = useKvmStore();

  const [orgId, setOrgId] = useState(connection.organizationId || '');
  const [token, setToken] = useState('');
  const [tokenRemaining, setTokenRemaining] = useState<{ minutes: number; seconds: number } | null>(
    null
  );

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

  const handleConnect = async () => {
    if (!orgId.trim()) {
      addConsoleMessage({ type: 'error', message: 'Organization ID is required' });
      return;
    }

    if (!token.trim()) {
      addConsoleMessage({ type: 'error', message: 'Access token is required' });
      return;
    }

    setConnecting(true);
    addConsoleMessage({ type: 'info', message: `Connecting to organization: ${orgId}...` });

    try {
      // Try to get token info from Google for real expiry time (optional - may fail due to network/proxy)
      addConsoleMessage({ type: 'info', message: 'Validating token...' });
      let tokenExpiry: Date | null = null;

      const tokenInfo = await getGoogleTokenInfo(token);

      if (tokenInfo.error) {
        // Token info fetch failed - this is not critical, we'll validate via Apigee API
        addConsoleMessage({
          type: 'warning',
          message: `Could not fetch token info: ${tokenInfo.error}. Will validate via Apigee API.`,
        });
      } else if (tokenInfo.expiresIn !== null) {
        // Log real token expiry
        const minutes = Math.floor(tokenInfo.expiresIn / 60);
        const seconds = tokenInfo.expiresIn % 60;
        addConsoleMessage({
          type: 'info',
          message: `Token valid for ${minutes}m ${seconds}s${tokenInfo.email ? ` (${tokenInfo.email})` : ''}`,
        });
        tokenExpiry = tokenInfo.expiryDate;
      }

      // Validate access to the organization (this is the critical validation)
      const validation = await validateGcpToken(token, orgId);

      if (!validation.valid) {
        addConsoleMessage({
          type: 'error',
          message: validation.error || 'Organization access validation failed',
        });
        setConnecting(false);
        return;
      }

      // Connect with token expiry (real if available, otherwise will default to 1 hour in store)
      connect(orgId, token, tokenExpiry);

      // Initialize service and fetch environments
      const client = new ApigeeClient({ organizationId: orgId, accessToken: token });
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

      // Auto-load KVMs for all environments (collapsed by default)
      addConsoleMessage({ type: 'info', message: 'Loading KVMs for all environments...' });
      let totalKvms = 0;
      for (const env of environments) {
        try {
          const kvms = await service.listEnvKvms(env);
          setEnvKvmsForEnvironment(env, kvms);
          totalKvms += kvms.length;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          addConsoleMessage({ type: 'warning', message: `Failed to load KVMs for ${env}: ${errorMsg}` });
        }
      }
      addConsoleMessage({
        type: 'success',
        message: `Loaded ${totalKvms} KVM(s) across ${environments.length} environment(s)`,
      });

      // Clear token from input for security
      setToken('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      addConsoleMessage({ type: 'error', message });
      disconnect();
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setToken('');
  };

  const handleRefreshToken = () => {
    // Keep orgId, clear connection, prompt for new token
    resetData();
    useKvmStore.setState({
      connection: {
        organizationId: orgId,
        accessToken: '',
        tokenExpiry: null,
        isConnected: false,
      },
    });
    addConsoleMessage({ type: 'info', message: 'Token cleared. Please enter a new access token.' });
  };

  const isTokenExpiring = isTokenExpiringSoon(connection.tokenExpiry, 10);
  const isTokenExpired = isTokenExpiringSoon(connection.tokenExpiry, 0);

  return (
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
            disabled={connection.isConnected || isConnecting}
            placeholder="Organization ID"
            className={cn(
              'w-full h-10 bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
              'border-none rounded-lg px-4 text-sm font-mono',
              'placeholder:text-[var(--swiss-gray-400)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--swiss-black)] dark:focus:ring-[var(--swiss-gray-500)]',
              'transition-all duration-200',
              (connection.isConnected || isConnecting) && 'opacity-60'
            )}
          />
        </div>

        {/* Access Token Input */}
        {!connection.isConnected && (
          <div className="flex items-center gap-2 flex-1 max-w-[400px]">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isConnecting}
              placeholder="Access Token"
              className={cn(
                'flex-1 h-10 bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                'border-none rounded-lg px-4 text-sm font-mono',
                'placeholder:text-[var(--swiss-gray-400)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--swiss-black)] dark:focus:ring-[var(--swiss-gray-500)]',
                'transition-all duration-200',
                isConnecting && 'opacity-60'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isConnecting) {
                  handleConnect();
                }
              }}
            />

            {/* OAuth Playground Button */}
            <button
              type="button"
              onClick={() => openUrl('https://developers.google.com/oauthplayground')}
              className={cn(
                'flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg',
                'text-[10px] font-semibold whitespace-nowrap',
                'bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
                'text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]',
                'hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#333]',
                'transition-all duration-200'
              )}
              title="Open OAuth Playground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              OAuth
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
                  {t('kvm.header.howToGetToken', 'How to get a token')}
                </p>

                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center text-[10px] font-bold">1</span>
                    <p className="text-[12px]">Open <span className="font-semibold">OAuth Playground</span></p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center text-[10px] font-bold">2</span>
                    <p className="text-[12px]">Select <span className="font-semibold">Apigee API</span> and authorize</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center text-[10px] font-bold">3</span>
                    <p className="text-[12px]"><span className="font-semibold">Exchange</span> code for tokens</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center text-[10px] font-bold">4</span>
                    <p className="text-[12px]">Copy <span className="font-semibold">Access Token</span></p>
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
        <button
          onClick={connection.isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className={cn(
            'flex items-center justify-center gap-2 h-10 px-5 rounded-lg',
            'text-[11px] font-bold uppercase tracking-wider',
            'transition-all duration-200',
            connection.isConnected
              ? 'bg-[var(--swiss-gray-100)] dark:bg-[#252525] text-[var(--swiss-gray-700)] dark:text-[var(--swiss-gray-300)] hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#333]'
              : 'bg-[var(--swiss-black)] dark:bg-[#E5E5E5] text-[var(--swiss-white)] dark:text-[#1A1A1A] hover:opacity-90 shadow-md hover:shadow-lg',
            isConnecting && 'opacity-75 cursor-not-allowed'
          )}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('kvm.header.connecting', 'Connecting...')}
            </>
          ) : connection.isConnected ? (
            <>
              <PowerOff className="h-4 w-4" />
              {t('kvm.header.disconnect', 'Disconnect')}
            </>
          ) : (
            <>
              <Power className="h-4 w-4" />
              {t('kvm.header.connect', 'Connect')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
