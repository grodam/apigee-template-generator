import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onOpenChange,
  onDiscard,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--swiss-white)] dark:bg-[#1A1A1A] border-2 border-yellow-500 rounded-none max-w-md p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-[var(--swiss-black)] dark:text-[#E5E5E5]">
                {t('kvm.unsavedChanges.title', 'Unsaved Changes')}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--swiss-gray-500)] mt-1">
                {t('kvm.unsavedChanges.description', 'You have unsaved changes that will be lost.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 text-sm text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]">
          {t('kvm.unsavedChanges.message', 'Do you want to discard your changes and continue?')}
        </div>

        <DialogFooter className="flex gap-3 pt-4 border-t border-[var(--swiss-gray-200)] dark:border-[#333]">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'flex-1 px-4 py-3',
              'text-[11px] font-bold uppercase tracking-wider',
              'border-2 border-[var(--swiss-black)] dark:border-[#E5E5E5]',
              'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
              'text-[var(--swiss-black)] dark:text-[#E5E5E5]',
              'hover:bg-[var(--swiss-gray-100)] dark:hover:bg-[#333]',
              'transition-colors'
            )}
          >
            {t('kvm.unsavedChanges.cancel', 'Go Back')}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className={cn(
              'flex-1 px-4 py-3',
              'text-[11px] font-bold uppercase tracking-wider',
              'bg-yellow-500 text-white',
              'hover:bg-yellow-600',
              'transition-colors'
            )}
          >
            {t('kvm.unsavedChanges.discard', 'Discard Changes')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
