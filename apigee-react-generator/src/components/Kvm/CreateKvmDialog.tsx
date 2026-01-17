import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle, Lock, Loader2, Check, Server } from 'lucide-react';
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
    environments,
    selectedScope,
    selectedProxyName,
    envKvmsByEnvironment,
    setEnvKvmsForEnvironment,
    setProxyKvmsForProxy,
    addConsoleMessage,
  } = useKvmStore();

  const [name, setName] = useState('');
  const [selectedEnvs, setSelectedEnvs] = useState<Set<string>>(new Set());
  const [encrypted, setEncrypted] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setSelectedEnvs(new Set());
      setEncrypted(true);
      setError(null);
      setIsCreating(false);
    }
  }, [open]);

  // Toggle environment selection
  const toggleEnvSelection = (env: string) => {
    setSelectedEnvs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(env)) {
        newSet.delete(env);
      } else {
        newSet.add(env);
      }
      return newSet;
    });
    setError(null);
  };

  // Check if KVM name already exists in any selected environment
  const getExistingEnvsForName = (kvmName: string): string[] => {
    if (!kvmName.trim()) return [];
    return Array.from(selectedEnvs).filter((env) => {
      const kvms = envKvmsByEnvironment[env] || [];
      return kvms.includes(kvmName.trim());
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t('kvm.createKvm.errorNameRequired', 'KVM name is required'));
      return;
    }

    // Validate name format
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedName)) {
      setError(
        t('kvm.createKvm.errorNameFormat', 'Name can only contain letters, numbers, dots, hyphens, and underscores')
      );
      return;
    }

    // Validate at least one environment selected (for environment scope)
    if (selectedScope === 'environment' && selectedEnvs.size === 0) {
      setError(t('kvm.createKvm.errorNoEnvironment', 'Please select at least one environment'));
      return;
    }

    // Check for existing KVMs in selected environments
    const existingEnvs = getExistingEnvsForName(trimmedName);
    if (existingEnvs.length > 0) {
      setError(
        t('kvm.createKvm.errorNameExistsIn', 'A KVM with this name already exists in: {{envs}}', {
          envs: existingEnvs.join(', '),
        })
      );
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

      if (selectedScope === 'environment') {
        // Create KVM in all selected environments
        const envsArray = Array.from(selectedEnvs);
        let successCount = 0;
        const errors: string[] = [];

        for (const env of envsArray) {
          try {
            await service.createEnvKvm(env, { name: trimmedName, encrypted });

            // Refresh KVM list for this environment
            const kvms = await service.listEnvKvms(env);
            setEnvKvmsForEnvironment(env, kvms);
            successCount++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(`${env}: ${msg}`);
          }
        }

        if (successCount > 0) {
          addConsoleMessage({
            type: 'success',
            message: `Created KVM "${trimmedName}"${encrypted ? ' (encrypted)' : ''} in ${successCount} environment(s)`,
          });
        }

        if (errors.length > 0) {
          addConsoleMessage({
            type: 'error',
            message: `Failed in some environments: ${errors.join('; ')}`,
          });
        }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--swiss-white)] border-2 border-[var(--swiss-black)] rounded-none max-w-md p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-sm font-black uppercase tracking-wider">
            {t('kvm.createKvm.title', 'Create New KVM')}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--swiss-gray-500)] mt-1">
            {t('kvm.createKvm.descriptionNew', 'Select environments and configure your new KVM')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Name input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)]">
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
                'w-full bg-transparent border-b-2 py-3 font-mono text-sm',
                'focus:outline-none transition-colors',
                'placeholder:text-[var(--swiss-gray-400)]',
                error
                  ? 'border-red-500'
                  : 'border-[var(--swiss-black)] focus:border-[var(--swiss-black)]',
                isCreating && 'opacity-50'
              )}
              autoFocus
            />
            <p className="text-[11px] text-[var(--swiss-gray-400)]">
              {t('kvm.createKvm.nameHint', 'Letters, numbers, dots, hyphens, underscores only')}
            </p>
          </div>

          {/* Environment multi-select */}
          {selectedScope === 'environment' && environments.length > 0 && (
            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)]">
                {t('kvm.createKvm.environments', 'Environments')}
                <span className="text-red-500 ml-0.5">*</span>
                <span className="ml-2 font-normal normal-case text-[var(--swiss-gray-400)]">
                  ({selectedEnvs.size} selected)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {environments.map((env) => {
                  const isSelected = selectedEnvs.has(env);
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => !isCreating && toggleEnvSelection(env)}
                      disabled={isCreating}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 text-[12px] font-medium',
                        'border-2 transition-all duration-150',
                        isSelected
                          ? 'bg-[var(--swiss-black)] text-[var(--swiss-white)] border-[var(--swiss-black)]'
                          : 'bg-[var(--swiss-white)] text-[var(--swiss-gray-600)] border-[var(--swiss-gray-300)] hover:border-[var(--swiss-black)]',
                        isCreating && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Server className="h-3.5 w-3.5" />
                      )}
                      {env}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Encrypted toggle */}
          <div className="py-2">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  encrypted ? 'bg-[var(--swiss-black)]' : 'bg-[var(--swiss-gray-300)]'
                )}
                onClick={() => !isCreating && setEncrypted(!encrypted)}
              >
                <div
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--swiss-white)] rounded-full transition-transform shadow',
                    encrypted && 'translate-x-6'
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <Lock className={cn('h-4 w-4', encrypted ? 'text-[var(--swiss-black)]' : 'text-[var(--swiss-gray-400)]')} />
                <span className="text-[12px] font-medium">
                  {t('kvm.createKvm.encrypted', 'Encrypted KVM')}
                </span>
              </div>
            </label>
            <p className="text-[11px] text-[var(--swiss-gray-400)] mt-2 ml-16">
              {t(
                'kvm.createKvm.encryptedHint',
                'Values are stored securely and cannot be retrieved once saved.'
              )}
            </p>
          </div>

          {/* Actions */}
          <DialogFooter className="flex gap-3 pt-6 mt-2 border-t border-[var(--swiss-gray-200)]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className={cn(
                'flex-1 px-4 py-3',
                'text-[11px] font-bold uppercase tracking-wider',
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
              disabled={isCreating || (selectedScope === 'environment' && selectedEnvs.size === 0)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3',
                'text-[11px] font-bold uppercase tracking-wider',
                'bg-[var(--swiss-black)] text-[var(--swiss-white)]',
                'hover:bg-[var(--swiss-gray-800)] transition-colors',
                (isCreating || (selectedScope === 'environment' && selectedEnvs.size === 0)) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {selectedEnvs.size > 1
                ? t('kvm.createKvm.createMultiple', 'Create in {{count}} Envs', { count: selectedEnvs.size })
                : t('kvm.createKvm.create', 'Create KVM')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
