import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import {
  ApigeeClient,
  KvmService,
  validateGcpToken,
  getTokenRemainingTime,
  isTokenExpiringSoon,
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
      // Validate token
      const validation = await validateGcpToken(token, orgId);

      if (!validation.valid) {
        addConsoleMessage({
          type: 'error',
          message: validation.error || 'Token validation failed',
        });
        setConnecting(false);
        return;
      }

      // Connect and fetch initial data
      connect(orgId, token);

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
        'bg-[var(--swiss-white)] border-b-2 border-[var(--swiss-black)] px-6 py-4',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Organization ID Input */}
        <div className="flex-1 max-w-xs">
          <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)] mb-1">
            {t('kvm.header.organizationId', 'Organization ID')}
          </label>
          <input
            type="text"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            disabled={connection.isConnected || isConnecting}
            placeholder="my-gcp-project"
            className={cn(
              'w-full bg-transparent border-b-2 py-1.5 text-sm font-mono',
              'placeholder:text-[var(--swiss-gray-400)]',
              'focus:outline-none transition-colors',
              connection.isConnected || isConnecting
                ? 'border-[var(--swiss-gray-300)] text-[var(--swiss-gray-500)]'
                : 'border-[var(--swiss-black)] focus:border-[var(--swiss-black)]'
            )}
          />
        </div>

        {/* Access Token Input */}
        {!connection.isConnected && (
          <div className="flex-1 max-w-md">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)] mb-1">
              {t('kvm.header.accessToken', 'Access Token')}
              <span className="ml-2 font-normal normal-case text-[var(--swiss-gray-400)]">
                (gcloud auth print-access-token)
              </span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isConnecting}
              placeholder="ya29.xxx..."
              className={cn(
                'w-full bg-transparent border-b-2 py-1.5 text-sm font-mono',
                'placeholder:text-[var(--swiss-gray-400)]',
                'focus:outline-none transition-colors',
                isConnecting
                  ? 'border-[var(--swiss-gray-300)]'
                  : 'border-[var(--swiss-black)] focus:border-[var(--swiss-black)]'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isConnecting) {
                  handleConnect();
                }
              }}
            />
          </div>
        )}

        {/* Connection Status */}
        {connection.isConnected && (
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider',
                isTokenExpired
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : isTokenExpiring
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              )}
            >
              {isTokenExpired ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {isTokenExpired
                ? t('kvm.header.tokenExpired', 'Token Expired')
                : t('kvm.header.connected', 'Connected')}
            </div>

            {/* Token expiry countdown */}
            {tokenRemaining && !isTokenExpired && (
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono',
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
                'p-2 transition-colors',
                'text-[var(--swiss-gray-500)] hover:text-[var(--swiss-black)]',
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
            'flex items-center gap-2 px-4 py-2',
            'text-[10px] font-black uppercase tracking-widest',
            'transition-all duration-150',
            connection.isConnected
              ? 'bg-[var(--swiss-white)] text-[var(--swiss-black)] border-2 border-[var(--swiss-black)] hover:bg-[var(--swiss-black)] hover:text-[var(--swiss-white)]'
              : 'bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]',
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
