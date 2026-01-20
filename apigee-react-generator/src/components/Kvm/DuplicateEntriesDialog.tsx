import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface DuplicateEntriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateNames: string[];
}

export const DuplicateEntriesDialog: React.FC<DuplicateEntriesDialogProps> = ({
  open,
  onOpenChange,
  duplicateNames,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--swiss-white)] dark:bg-[#1A1A1A] border-2 border-red-500 rounded-none max-w-md p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-[var(--swiss-black)] dark:text-[#E5E5E5]">
                {t('kvm.duplicateEntries.title', 'Duplicate Entry Names')}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--swiss-gray-500)] mt-1">
                {t('kvm.duplicateEntries.description', 'Cannot save KVM with duplicate entry names.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)] mb-3">
            {t('kvm.duplicateEntries.message', 'The following entry names are duplicated:')}
          </p>
          <div className="max-h-40 overflow-y-auto bg-[var(--swiss-gray-50)] dark:bg-[#252525] p-3 border border-[var(--swiss-gray-200)] dark:border-[#333]">
            <ul className="space-y-1">
              {duplicateNames.map((name, index) => (
                <li
                  key={index}
                  className="text-sm font-mono text-red-600 dark:text-red-400"
                >
                  • {name}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-[var(--swiss-gray-500)] mt-3">
            {t('kvm.duplicateEntries.hint', 'Please rename or remove duplicate entries before saving.')}
          </p>
        </div>

        <DialogFooter className="pt-4 border-t border-[var(--swiss-gray-200)] dark:border-[#333]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'w-full px-4 py-3',
              'text-[11px] font-bold uppercase tracking-wider',
              'bg-[var(--swiss-black)] dark:bg-[#E5E5E5]',
              'text-[var(--swiss-white)] dark:text-[#1A1A1A]',
              'hover:opacity-90',
              'transition-opacity'
            )}
          >
            {t('kvm.duplicateEntries.close', 'Close')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
