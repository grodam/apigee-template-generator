import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  ChevronDown,
  Server,
  Loader2,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import { ApigeeClient, KvmService } from '@/services/apigee';

interface KvmSidebarProps {
  className?: string;
}

export const KvmSidebar: React.FC<KvmSidebarProps> = ({ className }) => {
  const { t } = useTranslation();
  const {
    connection,
    environments,
    envKvmsByEnvironment,
    selectedEnvironment,
    selectedKvmName,
    expandedEnvironments,
    isLoading,
    setSelectedEnvironment,
    setSelectedScope,
    setSelectedProxyName,
    setSelectedKvm,
    setEnvKvmsForEnvironment,
    setCurrentKvm,
    toggleEnvironmentExpanded,
    setLoading,
    addConsoleMessage,
  } = useKvmStore();

  const getService = useCallback(() => {
    if (!connection.isConnected) return null;
    const client = new ApigeeClient({
      organizationId: connection.organizationId,
      accessToken: connection.accessToken,
    });
    return new KvmService(client);
  }, [connection]);

  const handleEnvironmentClick = async (env: string) => {
    toggleEnvironmentExpanded(env);

    // Load environment KVMs if not already loaded
    if (!expandedEnvironments.has(env) && !envKvmsByEnvironment[env]) {
      const service = getService();
      if (!service) return;

      setLoading(true);
      try {
        const kvms = await service.listEnvKvms(env);
        setEnvKvmsForEnvironment(env, kvms);
        addConsoleMessage({
          type: 'info',
          message: `Loaded ${kvms.length} KVM(s) from ${env}`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load KVMs';
        addConsoleMessage({ type: 'error', message });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKvmClick = async (env: string, kvmName: string) => {
    setSelectedEnvironment(env);
    setSelectedScope('environment');
    setSelectedProxyName(null);
    setSelectedKvm(kvmName);

    const service = getService();
    if (!service) return;

    setLoading(true);
    try {
      const kvm = await service.getEnvKvm(env, kvmName);
      setCurrentKvm(kvm);
      addConsoleMessage({
        type: 'success',
        message: `Loaded KVM: ${kvmName} (${kvm.keyValueEntries?.length || 0} entries)`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load KVM';
      addConsoleMessage({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  if (!connection.isConnected) {
    return (
      <div className={cn('bg-[var(--swiss-white)] p-4', className)}>
        <p className="text-[11px] text-[var(--swiss-gray-500)] text-center">
          {t('kvm.sidebar.connectFirst', 'Connect to view KVMs')}
        </p>
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <div className={cn('bg-[var(--swiss-white)] p-4', className)}>
        <div className="flex items-center justify-center gap-2 text-[var(--swiss-gray-500)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[11px]">{t('kvm.sidebar.loading', 'Loading...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-[var(--swiss-white)] overflow-auto', className)}>
      {/* Tree */}
      <div className="py-2">
        {environments.map((env) => (
          <div key={env}>
            {/* Environment Node */}
            <button
              onClick={() => handleEnvironmentClick(env)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left',
                'text-[11px] font-bold uppercase tracking-wider',
                'hover:bg-[var(--swiss-gray-100)] transition-colors',
                'border-b border-[var(--swiss-gray-100)]'
              )}
            >
              {expandedEnvironments.has(env) ? (
                <ChevronDown className="h-3.5 w-3.5 text-[var(--swiss-gray-500)]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[var(--swiss-gray-500)]" />
              )}
              <Server className="h-3.5 w-3.5 text-[var(--swiss-gray-600)]" />
              <span>{env}</span>
              {envKvmsByEnvironment[env] && (
                <span className="text-[var(--swiss-gray-400)] font-normal">
                  ({envKvmsByEnvironment[env].length})
                </span>
              )}
            </button>

            {/* KVM List */}
            {expandedEnvironments.has(env) && (
              <div className="border-b border-[var(--swiss-gray-100)]">
                {!envKvmsByEnvironment[env] ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-[var(--swiss-gray-400)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-[10px]">Loading...</span>
                  </div>
                ) : envKvmsByEnvironment[env].length === 0 ? (
                  <p className="px-4 py-3 text-[11px] text-[var(--swiss-gray-400)] italic">
                    {t('kvm.sidebar.noKvms', 'No KVMs found')}
                  </p>
                ) : (
                  envKvmsByEnvironment[env].map((kvmName) => {
                    const isSelected =
                      selectedKvmName === kvmName && selectedEnvironment === env;

                    return (
                      <button
                        key={kvmName}
                        onClick={() => handleKvmClick(env, kvmName)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2 text-left',
                          'hover:bg-[var(--swiss-gray-100)] transition-colors',
                          isSelected &&
                            'bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-black)]'
                        )}
                      >
                        <Lock
                          className={cn(
                            'h-3 w-3 flex-shrink-0',
                            isSelected ? 'text-[var(--swiss-white)]' : 'text-[var(--swiss-gray-400)]'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[11px] font-mono truncate',
                            isSelected ? 'text-[var(--swiss-white)]' : 'text-[var(--swiss-black)]'
                          )}
                        >
                          {kvmName}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[var(--swiss-white)]/80 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--swiss-gray-500)]" />
        </div>
      )}
    </div>
  );
};
