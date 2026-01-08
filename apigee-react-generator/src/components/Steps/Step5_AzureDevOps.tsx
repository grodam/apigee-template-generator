import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, HelpCircle, GitBranch, Upload, CheckCircle2, AlertCircle, ExternalLink, Settings } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { AzureDevOpsService } from '../../services/azure-devops/AzureDevOpsService';

// Helper component for labels with tooltip
const LabelWithTooltip: React.FC<{ htmlFor: string; label: string; tooltip: string }> = ({ htmlFor, label, tooltip }) => (
  <div className="inline-flex items-baseline gap-1.5">
    <Label htmlFor={htmlFor} className="soft-label">{label}</Label>
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--text-tertiary)] cursor-help hover:text-[var(--lavender-500)] transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="soft-tooltip">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

export const Step5_AzureDevOps: React.FC = () => {
  const { t } = useTranslation();
  const { azureDevOpsConfig, updateAzureDevOpsConfig, apiConfig, generatedProject, setSettingsModalOpen } = useProjectStore();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pushMessage, setPushMessage] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState<string>('');
  const [pushProgress, setPushProgress] = useState<{ currentBatch: number; totalBatches: number; totalFiles: number } | null>(null);

  // Check if settings are configured
  const isSettingsConfigured = azureDevOpsConfig.organization && azureDevOpsConfig.project && azureDevOpsConfig.personalAccessToken;

  const handleTestConnection = async () => {
    if (!azureDevOpsConfig.organization || !azureDevOpsConfig.personalAccessToken) {
      setConnectionStatus('error');
      setConnectionMessage('Please provide organization and Personal Access Token');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const service = new AzureDevOpsService(
        azureDevOpsConfig.organization,
        azureDevOpsConfig.personalAccessToken
      );

      const isConnected = await service.testConnection();

      if (isConnected) {
        setConnectionStatus('success');
        setConnectionMessage('Successfully connected to Azure DevOps!');
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Failed to connect. Please check your organization name and PAT token.');
      }
    } catch (error: any) {
      setConnectionStatus('error');

      let errorMessage = error.message || 'Failed to connect to Azure DevOps';

      // Add helpful context based on error type
      if (errorMessage.includes('CORS') || errorMessage.includes('fetch') || errorMessage.includes('Network')) {
        errorMessage = 'Network error: Unable to connect. Please ensure the proxy server is running on port 3001.';
      } else if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
        errorMessage = 'Authentication failed. Please verify your Personal Access Token is valid and not expired.';
      } else if (errorMessage.includes('404') || errorMessage.includes('Organization not found')) {
        errorMessage = 'Organization not found. Please check the organization name (e.g., "mycompany" for dev.azure.com/mycompany).';
      }

      setConnectionMessage(errorMessage);
      console.error('Connection test error:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePushToAzureDevOps = async () => {
    if (!generatedProject) {
      setPushStatus('error');
      setPushMessage('No project generated yet. Please generate the project first.');
      return;
    }

    if (!azureDevOpsConfig.organization || !azureDevOpsConfig.project ||
        !azureDevOpsConfig.repositoryName || !azureDevOpsConfig.personalAccessToken) {
      setPushStatus('error');
      setPushMessage('Please fill in all required Azure DevOps configuration fields');
      return;
    }

    setIsPushing(true);
    setPushStatus('idle');
    setPushMessage('');
    setRepositoryUrl('');
    setPushProgress(null);

    try {
      const service = new AzureDevOpsService(
        azureDevOpsConfig.organization,
        azureDevOpsConfig.personalAccessToken
      );

      // Progress callback
      const onProgress = (currentBatch: number, totalBatches: number, totalFiles: number) => {
        setPushProgress({ currentBatch, totalBatches, totalFiles });
      };

      const result = await service.pushProject(azureDevOpsConfig, generatedProject, onProgress);

      if (result.success) {
        setPushStatus('success');
        setPushMessage(result.message);
        if (result.repositoryUrl) {
          setRepositoryUrl(result.repositoryUrl);
        }
      } else {
        setPushStatus('error');
        setPushMessage(result.message);
      }
    } catch (error: any) {
      setPushStatus('error');
      // Enhanced error handling with detailed messages
      let errorMessage = 'Failed to push to Azure DevOps';

      if (error.message) {
        errorMessage = error.message;
      }

      // Add specific error guidance
      if (error.message?.includes('TF401019')) {
        errorMessage += ' - The repository does not exist or you do not have permissions.';
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please check your Personal Access Token and ensure it has "Code (Read, Write, & Manage)" permissions.';
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        errorMessage = 'Access denied. Your PAT token does not have sufficient permissions for this operation.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Project or repository not found. Please verify the organization and project names are correct.';
      } else if (error.message?.includes('CORS') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please ensure the proxy server is running on port 3001.';
      }

      setPushMessage(errorMessage);
      console.error('Push error details:', error);
    } finally {
      setIsPushing(false);
      setPushProgress(null);
    }
  };

  // Auto-generate repository name based on proxy name
  React.useEffect(() => {
    if (apiConfig.proxyName && !azureDevOpsConfig.repositoryName) {
      updateAzureDevOpsConfig({
        repositoryName: apiConfig.proxyName
      });
    }
  }, [apiConfig.proxyName]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('step5.title')}</h1>
        <p className="text-[var(--text-secondary)] text-lg">{t('step5.subtitle')}</p>
      </div>

      <div className="soft-card">
        <div className="space-y-8">
          {/* Enable Integration */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-azure-devops"
              checked={azureDevOpsConfig.enabled}
              onCheckedChange={(checked) => updateAzureDevOpsConfig({ enabled: !!checked })}
              className="border-[var(--border-medium)] data-[state=checked]:bg-[var(--lavender-500)] data-[state=checked]:border-[var(--lavender-500)]"
            />
            <Label
              htmlFor="enable-azure-devops"
              className="text-base font-medium cursor-pointer text-[var(--text-primary)]"
            >
              {t('step5.enableIntegration')}
            </Label>
          </div>

          {azureDevOpsConfig.enabled && (
            <>
              {/* Settings Summary */}
              <div className="space-y-4">
                <div className="section-header">
                  <div className="icon">
                    <Settings className="h-5 w-5" />
                  </div>
                  <h3>{t('step5.sections.config')}</h3>
                </div>

                {isSettingsConfigured ? (
                  <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--text-tertiary)]">{t('step5.config.organization')}</span>
                        <span className="ml-2 text-[var(--text-primary)] font-mono">{azureDevOpsConfig.organization}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">{t('step5.config.project')}</span>
                        <span className="ml-2 text-[var(--text-primary)] font-mono">{azureDevOpsConfig.project}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">{t('step5.config.branch')}</span>
                        <span className="ml-2 text-[var(--text-primary)] font-mono">{azureDevOpsConfig.defaultBranch}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]">{t('step5.config.pat')}</span>
                        <span className="ml-2 text-[var(--text-primary)] font-mono">****{t('step5.config.configured')}****</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSettingsModalOpen(true)}
                      className="soft-button secondary mt-2"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t('step5.modifySettings')}
                    </Button>
                  </div>
                ) : (
                  <Alert className="soft-alert warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {t('step5.notConfiguredAlert')}
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setSettingsModalOpen(true)}
                        className="ml-2 text-[var(--lavender-500)] hover:text-[var(--lavender-600)] p-0 h-auto"
                      >
                        {t('step5.openSettings')}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Repository Name - Project Specific */}
              <div className="space-y-4">
                <div className="section-header">
                  <div className="icon">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <h3>{t('step5.sections.repository')}</h3>
                </div>

                <div className="space-y-2">
                  <LabelWithTooltip
                    htmlFor="ado-repository"
                    label={t('step5.repository.required')}
                    tooltip={t('step5.repository.tooltip')}
                  />
                  <Input
                    id="ado-repository"
                    value={azureDevOpsConfig.repositoryName}
                    onChange={(e) => updateAzureDevOpsConfig({ repositoryName: e.target.value })}
                    placeholder={apiConfig.proxyName || 'my-api-proxy'}
                    className="soft-input font-mono text-sm"
                  />
                </div>

                {/* Test Connection Button */}
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !isSettingsConfigured}
                    className="soft-button secondary"
                  >
                    {isTestingConnection ? t('common.testing') : t('common.testConnection')}
                  </Button>

                  {connectionStatus === 'success' && (
                    <div className="flex items-center gap-2 text-[var(--mint-base)]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">{connectionMessage}</span>
                    </div>
                  )}

                  {connectionStatus === 'error' && (
                    <div className="flex items-center gap-2 text-[var(--error-base)]">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{connectionMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="section-header">
                  <h3>{t('step5.sections.options')}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="create-repository"
                      checked={azureDevOpsConfig.createRepository}
                      onCheckedChange={(checked) => updateAzureDevOpsConfig({ createRepository: !!checked })}
                      className="border-[var(--border-medium)] data-[state=checked]:bg-[var(--lavender-500)] data-[state=checked]:border-[var(--lavender-500)]"
                    />
                    <Label htmlFor="create-repository" className="text-sm font-normal cursor-pointer text-[var(--text-primary)]">
                      {t('step5.options.createRepo')}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="push-after-generation"
                      checked={azureDevOpsConfig.pushAfterGeneration}
                      onCheckedChange={(checked) => updateAzureDevOpsConfig({ pushAfterGeneration: !!checked })}
                      className="border-[var(--border-medium)] data-[state=checked]:bg-[var(--lavender-500)] data-[state=checked]:border-[var(--lavender-500)]"
                    />
                    <Label htmlFor="push-after-generation" className="text-sm font-normal cursor-pointer text-[var(--text-primary)]">
                      {t('step5.options.autoPush')}
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="create-pipelines"
                      checked={azureDevOpsConfig.createPipelines}
                      onCheckedChange={(checked) => updateAzureDevOpsConfig({ createPipelines: !!checked })}
                      className="border-[var(--border-medium)] data-[state=checked]:bg-[var(--lavender-500)] data-[state=checked]:border-[var(--lavender-500)]"
                    />
                    <Label htmlFor="create-pipelines" className="text-sm font-normal cursor-pointer text-[var(--text-secondary)]">
                      {t('step5.options.createPipelines')}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Manual Push Section */}
              {generatedProject && (
                <div className="space-y-4">
                  <Alert className="soft-alert info">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm font-medium">
                      {t('step5.projectReady')}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {/* Progress indicator */}
                    {isPushing && pushProgress && (
                      <Alert className="soft-alert info">
                        <Upload className="h-4 w-4 animate-pulse" />
                        <AlertDescription className="text-sm">
                          Pushing batch <strong>{pushProgress.currentBatch}</strong> of <strong>{pushProgress.totalBatches}</strong>...
                          ({pushProgress.totalFiles} files total)
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        onClick={handlePushToAzureDevOps}
                        disabled={isPushing || !isSettingsConfigured || !azureDevOpsConfig.repositoryName}
                        className="soft-button flex items-center gap-2"
                      >
                        <Upload className={`h-4 w-4 ${isPushing ? 'animate-pulse' : ''}`} />
                        {isPushing ? t('step5.push.pushing') : t('step5.push.button')}
                      </Button>

                      {pushStatus === 'success' && (
                        <div className="flex items-center gap-2 text-[var(--mint-base)]">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">{pushMessage}</span>
                        </div>
                      )}

                      {pushStatus === 'error' && (
                        <Alert variant="destructive" className="soft-alert error mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <strong>Push Failed:</strong> {pushMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {repositoryUrl && pushStatus === 'success' && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(repositoryUrl, '_blank')}
                          className="soft-button secondary flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t('step5.push.openRepo')}
                        </Button>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {repositoryUrl}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!generatedProject && (
                <Alert className="soft-alert info">
                  <GitBranch className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {t('step5.generateFirst')}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {!azureDevOpsConfig.enabled && (
            <Alert className="soft-alert info">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t('step5.disabledMessage')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};
