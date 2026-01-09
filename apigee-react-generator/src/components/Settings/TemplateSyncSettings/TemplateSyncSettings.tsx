import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CheckCircle2, XCircle, Cloud, Clock, FileCode2, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { templatesSyncService, type SyncProgress } from '@/services/templates';
import { templateRegistry } from '@/services/templates';

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

  // Load sync info on mount
  useEffect(() => {
    loadSyncInfo();
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {t('templateSync.title')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t('templateSync.description')}
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-[var(--border-default)]">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">{t('templateSync.enable')}</Label>
          <p className="text-xs text-[var(--text-tertiary)]">
            {t('templateSync.enableDescription')}
          </p>
        </div>
        <Switch
          checked={templateRepoConfig.enabled}
          onCheckedChange={(checked: boolean) => updateTemplateRepoConfig({ enabled: checked })}
        />
      </div>

      {/* Configuration Fields */}
      {templateRepoConfig.enabled && (
        <div className="space-y-4 p-4 bg-white/50 rounded-lg border border-[var(--border-default)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-org">{t('templateSync.fields.organization.label')}</Label>
              <Input
                id="template-org"
                value={templateRepoConfig.organization}
                onChange={(e) => updateTemplateRepoConfig({ organization: e.target.value })}
                placeholder={t('templateSync.fields.organization.placeholder')}
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                {t('templateSync.fields.organization.help')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-project">{t('templateSync.fields.project.label')}</Label>
              <Input
                id="template-project"
                value={templateRepoConfig.project}
                onChange={(e) => updateTemplateRepoConfig({ project: e.target.value })}
                placeholder={t('templateSync.fields.project.placeholder')}
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                {t('templateSync.fields.project.help')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-repo">{t('templateSync.fields.repository.label')}</Label>
              <Input
                id="template-repo"
                value={templateRepoConfig.repositoryName}
                onChange={(e) => updateTemplateRepoConfig({ repositoryName: e.target.value })}
                placeholder={t('templateSync.fields.repository.placeholder')}
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                {t('templateSync.fields.repository.help')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-branch">{t('templateSync.fields.branch.label')}</Label>
              <Input
                id="template-branch"
                value={templateRepoConfig.branch}
                onChange={(e) => updateTemplateRepoConfig({ branch: e.target.value })}
                placeholder={t('templateSync.fields.branch.placeholder')}
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                {t('templateSync.fields.branch.help')}
              </p>
            </div>
          </div>

          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)]">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('templateSync.fields.autoSync.label')}</Label>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t('templateSync.fields.autoSync.help')}
              </p>
            </div>
            <Switch
              checked={templateRepoConfig.autoSyncOnStartup}
              onCheckedChange={(checked: boolean) => updateTemplateRepoConfig({ autoSyncOnStartup: checked })}
            />
          </div>

          {/* PAT Notice */}
          {!azureDevOpsConfig.personalAccessToken && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-700">
                {t('templateSync.messages.proxyRequired')} - Configure your PAT in the Azure DevOps tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sync Status */}
      {templateRepoConfig.enabled && (
        <div className="p-4 bg-white/50 rounded-lg border border-[var(--border-default)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[var(--accent-600)]" />
            {t('templateSync.status.title')}
          </h3>

          {syncInfo ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Clock className="h-4 w-4" />
                <span>{t('templateSync.status.lastSync')}:</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {formatDate(syncInfo.lastSyncDate!)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <FileCode2 className="h-4 w-4" />
                <span>{syncInfo.totalFiles} {t('templateSync.status.files')}</span>
              </div>
              {syncInfo.lastCommitSha && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span>{t('templateSync.status.commit')}:</span>
                  <code className="text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                    {syncInfo.lastCommitSha.substring(0, 8)}
                  </code>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">
              {t('templateSync.status.notSynced')}
            </p>
          )}

          {/* Sync Progress */}
          {syncProgress && syncProgress.status !== 'idle' && (
            <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
              <div className="flex items-center gap-2">
                {syncProgress.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : syncProgress.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 text-[var(--accent-600)] animate-spin" />
                )}
                <span className={`text-sm ${
                  syncProgress.status === 'error' ? 'text-red-600' :
                  syncProgress.status === 'complete' ? 'text-green-600' :
                  'text-[var(--text-secondary)]'
                }`}>
                  {syncProgress.message}
                </span>
              </div>
              {syncProgress.status === 'downloading' && (
                <div className="mt-2">
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-500)] transition-all duration-300"
                      style={{
                        width: `${(syncProgress.filesDownloaded / syncProgress.totalFiles) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {syncProgress.filesDownloaded} / {syncProgress.totalFiles} files
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`p-3 rounded-md flex items-center gap-2 ${
          testResult.success
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span className="text-sm">{testResult.message}</span>
        </div>
      )}

      {/* Actions */}
      {templateRepoConfig.enabled && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!isConfigValid || isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('templateSync.actions.testing')}
              </>
            ) : (
              t('templateSync.actions.testConnection')
            )}
          </Button>
          <Button
            onClick={handleSync}
            disabled={!isConfigValid || syncProgress?.status === 'checking' || syncProgress?.status === 'downloading'}
          >
            {syncProgress?.status === 'checking' || syncProgress?.status === 'downloading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('templateSync.actions.syncing')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('templateSync.actions.sync')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
