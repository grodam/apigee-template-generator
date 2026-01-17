import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle } from 'lucide-react';
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setValue('');
      setError(null);
    }
  }, [open]);

  const existingNames = new Set(currentKvm?.keyValueEntries?.map((e) => e.name) || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t('kvm.addEntry.errorNameRequired', 'Entry name is required'));
      return;
    }

    if (existingNames.has(trimmedName)) {
      setError(t('kvm.addEntry.errorNameExists', 'An entry with this name already exists'));
      return;
    }

    // Validate name format (alphanumeric, dots, hyphens, underscores)
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedName)) {
      setError(
        t('kvm.addEntry.errorNameFormat', 'Name can only contain letters, numbers, dots, hyphens, and underscores')
      );
      return;
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
              }}
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
            <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
              {t('kvm.addEntry.nameHint', 'Letters, numbers, dots, hyphens, underscores only')}
            </p>
          </div>

          {/* Value input */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[var(--swiss-gray-500)] mb-1">
              {t('kvm.addEntry.value', 'Entry Value')}
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value..."
              rows={3}
              className={cn(
                'w-full bg-transparent border-2 border-[var(--swiss-gray-300)] p-2 font-mono text-sm',
                'focus:outline-none focus:border-[var(--swiss-black)] transition-colors',
                'placeholder:text-[var(--swiss-gray-400)]',
                'resize-none'
              )}
            />
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
