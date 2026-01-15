import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CheckCircle2, XCircle, Cloud, Clock, FileCode2, Loader2, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { templatesSyncService, type SyncProgress } from '@/services/templates';
import { templateRegistry } from '@/services/templates';
import { cn } from '@/lib/utils';

export function TemplateSyncSettings() {
  const { t } = useTranslation();
  const {
    templateRepoConfig,
    updateTemplateRepoConfig,
    azureDevOpsConfig,
  } = useProjectStore();

  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [syncInfo, setSyncInfo] = useState<{
    lastSyncDate?: string;
    lastCommitSha?: string;
    totalFiles?: number;
  } | null>(null);

  // Load sync info on mount with cleanup to prevent memory leaks
  useEffect(() => {
    let isMounted = true;

    const loadSyncInfo = async () => {
      const info = await templateRegistry.getSyncInfo();
      if (isMounted && info) {
        setSyncInfo({
          lastSyncDate: info.lastSyncDate,
          lastCommitSha: info.lastCommitSha,
          totalFiles: info.totalFiles,
        });
      }
    };

    loadSyncInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadSyncInfo = async () => {
    const info = await templateRegistry.getSyncInfo();
    if (info) {
      setSyncInfo({
        lastSyncDate: info.lastSyncDate,
        lastCommitSha: info.lastCommitSha,
        totalFiles: info.totalFiles,
      });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const token = azureDevOpsConfig.personalAccessToken || '';
      const result = await templatesSyncService.testConnection(templateRepoConfig, token);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || t('templateSync.messages.connectionError'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncProgress({
      status: 'checking',
      message: t('templateSync.actions.syncing'),
      filesDownloaded: 0,
      totalFiles: 0,
    });

    try {
      const token = azureDevOpsConfig.personalAccessToken || '';
      const result = await templatesSyncService.syncTemplates(
        templateRepoConfig,
        token,
        (progress) => setSyncProgress(progress)
      );

      if (result.success) {
        // Update last sync info in config
        updateTemplateRepoConfig({
          lastSyncDate: new Date().toISOString(),
        });

        // Reload sync info
        await loadSyncInfo();

        // Enable remote templates in registry
        await templateRegistry.enableRemoteTemplates(true);

        setSyncProgress({
          status: 'complete',
          message: t('templateSync.messages.syncSuccess'),
          filesDownloaded: result.filesCount,
          totalFiles: result.filesCount,
        });
      } else {
        setSyncProgress({
          status: 'error',
          message: result.message,
          filesDownloaded: 0,
          totalFiles: 0,
          error: result.message,
        });
      }
    } catch (error: any) {
      setSyncProgress({
        status: 'error',
        message: error.message || t('templateSync.messages.syncError'),
        filesDownloaded: 0,
        totalFiles: 0,
        error: error.message,
      });
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString();
  };

  const isConfigValid = templateRepoConfig.organization &&
                        templateRepoConfig.project &&
                        templateRepoConfig.repositoryName &&
                        azureDevOpsConfig.personalAccessToken;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
          <RefreshCw className="h-5 w-5" />
          {t('templateSync.title')}
        </h2>
        <p className="text-sm text-[var(--swiss-gray-500)] mt-2">
          {t('templateSync.description')}
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="border-2 border-[var(--swiss-gray-200)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase mb-1">
              {t('templateSync.enable')}
            </p>
            <p className="text-xs text-[var(--swiss-gray-500)]">
              {t('templateSync.enableDescription')}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={templateRepoConfig.enabled}
              onChange={(e) => updateTemplateRepoConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--swiss-gray-200)] peer-checked:bg-[var(--swiss-black)] transition-colors">
              <div className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--swiss-white)] transition-transform",
                templateRepoConfig.enabled && "translate-x-5"
              )} />
            </div>
          </label>
        </div>
      </div>

      {/* Configuration Fields */}
      {templateRepoConfig.enabled && (
        <div className="space-y-6 border-2 border-[var(--swiss-gray-200)] p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Organization */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('templateSync.fields.organization.label')}
              </label>
              <input
                value={templateRepoConfig.organization}
                onChange={(e) => updateTemplateRepoConfig({ organization: e.target.value })}
                placeholder={t('templateSync.fields.organization.placeholder')}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
              />
              <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
                {t('templateSync.fields.organization.help')}
              </p>
            </div>

            {/* Project */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('templateSync.fields.project.label')}
              </label>
              <input
                value={templateRepoConfig.project}
                onChange={(e) => updateTemplateRepoConfig({ project: e.target.value })}
                placeholder={t('templateSync.fields.project.placeholder')}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
              />
              <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
                {t('templateSync.fields.project.help')}
              </p>
            </div>

            {/* Repository */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('templateSync.fields.repository.label')}
              </label>
              <input
                value={templateRepoConfig.repositoryName}
                onChange={(e) => updateTemplateRepoConfig({ repositoryName: e.target.value })}
                placeholder={t('templateSync.fields.repository.placeholder')}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
              />
              <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
                {t('templateSync.fields.repository.help')}
              </p>
            </div>

            {/* Branch */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('templateSync.fields.branch.label')}
              </label>
              <input
                value={templateRepoConfig.branch}
                onChange={(e) => updateTemplateRepoConfig({ branch: e.target.value })}
                placeholder={t('templateSync.fields.branch.placeholder')}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
              />
              <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
                {t('templateSync.fields.branch.help')}
              </p>
            </div>
          </div>

          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--swiss-gray-200)]">
            <div>
              <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase mb-1">
                {t('templateSync.fields.autoSync.label')}
              </p>
              <p className="text-xs text-[var(--swiss-gray-500)]">
                {t('templateSync.fields.autoSync.help')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={templateRepoConfig.autoSyncOnStartup}
                onChange={(e) => updateTemplateRepoConfig({ autoSyncOnStartup: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--swiss-gray-200)] peer-checked:bg-[var(--swiss-black)] transition-colors">
                <div className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--swiss-white)] transition-transform",
                  templateRepoConfig.autoSyncOnStartup && "translate-x-5"
                )} />
              </div>
            </label>
          </div>

          {/* PAT Notice - Monochrome style */}
          {!azureDevOpsConfig.personalAccessToken && (
            <div className="bg-[var(--bg-primary)] p-4 border-l-4 border-amber-500 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-primary)]">
                {t('templateSync.messages.proxyRequired')} - Configure your PAT in the Azure DevOps tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sync Status */}
      {templateRepoConfig.enabled && (
        <div className="border-2 border-[var(--swiss-gray-200)] p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--swiss-gray-400)] mb-4 flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            {t('templateSync.status.title')}
          </h3>

          {syncInfo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-[var(--swiss-gray-400)]" />
                <span className="text-[var(--swiss-gray-500)]">{t('templateSync.status.lastSync')}:</span>
                <span className="font-mono font-bold">
                  {formatDate(syncInfo.lastSyncDate!)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FileCode2 className="h-4 w-4 text-[var(--swiss-gray-400)]" />
                <span className="font-bold">{syncInfo.totalFiles}</span>
                <span className="text-[var(--swiss-gray-500)]">{t('templateSync.status.files')}</span>
              </div>
              {syncInfo.lastCommitSha && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--swiss-gray-500)]">{t('templateSync.status.commit')}:</span>
                  <code className="text-xs font-mono bg-[var(--swiss-gray-100)] px-2 py-1">
                    {syncInfo.lastCommitSha.substring(0, 8)}
                  </code>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--swiss-gray-400)]">
              {t('templateSync.status.notSynced')}
            </p>
          )}

          {/* Sync Progress */}
          {syncProgress && syncProgress.status !== 'idle' && (
            <div className="mt-4 pt-4 border-t border-[var(--swiss-gray-200)]">
              <div className="flex items-center gap-2">
                {syncProgress.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : syncProgress.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  syncProgress.status === 'error' && "text-red-600",
                  syncProgress.status === 'complete' && "text-green-600"
                )}>
                  {syncProgress.message}
                </span>
              </div>
              {syncProgress.status === 'downloading' && (
                <div className="mt-3">
                  <div className="h-1 bg-[var(--swiss-gray-200)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--swiss-black)] transition-all duration-300"
                      style={{
                        width: `${(syncProgress.filesDownloaded / syncProgress.totalFiles) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--swiss-gray-400)] mt-2 font-mono">
                    {syncProgress.filesDownloaded} / {syncProgress.totalFiles} files
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Test Result - Monochrome style */}
      {testResult && (
        <div className={cn(
          "p-4 border-l-4 flex items-start gap-3 bg-[var(--bg-primary)]",
          testResult.success
            ? "border-green-500"
            : "border-red-500"
        )}>
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm text-[var(--text-primary)]">
            {testResult.message}
          </span>
        </div>
      )}

      {/* Actions */}
      {templateRepoConfig.enabled && (
        <div className="flex gap-4">
          <button
            onClick={handleTestConnection}
            disabled={!isConfigValid || isTesting}
            className={cn(
              "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-2 border-[var(--swiss-black)]",
              !isConfigValid || isTesting
                ? "bg-[var(--swiss-gray-100)] text-[var(--swiss-gray-400)] border-[var(--swiss-gray-300)] cursor-not-allowed"
                : "bg-[var(--swiss-white)] text-[var(--swiss-black)] hover:bg-[var(--swiss-gray-100)]"
            )}
          >
            {isTesting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('templateSync.actions.testing')}
              </span>
            ) : (
              t('templateSync.actions.testConnection')
            )}
          </button>
          <button
            onClick={handleSync}
            disabled={!isConfigValid || syncProgress?.status === 'checking' || syncProgress?.status === 'downloading'}
            className={cn(
              "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              !isConfigValid || syncProgress?.status === 'checking' || syncProgress?.status === 'downloading'
                ? "bg-[var(--swiss-gray-300)] text-[var(--swiss-white)] cursor-not-allowed"
                : "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
            )}
          >
            {syncProgress?.status === 'checking' || syncProgress?.status === 'downloading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('templateSync.actions.syncing')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {t('templateSync.actions.sync')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
