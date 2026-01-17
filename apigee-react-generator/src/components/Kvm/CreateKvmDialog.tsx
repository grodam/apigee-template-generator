import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle, Lock, Loader2 } from 'lucide-react';
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

interface CreateKvmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateKvmDialog: React.FC<CreateKvmDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const {
    connection,
    selectedEnvironment,
    selectedScope,
    selectedProxyName,
    envKvmsByEnvironment,
    proxyKvmsByProxy,
    setEnvKvmsForEnvironment,
    setProxyKvmsForProxy,
    addConsoleMessage,
  } = useKvmStore();

  const [name, setName] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setEncrypted(false);
      setError(null);
      setIsCreating(false);
    }
  }, [open]);

  // Get existing KVM names based on scope
  const existingNames = new Set(
    selectedScope === 'environment' && selectedEnvironment
      ? envKvmsByEnvironment[selectedEnvironment] || []
      : selectedProxyName
        ? proxyKvmsByProxy[selectedProxyName] || []
        : []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t('kvm.createKvm.errorNameRequired', 'KVM name is required'));
      return;
    }

    if (existingNames.has(trimmedName)) {
      setError(t('kvm.createKvm.errorNameExists', 'A KVM with this name already exists'));
      return;
    }

    // Validate name format
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedName)) {
      setError(
        t('kvm.createKvm.errorNameFormat', 'Name can only contain letters, numbers, dots, hyphens, and underscores')
      );
      return;
    }

    // Validate we have required context
    if (selectedScope === 'environment' && !selectedEnvironment) {
      setError(t('kvm.createKvm.errorNoEnvironment', 'Please select an environment first'));
      return;
    }

    if (selectedScope === 'proxy' && !selectedProxyName) {
      setError(t('kvm.createKvm.errorNoProxy', 'Please select an API proxy first'));
      return;
    }

    setIsCreating(true);

    try {
      const client = new ApigeeClient({
        organizationId: connection.organizationId,
        accessToken: connection.accessToken,
      });
      const service = new KvmService(client);

      if (selectedScope === 'environment' && selectedEnvironment) {
        await service.createEnvKvm(selectedEnvironment, { name: trimmedName, encrypted });

        // Refresh KVM list
        const kvms = await service.listEnvKvms(selectedEnvironment);
        setEnvKvmsForEnvironment(selectedEnvironment, kvms);

        addConsoleMessage({
          type: 'success',
          message: `Created environment KVM: ${trimmedName}${encrypted ? ' (encrypted)' : ''}`,
        });
      } else if (selectedScope === 'proxy' && selectedProxyName) {
        await service.createProxyKvm(selectedProxyName, { name: trimmedName, encrypted });

        // Refresh KVM list
        const kvms = await service.listProxyKvms(selectedProxyName);
        setProxyKvmsForProxy(selectedProxyName, kvms);

        addConsoleMessage({
          type: 'success',
          message: `Created proxy KVM: ${trimmedName}${encrypted ? ' (encrypted)' : ''}`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create KVM';
      setError(message);
      addConsoleMessage({ type: 'error', message });
    } finally {
      setIsCreating(false);
    }
  };

  const scopeLabel =
    selectedScope === 'environment'
      ? selectedEnvironment || 'environment'
      : selectedProxyName || 'proxy';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--swiss-white)] border-2 border-[var(--swiss-black)] rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-wider">
            {t('kvm.createKvm.title', 'Create New KVM')}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--swiss-gray-500)]">
            {t('kvm.createKvm.description', 'Create a new Key-Value Map in')} <strong>{scopeLabel}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)] mb-1">
              {t('kvm.createKvm.name', 'KVM Name')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="my-kvm-name"
              disabled={isCreating}
              className={cn(
                'w-full bg-transparent border-b-2 py-2 font-mono text-sm',
                'focus:outline-none transition-colors',
                'placeholder:text-[var(--swiss-gray-400)]',
                error
                  ? 'border-red-500'
                  : 'border-[var(--swiss-black)] focus:border-[var(--swiss-black)]',
                isCreating && 'opacity-50'
              )}
              autoFocus
            />
            <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
              {t('kvm.createKvm.nameHint', 'Letters, numbers, dots, hyphens, underscores only')}
            </p>
          </div>

          {/* Encrypted toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  encrypted ? 'bg-[var(--swiss-black)]' : 'bg-[var(--swiss-gray-300)]'
                )}
                onClick={() => !isCreating && setEncrypted(!encrypted)}
              >
                <div
                  className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-[var(--swiss-white)] rounded-full transition-transform shadow',
                    encrypted && 'translate-x-5'
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <Lock className={cn('h-4 w-4', encrypted ? 'text-[var(--swiss-black)]' : 'text-[var(--swiss-gray-400)]')} />
                <span className="text-[11px] font-medium">
                  {t('kvm.createKvm.encrypted', 'Encrypted KVM')}
                </span>
              </div>
            </label>
            <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1 ml-[52px]">
              {t(
                'kvm.createKvm.encryptedHint',
                'Encrypted KVMs store values securely. Values cannot be retrieved once stored.'
              )}
            </p>
          </div>

          {/* Actions */}
          <DialogFooter className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className={cn(
                'flex-1 px-4 py-2',
                'text-[10px] font-bold uppercase tracking-wider',
                'border-2 border-[var(--swiss-black)]',
                'bg-[var(--swiss-white)] text-[var(--swiss-black)]',
                'hover:bg-[var(--swiss-gray-100)] transition-colors',
                isCreating && 'opacity-50 cursor-not-allowed'
              )}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2',
                'text-[10px] font-bold uppercase tracking-wider',
                'bg-[var(--swiss-black)] text-[var(--swiss-white)]',
                'hover:bg-[var(--swiss-gray-800)] transition-colors',
                isCreating && 'opacity-75 cursor-not-allowed'
              )}
            >
              {isCreating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {t('kvm.createKvm.create', 'Create KVM')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
