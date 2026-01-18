import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  ChevronDown,
  Server,
  Loader2,
  Lock,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import { ApigeeClient, KvmService } from '@/services/apigee';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

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
    hasUnsavedChanges,
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

  const [searchFilter, setSearchFilter] = useState('');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingNavigationRef = useRef<{ env: string; kvmName: string } | null>(null);

  const getService = useCallback(() => {
    if (!connection.isConnected) return null;
    const client = new ApigeeClient({
      organizationId: connection.organizationId,
      accessToken: connection.accessToken,
    });
    return new KvmService(client);
  }, [connection]);

  // Filter KVMs based on search
  const filteredKvmsByEnvironment = useMemo(() => {
    if (!searchFilter.trim()) return envKvmsByEnvironment;

    const filtered: Record<string, string[]> = {};
    const lowerFilter = searchFilter.toLowerCase();

    for (const [env, kvms] of Object.entries(envKvmsByEnvironment)) {
      if (kvms) {
        const matchingKvms = kvms.filter(kvm =>
          kvm.toLowerCase().includes(lowerFilter)
        );
        if (matchingKvms.length > 0) {
          filtered[env] = matchingKvms;
        }
      }
    }

    return filtered;
  }, [envKvmsByEnvironment, searchFilter]);

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

  const navigateToKvm = useCallback(async (env: string, kvmName: string) => {
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
  }, [getService, setSelectedEnvironment, setSelectedScope, setSelectedProxyName, setSelectedKvm, setLoading, setCurrentKvm, addConsoleMessage]);

  const handleKvmClick = useCallback((env: string, kvmName: string) => {
    // If same KVM, do nothing
    if (env === selectedEnvironment && kvmName === selectedKvmName) {
      return;
    }

    // If unsaved changes, show confirmation dialog
    if (hasUnsavedChanges) {
      pendingNavigationRef.current = { env, kvmName };
      setShowUnsavedDialog(true);
      return;
    }

    // Navigate directly
    navigateToKvm(env, kvmName);
  }, [selectedEnvironment, selectedKvmName, hasUnsavedChanges, navigateToKvm]);

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false);
    if (pendingNavigationRef.current) {
      const { env, kvmName } = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      navigateToKvm(env, kvmName);
    }
  }, [navigateToKvm]);

  const handleCancelNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    pendingNavigationRef.current = null;
  }, []);

  if (!connection.isConnected) {
    return (
      <div className={cn(
        'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
        'shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
        'p-5 flex items-center justify-center',
        className
      )}>
        <p className="text-[12px] text-[var(--swiss-gray-500)] text-center">
          {t('kvm.sidebar.connectFirst', 'Connect to view KVMs')}
        </p>
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <div className={cn(
        'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
        'shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
        'p-5 flex items-center justify-center',
        className
      )}>
        <div className="flex items-center justify-center gap-2 text-[var(--swiss-gray-500)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[12px]">{t('kvm.sidebar.loading', 'Loading...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
      'shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
      'flex flex-col overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--swiss-gray-100)] dark:border-[#333]">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--swiss-gray-500)] mb-3">
          {t('kvm.sidebar.title', 'Environments')}
        </h3>
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--swiss-gray-400)]" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={t('kvm.sidebar.searchPlaceholder', 'Filter KVMs...')}
            className={cn(
              'w-full pl-9 pr-8 py-2 text-[12px]',
              'bg-[var(--swiss-gray-100)] dark:bg-[#252525]',
              'border-none ',
              'text-[var(--swiss-black)] dark:text-[#E5E5E5]',
              'placeholder:text-[var(--swiss-gray-400)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--swiss-black)] dark:focus:ring-[#555]',
              'transition-all duration-150'
            )}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#333] transition-colors"
            >
              <X className="h-3 w-3 text-[var(--swiss-gray-400)]" />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-3">
        {environments.map((env) => (
          <div key={env} className="mb-2">
            {/* Environment Node */}
            <button
              onClick={() => handleEnvironmentClick(env)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-left ',
                'text-[12px] font-semibold',
                'hover:bg-[var(--swiss-gray-100)] dark:hover:bg-[#333]',
                'transition-all duration-150'
              )}
            >
              <div className="flex items-center gap-2 flex-1">
                <Server className="h-4 w-4 text-amber-500" />
                <span className="text-[var(--swiss-black)] dark:text-[#E5E5E5]">{env}</span>
              </div>
              {envKvmsByEnvironment[env] && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--swiss-gray-200)] dark:bg-[#333] text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]">
                  {searchFilter && filteredKvmsByEnvironment[env]
                    ? `${filteredKvmsByEnvironment[env].length}/${envKvmsByEnvironment[env].length}`
                    : envKvmsByEnvironment[env].length}
                </span>
              )}
              {expandedEnvironments.has(env) ? (
                <ChevronDown className="h-4 w-4 text-[var(--swiss-gray-400)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--swiss-gray-400)]" />
              )}
            </button>

            {/* KVM List */}
            {expandedEnvironments.has(env) && (
              <div className="ml-4 pl-4 border-l-2 border-[var(--swiss-gray-200)] dark:border-[#444] mt-1">
                {!envKvmsByEnvironment[env] ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-[var(--swiss-gray-400)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-[11px]">Loading...</span>
                  </div>
                ) : (filteredKvmsByEnvironment[env]?.length || 0) === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-[var(--swiss-gray-400)] italic">
                    {searchFilter
                      ? t('kvm.sidebar.noMatchingKvms', 'No matching KVMs')
                      : t('kvm.sidebar.noKvms', 'No KVMs found')}
                  </p>
                ) : (
                  (filteredKvmsByEnvironment[env] || []).map((kvmName) => {
                    const isSelected =
                      selectedKvmName === kvmName && selectedEnvironment === env;

                    return (
                      <button
                        key={kvmName}
                        onClick={() => handleKvmClick(env, kvmName)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-left  mb-1',
                          'transition-all duration-150',
                          isSelected
                            ? 'bg-[var(--swiss-black)] dark:bg-[#E5E5E5] text-[var(--swiss-white)] dark:text-[#1A1A1A] shadow-md'
                            : 'hover:bg-[var(--swiss-gray-100)] dark:hover:bg-[#333]'
                        )}
                      >
                        <Lock
                          className={cn(
                            'h-3.5 w-3.5 flex-shrink-0',
                            isSelected
                              ? 'text-[var(--swiss-white)] dark:text-[#1A1A1A]'
                              : 'text-[var(--swiss-gray-400)] dark:text-[#888]'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[12px] font-mono truncate',
                            isSelected
                              ? 'text-[var(--swiss-white)] dark:text-[#1A1A1A]'
                              : 'text-[var(--swiss-black)] dark:text-[#E5E5E5]'
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
        <div className="absolute inset-0 bg-[var(--swiss-white)]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--swiss-gray-500)]" />
        </div>
      )}

      {/* Unsaved changes confirmation */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
};
