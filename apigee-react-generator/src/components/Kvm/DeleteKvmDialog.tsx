import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useKvmStore } from '@/store/useKvmStore';
import { ApigeeClient, KvmService } from '@/services/apigee';

interface DeleteKvmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteKvmDialog: React.FC<DeleteKvmDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const {
    connection,
    currentKvm,
    selectedEnvironment,
    selectedScope,
    selectedProxyName,
    selectedKvmName,
    setEnvKvmsForEnvironment,
    setProxyKvmsForProxy,
    setCurrentKvm,
    setSelectedKvm,
    addConsoleMessage,
  } = useKvmStore();

  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Reset when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setConfirmText('');
      setIsDeleting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!selectedKvmName || !selectedEnvironment) return;

    setIsDeleting(true);

    try {
      const client = new ApigeeClient({
        organizationId: connection.organizationId,
        accessToken: connection.accessToken,
      });
      const service = new KvmService(client);

      if (selectedScope === 'environment') {
        await service.deleteEnvKvm(selectedEnvironment, selectedKvmName);

        // Refresh KVM list for this environment
        const kvms = await service.listEnvKvms(selectedEnvironment);
        setEnvKvmsForEnvironment(selectedEnvironment, kvms);

        addConsoleMessage({
          type: 'success',
          message: `Deleted KVM "${selectedKvmName}" from ${selectedEnvironment}`,
        });
      } else if (selectedProxyName) {
        await service.deleteProxyKvm(selectedProxyName, selectedKvmName);

        // Refresh KVM list for this proxy
        const kvms = await service.listProxyKvms(selectedProxyName);
        setProxyKvmsForProxy(selectedProxyName, kvms);

        addConsoleMessage({
          type: 'success',
          message: `Deleted KVM "${selectedKvmName}" from proxy ${selectedProxyName}`,
        });
      }

      // Clear selection
      setCurrentKvm(null);
      setSelectedKvm(null);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete KVM';
      addConsoleMessage({ type: 'error', message });
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmValid = confirmText === selectedKvmName;
  const entriesCount = currentKvm?.keyValueEntries?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--swiss-white)] border-2 border-red-500 rounded-none max-w-md p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-red-600">
                {t('kvm.deleteKvm.title', 'Delete KVM')}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--swiss-gray-500)] mt-0.5">
                {t('kvm.deleteKvm.warning', 'This action cannot be undone')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning message */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
            <p className="text-sm text-red-800 dark:text-red-300">
              {t('kvm.deleteKvm.message', 'You are about to permanently delete the KVM')}
              <strong className="font-mono ml-1">"{selectedKvmName}"</strong>
              {entriesCount > 0 && (
                <span className="block mt-1">
                  {t('kvm.deleteKvm.entriesWarning', 'This will also delete all {{count}} entries.', {
                    count: entriesCount,
                  })}
                </span>
              )}
            </p>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)]">
              {t('kvm.deleteKvm.confirmLabel', 'Type the KVM name to confirm')}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={selectedKvmName || ''}
              disabled={isDeleting}
              className={cn(
                'w-full bg-transparent border-b-2 py-3 font-mono text-sm',
                'focus:outline-none transition-colors',
                'placeholder:text-[var(--swiss-gray-300)]',
                isConfirmValid
                  ? 'border-green-500'
                  : 'border-[var(--swiss-gray-300)] focus:border-red-500',
                isDeleting && 'opacity-50'
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="flex gap-3 pt-6 mt-4 border-t border-[var(--swiss-gray-200)]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className={cn(
              'flex-1 px-4 py-3',
              'text-[11px] font-bold uppercase tracking-wider',
              'border-2 border-[var(--swiss-black)]',
              'bg-[var(--swiss-white)] text-[var(--swiss-black)]',
              'hover:bg-[var(--swiss-gray-100)] transition-colors',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || !isConfirmValid}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3',
              'text-[11px] font-bold uppercase tracking-wider',
              'transition-colors',
              isConfirmValid && !isDeleting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--swiss-gray-200)] text-[var(--swiss-gray-400)] cursor-not-allowed'
            )}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t('kvm.deleteKvm.confirm', 'Delete KVM')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
