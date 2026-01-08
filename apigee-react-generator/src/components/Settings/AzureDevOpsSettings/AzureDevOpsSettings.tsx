import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '@/store/useProjectStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AzureDevOpsService } from '@/services/azure-devops/AzureDevOpsService';
import { Cloud, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Info } from 'lucide-react';

export function AzureDevOpsSettings() {
  const { t } = useTranslation();
  const { azureDevOpsConfig, updateAzureDevOpsConfig } = useProjectStore();

  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Update lastSaved when config changes
  useEffect(() => {
    setLastSaved(new Date());
  }, [azureDevOpsConfig.organization, azureDevOpsConfig.project, azureDevOpsConfig.personalAccessToken, azureDevOpsConfig.defaultBranch]);

  const handleTestConnection = async () => {
    if (!azureDevOpsConfig.organization || !azureDevOpsConfig.personalAccessToken) {
      setTestResult({
        success: false,
        message: t('azureSettings.missingFields'),
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const service = new AzureDevOpsService(
        azureDevOpsConfig.organization,
        azureDevOpsConfig.personalAccessToken,
        true
      );

      const success = await service.testConnection();

      setTestResult({
        success,
        message: success
          ? t('azureSettings.testSuccess')
          : t('azureSettings.testFailure'),
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || t('azureSettings.testError'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Cloud className="h-5 w-5 text-[var(--lavender-600)]" />
          {t('azureSettings.title')}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t('azureSettings.description')}
        </p>
      </div>

      <Alert className="bg-[var(--sky-100)] border-[var(--sky-300)]">
        <Info className="h-4 w-4 text-[var(--sky-600)]" />
        <AlertDescription className="text-[var(--sky-700)]">
          {t('azureSettings.repoNameNote')}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="organization" className="text-[var(--text-primary)]">
            {t('azureSettings.fields.organization.label')}
          </Label>
          <Input
            id="organization"
            value={azureDevOpsConfig.organization}
            onChange={(e) => updateAzureDevOpsConfig({ organization: e.target.value })}
            placeholder={t('azureSettings.fields.organization.placeholder')}
            className="rounded-xl border-[var(--border-light)] focus:border-[var(--lavender-400)] focus:ring-[var(--lavender-200)]"
          />
          <p className="text-xs text-[var(--text-tertiary)]">
            {t('azureSettings.fields.organization.help')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project" className="text-[var(--text-primary)]">
            {t('azureSettings.fields.project.label')}
          </Label>
          <Input
            id="project"
            value={azureDevOpsConfig.project}
            onChange={(e) => updateAzureDevOpsConfig({ project: e.target.value })}
            placeholder={t('azureSettings.fields.project.placeholder')}
            className="rounded-xl border-[var(--border-light)] focus:border-[var(--lavender-400)] focus:ring-[var(--lavender-200)]"
          />
          <p className="text-xs text-[var(--text-tertiary)]">
            {t('azureSettings.fields.project.help')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pat" className="text-[var(--text-primary)]">
            {t('azureSettings.fields.pat.label')}
          </Label>
          <div className="relative">
            <Input
              id="pat"
              type={showToken ? 'text' : 'password'}
              value={azureDevOpsConfig.personalAccessToken}
              onChange={(e) => updateAzureDevOpsConfig({ personalAccessToken: e.target.value })}
              placeholder={t('azureSettings.fields.pat.placeholder')}
              className="rounded-xl border-[var(--border-light)] focus:border-[var(--lavender-400)] focus:ring-[var(--lavender-200)] pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {t('azureSettings.fields.pat.help')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultBranch" className="text-[var(--text-primary)]">
            {t('azureSettings.fields.defaultBranch.label')}
          </Label>
          <Input
            id="defaultBranch"
            value={azureDevOpsConfig.defaultBranch}
            onChange={(e) => updateAzureDevOpsConfig({ defaultBranch: e.target.value })}
            placeholder={t('azureSettings.fields.defaultBranch.placeholder')}
            className="rounded-xl border-[var(--border-light)] focus:border-[var(--lavender-400)] focus:ring-[var(--lavender-200)]"
          />
          <p className="text-xs text-[var(--text-tertiary)]">
            {t('azureSettings.fields.defaultBranch.help')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-light)]">
        <Button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="soft-button bg-[var(--lavender-500)] hover:bg-[var(--lavender-600)] text-white rounded-xl"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('azureSettings.testing')}
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              {t('azureSettings.testConnection')}
            </>
          )}
        </Button>

        {lastSaved && (
          <span className="text-xs text-[var(--text-tertiary)]">
            {t('common.savedAutomatically')}
          </span>
        )}
      </div>

      {testResult && (
        <Alert
          className={
            testResult.success
              ? 'bg-[var(--mint-100)] border-[var(--mint-400)]'
              : 'bg-[var(--peach-100)] border-[var(--peach-400)]'
          }
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-[var(--mint-600)]" />
          ) : (
            <XCircle className="h-4 w-4 text-[var(--peach-600)]" />
          )}
          <AlertDescription
            className={
              testResult.success ? 'text-[var(--mint-700)]' : 'text-[var(--peach-700)]'
            }
          >
            {testResult.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
