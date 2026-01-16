import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, AlertTriangle, Cloud, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useProjectStore } from '../../store/useProjectStore';

export interface PushProgress {
  currentBatch: number;
  totalBatches: number;
  totalFiles: number;
  stage: 'connecting' | 'checking' | 'creating' | 'pushing' | 'done' | 'error';
  message?: string;
}

interface AzurePushModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPush: (repositoryName: string, onProgress: (progress: PushProgress) => void) => Promise<void>;
  isPushing: boolean;
}

export const AzurePushModal: React.FC<AzurePushModalProps> = ({
  isOpen,
  onClose,
  onPush,
  isPushing,
}) => {
  const { t } = useTranslation();
  const { azureDevOpsConfig, updateAzureDevOpsConfig, setSettingsModalOpen, setSettingsActiveTab } = useProjectStore();

  // Local state for repository name
  const [repositoryName, setRepositoryName] = useState(azureDevOpsConfig.repositoryName);

  // Progress state
  const [progress, setProgress] = useState<PushProgress | null>(null);

  // Sync local state with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setRepositoryName(azureDevOpsConfig.repositoryName);
      setProgress(null); // Reset progress when modal opens
    }
  }, [isOpen, azureDevOpsConfig.repositoryName]);

  const isPATConfigured = !!azureDevOpsConfig.personalAccessToken;
  const isConfigured = isPATConfigured && azureDevOpsConfig.organization && azureDevOpsConfig.project;
  const isReadyToPush = isConfigured && repositoryName;

  const handlePush = async () => {
    // Save repository name to store and pass it directly to onPush
    updateAzureDevOpsConfig({ repositoryName });
    await onPush(repositoryName, setProgress);
  };

  // Calculate progress percentage
  const progressPercent = progress
    ? progress.stage === 'done'
      ? 100
      : progress.stage === 'pushing' && progress.totalBatches > 0
        ? Math.round((progress.currentBatch / progress.totalBatches) * 100)
        : progress.stage === 'connecting' ? 10
        : progress.stage === 'checking' ? 25
        : progress.stage === 'creating' ? 40
        : 0
    : 0;

  // Get stage label
  const getStageLabel = () => {
    if (!progress) return '';
    switch (progress.stage) {
      case 'connecting': return t('azurePushModal.progress.connecting', 'Connecting to Azure DevOps...');
      case 'checking': return t('azurePushModal.progress.checking', 'Checking repository...');
      case 'creating': return t('azurePushModal.progress.creating', 'Creating repository...');
      case 'pushing': return t('azurePushModal.progress.pushing', 'Pushing files ({{current}}/{{total}})...', { current: progress.currentBatch, total: progress.totalBatches });
      case 'done': return t('azurePushModal.progress.done', 'Push completed!');
      case 'error': return progress.message || t('azurePushModal.progress.error', 'Error occurred');
      default: return '';
    }
  };

  const handleOpenSettings = () => {
    onClose();
    setSettingsActiveTab('azure-devops');
    setSettingsModalOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 bg-[var(--swiss-white)] border-2 border-[var(--swiss-black)] rounded-none overflow-hidden shadow-none">
        {/* Swiss Header */}
        <DialogHeader className="px-6 py-5 border-b-2 border-[var(--swiss-black)]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--swiss-black)] text-[var(--swiss-white)] flex items-center justify-center">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wide text-[var(--swiss-black)]">
                {t('azurePushModal.title', 'Push to Azure DevOps')}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--swiss-gray-500)] font-mono mt-1">
                {t('azurePushModal.description', 'Create or update repository')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Configuration Warning - Monochrome style */}
          {!isConfigured && (
            <div className="border-l-4 border-amber-500 bg-[var(--bg-primary)] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1">
                    Configuration Required
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t('step5.notConfiguredAlert', 'Azure DevOps settings are not configured. Please configure your organization, project, and PAT in the settings.')}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 underline transition-colors"
                  >
                    {t('step5.openSettings', 'Open Settings')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Repository Name */}
          <div>
            <label
              htmlFor="modal-ado-repository"
              className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase tracking-widest block mb-2"
            >
              {t('step5.repository.required', 'Repository Name *')}
            </label>
            <input
              id="modal-ado-repository"
              type="text"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              placeholder="my-api-proxy"
              autoFocus
              className={cn(
                "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none transition-colors",
                repositoryName
                  ? "border-[var(--swiss-black)]"
                  : "border-[var(--swiss-gray-300)] focus:border-[var(--swiss-black)]"
              )}
            />
            <p className="text-[10px] text-[var(--swiss-gray-400)] mt-2">
              {t('azurePushModal.repoHint', 'A new repository will be created if it does not exist.')}
            </p>
          </div>

          {/* Configuration Summary */}
          {isConfigured && !isPushing && (
            <div className="border-l-4 border-[var(--swiss-black)] pl-4 py-2 bg-[var(--swiss-gray-50)]">
              <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase tracking-widest mb-2">
                Target
              </p>
              <p className="text-xs font-mono text-[var(--swiss-gray-700)]">
                {azureDevOpsConfig.organization}/{azureDevOpsConfig.project}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {isPushing && progress && (
            <div className="space-y-3">
              {/* Progress info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {progress.stage === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : progress.stage === 'error' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-[var(--swiss-black)] border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="text-xs text-[var(--swiss-gray-600)]">
                    {getStageLabel()}
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--swiss-gray-500)]">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-[var(--swiss-gray-200)] overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 ease-out",
                    progress.stage === 'done' ? "bg-green-500" :
                    progress.stage === 'error' ? "bg-red-500" :
                    "bg-[var(--swiss-black)]"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Files info */}
              {progress.totalFiles > 0 && (
                <p className="text-[10px] text-[var(--swiss-gray-400)] text-center">
                  {t('azurePushModal.progress.filesInfo', '{{files}} files total', { files: progress.totalFiles })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Swiss Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-[var(--swiss-black)] bg-[var(--swiss-gray-50)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPushing}
            className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--swiss-gray-600)] hover:text-[var(--swiss-black)] transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handlePush}
            disabled={isPushing || !isReadyToPush}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2",
              isReadyToPush && !isPushing
                ? "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
                : "bg-[var(--swiss-gray-300)] text-[var(--swiss-gray-500)] cursor-not-allowed"
            )}
          >
            <Upload className={cn("h-4 w-4", isPushing && "animate-pulse")} />
            {isPushing
              ? t('step5.push.pushing', 'Pushing...')
              : t('step5.push.button', 'Push to Azure DevOps')
            }
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
