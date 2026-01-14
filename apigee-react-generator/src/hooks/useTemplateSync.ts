import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { templatesSyncService, templateRegistry, templatesCacheService } from '@/services/templates';
import { logger } from '@/utils/logger';

const log = logger.scope('useTemplateSync');

export interface TemplateSyncState {
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncDate: string | null;
  error: string | null;
  source: 'remote' | 'local' | 'none';
}

/**
 * Hook to handle automatic template synchronization on app startup
 */
export function useTemplateSync() {
  const { templateRepoConfig, azureDevOpsConfig, updateTemplateRepoConfig } = useProjectStore();
  const [state, setState] = useState<TemplateSyncState>({
    isInitialized: false,
    isSyncing: false,
    lastSyncDate: null,
    error: null,
    source: 'none',
  });

  useEffect(() => {
    const initializeTemplates = async () => {
      try {
        // Check if we have cached templates
        const hasCachedTemplates = await templatesCacheService.hasCache();
        const syncInfo = await templatesCacheService.getSyncInfo();

        // If template sync is enabled and we have a PAT
        if (templateRepoConfig.enabled && azureDevOpsConfig.personalAccessToken) {
          // Enable remote templates in the loader
          await templateRegistry.enableRemoteTemplates(true);

          // If auto-sync is enabled, check for updates
          if (templateRepoConfig.autoSyncOnStartup) {
            setState(prev => ({ ...prev, isSyncing: true }));

            try {
              // Check if we need to sync
              const { needsSync, remoteCommit } = await templatesSyncService.checkForUpdates(
                templateRepoConfig,
                azureDevOpsConfig.personalAccessToken
              );

              if (needsSync && remoteCommit) {
                // Sync templates
                const result = await templatesSyncService.syncTemplates(
                  templateRepoConfig,
                  azureDevOpsConfig.personalAccessToken
                );

                if (result.success) {
                  // Update config with last sync info
                  updateTemplateRepoConfig({
                    lastSyncDate: new Date().toISOString(),
                    lastSyncCommit: remoteCommit,
                  });

                  // Re-initialize registry with new templates
                  await templateRegistry.enableRemoteTemplates(true);

                  setState({
                    isInitialized: true,
                    isSyncing: false,
                    lastSyncDate: new Date().toISOString(),
                    error: null,
                    source: 'remote',
                  });
                } else {
                  // Sync failed, but we might have cached templates
                  setState({
                    isInitialized: true,
                    isSyncing: false,
                    lastSyncDate: syncInfo?.lastSyncDate || null,
                    error: result.message,
                    source: hasCachedTemplates ? 'remote' : 'local',
                  });
                }
              } else {
                // No sync needed, use cached templates
                setState({
                  isInitialized: true,
                  isSyncing: false,
                  lastSyncDate: syncInfo?.lastSyncDate || null,
                  error: null,
                  source: hasCachedTemplates ? 'remote' : 'local',
                });
              }
            } catch (error) {
              log.warn('Auto-sync failed, continuing with cached or local templates', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              setState({
                isInitialized: true,
                isSyncing: false,
                lastSyncDate: syncInfo?.lastSyncDate || null,
                error: errorMessage,
                source: hasCachedTemplates ? 'remote' : 'local',
              });
            }
          } else {
            // Auto-sync disabled, just use cached templates if available
            setState({
              isInitialized: true,
              isSyncing: false,
              lastSyncDate: syncInfo?.lastSyncDate || null,
              error: null,
              source: hasCachedTemplates ? 'remote' : 'local',
            });
          }
        } else {
          // Template sync not enabled, use local templates
          await templateRegistry.enableRemoteTemplates(false);
          setState({
            isInitialized: true,
            isSyncing: false,
            lastSyncDate: null,
            error: null,
            source: 'local',
          });
        }
      } catch (error) {
        log.error('Template initialization failed', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState({
          isInitialized: true,
          isSyncing: false,
          lastSyncDate: null,
          error: errorMessage,
          source: 'local',
        });
      }
    };

    initializeTemplates();
  }, [templateRepoConfig.enabled, templateRepoConfig.autoSyncOnStartup]);

  return state;
}
