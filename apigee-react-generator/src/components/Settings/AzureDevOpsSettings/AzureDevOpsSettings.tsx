import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '@/store/useProjectStore';
import { AzureDevOpsService } from '@/services/azure-devops/AzureDevOpsService';
import { Cloud, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AzureDevOpsSettings() {
  const { t } = useTranslation();
  const { azureDevOpsConfig, updateAzureDevOpsConfig } = useProjectStore();

  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const testResultRef = useRef<HTMLDivElement>(null);

  // Update lastSaved when config changes
  useEffect(() => {
    setLastSaved(new Date());
  }, [azureDevOpsConfig.organization, azureDevOpsConfig.project, azureDevOpsConfig.personalAccessToken, azureDevOpsConfig.defaultBranch]);

  // Scroll to test result when it appears
  useEffect(() => {
    if (testResult && testResultRef.current) {
      testResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [testResult]);

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
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
          <Cloud className="h-5 w-5" />
          {t('azureSettings.title')}
        </h3>
        <p className="text-sm text-[var(--swiss-gray-500)] mt-2">
          {t('azureSettings.description')}
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-[var(--swiss-gray-50)] p-4 border-l-4 border-[var(--swiss-black)] flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[var(--swiss-gray-600)]">
          {t('azureSettings.repoNameNote')}
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Organization */}
        <div>
          <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
            {t('azureSettings.fields.organization.label')}
          </label>
          <input
            value={azureDevOpsConfig.organization}
            onChange={(e) => updateAzureDevOpsConfig({ organization: e.target.value })}
            placeholder={t('azureSettings.fields.organization.placeholder')}
            className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
          />
          <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
            {t('azureSettings.fields.organization.help')}
          </p>
        </div>

        {/* Project */}
        <div>
          <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
            {t('azureSettings.fields.project.label')}
          </label>
          <input
            value={azureDevOpsConfig.project}
            onChange={(e) => updateAzureDevOpsConfig({ project: e.target.value })}
            placeholder={t('azureSettings.fields.project.placeholder')}
            className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
          />
          <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
            {t('azureSettings.fields.project.help')}
          </p>
        </div>

        {/* Personal Access Token */}
        <div>
          <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
            {t('azureSettings.fields.pat.label')}
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={azureDevOpsConfig.personalAccessToken}
              onChange={(e) => updateAzureDevOpsConfig({ personalAccessToken: e.target.value })}
              placeholder={t('azureSettings.fields.pat.placeholder')}
              className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--swiss-gray-400)] hover:text-[var(--swiss-black)] transition-colors"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
            {t('azureSettings.fields.pat.help')}
          </p>
        </div>

        {/* Default Branch */}
        <div>
          <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
            {t('azureSettings.fields.defaultBranch.label')}
          </label>
          <input
            value={azureDevOpsConfig.defaultBranch}
            onChange={(e) => updateAzureDevOpsConfig({ defaultBranch: e.target.value })}
            placeholder={t('azureSettings.fields.defaultBranch.placeholder')}
            className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
          />
          <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
            {t('azureSettings.fields.defaultBranch.help')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-6 border-t-2 border-[var(--swiss-gray-200)]">
        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className={cn(
            "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            isTesting
              ? "bg-[var(--swiss-gray-300)] text-[var(--swiss-white)] cursor-not-allowed"
              : "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
          )}
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('azureSettings.testing')}
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4" />
              {t('azureSettings.testConnection')}
            </>
          )}
        </button>

        {lastSaved && (
          <span className="text-[10px] text-[var(--swiss-gray-400)] uppercase">
            {t('common.savedAutomatically')}
          </span>
        )}
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          ref={testResultRef}
          className={cn(
            "p-4 border-l-4 flex items-start gap-3",
            testResult.success
              ? "bg-green-50 border-green-500"
              : "bg-red-50 border-red-500"
          )}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={cn(
            "text-sm",
            testResult.success ? "text-green-700" : "text-red-700"
          )}>
            {testResult.message}
          </p>
        </div>
      )}
    </div>
  );
}
