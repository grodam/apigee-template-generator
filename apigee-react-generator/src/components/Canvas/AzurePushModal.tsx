import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProjectStore } from '../../store/useProjectStore';

interface AzurePushModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPush: () => Promise<void>;
  isPushing: boolean;
}

export const AzurePushModal: React.FC<AzurePushModalProps> = ({
  isOpen,
  onClose,
  onPush,
  isPushing,
}) => {
  const { t } = useTranslation();
  const { azureDevOpsConfig, updateAzureDevOpsConfig, setSettingsModalOpen } = useProjectStore();

  // Local state for repository name
  const [repositoryName, setRepositoryName] = useState(azureDevOpsConfig.repositoryName);

  // Sync local state with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setRepositoryName(azureDevOpsConfig.repositoryName);
    }
  }, [isOpen, azureDevOpsConfig.repositoryName]);

  const isPATConfigured = !!azureDevOpsConfig.personalAccessToken;
  const isConfigured = isPATConfigured && azureDevOpsConfig.organization && azureDevOpsConfig.project;
  const isReadyToPush = isConfigured && repositoryName;

  const handlePush = async () => {
    // Save repository name to store before pushing
    updateAzureDevOpsConfig({ repositoryName });
    await onPush();
  };

  const handleOpenSettings = () => {
    onClose();
    setSettingsModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-primary)] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-[var(--border-default)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('azurePushModal.title', 'Push to Azure DevOps')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Configuration Warning */}
          {!isConfigured && (
            <Alert className="soft-alert warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t('step5.notConfiguredAlert', 'Azure DevOps not configured.')}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleOpenSettings}
                  className="ml-2 text-[var(--accent-500)] hover:text-[var(--accent-600)] p-0 h-auto"
                >
                  {t('step5.openSettings', 'Configure in Settings')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Repository Name */}
          <div className="space-y-2">
            <Label htmlFor="modal-ado-repository" className="soft-label">
              {t('step5.repository.required', 'Repository Name')} *
            </Label>
            <Input
              id="modal-ado-repository"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              placeholder="my-api-proxy"
              className="soft-input font-mono text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border-default)]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPushing}
            className="soft-button secondary"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handlePush}
            disabled={isPushing || !isReadyToPush}
            className="soft-button flex items-center gap-2"
          >
            <Upload className={`h-4 w-4 ${isPushing ? 'animate-pulse' : ''}`} />
            {isPushing ? t('step5.push.pushing', 'Pushing...') : t('step5.push.button', 'Push')}
          </Button>
        </div>
      </div>
    </div>
  );
};
