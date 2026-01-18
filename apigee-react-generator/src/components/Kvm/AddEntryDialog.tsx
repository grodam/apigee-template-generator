import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle, AlertTriangle } from 'lucide-react';
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
import {
  validateEntryName,
  validateEntryValue,
  ENTRY_NAME_MAX_LENGTH,
  ENTRY_VALUE_MAX_LENGTH,
  formatBytes,
} from '@/utils/kvmValidation';

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddEntryDialog: React.FC<AddEntryDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { currentKvm, addEntry, addConsoleMessage } = useKvmStore();

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setValue('');
      setError(null);
      setWarning(null);
    }
  }, [open]);

  const existingNames = currentKvm?.keyValueEntries?.map((e) => e.name) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    // Validate entry name
    const nameValidation = validateEntryName(trimmedName, { existingNames });
    if (!nameValidation.valid) {
      setError(t(nameValidation.errorKey || 'kvm.validation.error', nameValidation.error || 'Validation error'));
      return;
    }

    // Validate entry value
    const valueValidation = validateEntryValue(value);
    if (!valueValidation.valid) {
      setError(t(valueValidation.errorKey || 'kvm.validation.error', valueValidation.error || 'Validation error'));
      return;
    }

    // Show warning if any
    if (valueValidation.warning) {
      setWarning(t(valueValidation.warningKey || 'kvm.validation.warning', valueValidation.warning));
    }

    // Add entry
    addEntry(trimmedName, value);
    addConsoleMessage({
      type: 'success',
      message: `Added entry: ${trimmedName}`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--swiss-white)] border-2 border-[var(--swiss-black)] rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-wider">
            {t('kvm.addEntry.title', 'Add KVM Entry')}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--swiss-gray-500)]">
            {t('kvm.addEntry.description', 'Add a new key-value entry to this KVM')}
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

          {/* Warning message */}
          {warning && !error && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 text-xs dark:bg-yellow-900/20 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {warning}
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)] mb-1">
              {t('kvm.addEntry.name', 'Entry Name')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
                setWarning(null);
              }}
              maxLength={ENTRY_NAME_MAX_LENGTH}
              placeholder="my-entry-key"
              className={cn(
                'w-full bg-transparent border-b-2 py-2 font-mono text-sm',
                'focus:outline-none transition-colors',
                'placeholder:text-[var(--swiss-gray-400)]',
                error
                  ? 'border-red-500'
                  : 'border-[var(--swiss-black)] focus:border-[var(--swiss-black)]'
              )}
              autoFocus
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-[var(--swiss-gray-400)]">
                {t('kvm.addEntry.nameHint', 'Letters, numbers, dots, hyphens, underscores only')}
              </p>
              <span className={cn(
                'text-[9px] font-mono',
                name.length > ENTRY_NAME_MAX_LENGTH * 0.9 ? 'text-yellow-500' : 'text-[var(--swiss-gray-400)]'
              )}>
                {name.length}/{ENTRY_NAME_MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Value input */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)] mb-1">
              {t('kvm.addEntry.value', 'Entry Value')}
            </label>
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
                setWarning(null);
              }}
              placeholder="Enter value..."
              rows={3}
              className={cn(
                'w-full bg-transparent border-2 p-2 font-mono text-sm',
                'focus:outline-none transition-colors',
                'placeholder:text-[var(--swiss-gray-400)]',
                'resize-none',
                value.length > ENTRY_VALUE_MAX_LENGTH
                  ? 'border-red-500'
                  : value.length > 100000
                    ? 'border-yellow-500'
                    : 'border-[var(--swiss-gray-300)] focus:border-[var(--swiss-black)]'
              )}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-[var(--swiss-gray-400)]">
                {t('kvm.addEntry.valueHint', 'Max size: 512KB')}
              </p>
              <span className={cn(
                'text-[9px] font-mono',
                value.length > ENTRY_VALUE_MAX_LENGTH
                  ? 'text-red-500'
                  : value.length > 100000
                    ? 'text-yellow-500'
                    : 'text-[var(--swiss-gray-400)]'
              )}>
                {formatBytes(value.length)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                'flex-1 px-4 py-2',
                'text-[10px] font-bold uppercase tracking-wider',
                'border-2 border-[var(--swiss-black)]',
                'bg-[var(--swiss-white)] text-[var(--swiss-black)]',
                'hover:bg-[var(--swiss-gray-100)] transition-colors'
              )}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2',
                'text-[10px] font-bold uppercase tracking-wider',
                'bg-[var(--swiss-black)] text-[var(--swiss-white)]',
                'hover:bg-[var(--swiss-gray-800)] transition-colors'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('kvm.addEntry.add', 'Add Entry')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
