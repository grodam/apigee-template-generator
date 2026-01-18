import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import { ENTRY_VALUE_MAX_LENGTH, formatBytes } from '@/utils/kvmValidation';

interface KvmTableViewProps {
  className?: string;
}

export const KvmTableView: React.FC<KvmTableViewProps> = ({ className }) => {
  const { t } = useTranslation();
  const { currentKvm, originalKvm, updateEntry, toggleEntryForDeletion, entriesMarkedForDeletion } = useKvmStore();

  if (!currentKvm) {
    return (
      <div className={className}>
        <div className="h-full flex items-center justify-center text-[var(--swiss-gray-400)]">
          <p className="text-sm">{t('kvm.viewer.selectKvm', 'Select a KVM to view its content')}</p>
        </div>
      </div>
    );
  }

  const entries = currentKvm.keyValueEntries || [];
  const originalEntries = originalKvm?.keyValueEntries || [];
  const originalMap = new Map(originalEntries.map((e) => [e.name, e.value]));

  const isModified = (name: string, value: string): boolean => {
    const original = originalMap.get(name);
    if (original === undefined) return true; // New entry
    return original !== value; // Value changed
  };

  const isNewEntry = (name: string): boolean => {
    return !originalMap.has(name);
  };

  const isMarkedForDeletion = (name: string): boolean => {
    return entriesMarkedForDeletion.has(name);
  };

  if (entries.length === 0) {
    return (
      <div className={className}>
        <div className="h-full flex flex-col items-center justify-center text-[var(--swiss-gray-400)] gap-2">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{t('kvm.viewer.emptyKvm', 'This KVM has no entries')}</p>
          <p className="text-xs">{t('kvm.viewer.addEntryHint', 'Click "Add Entry" to create one')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('overflow-auto p-5', className)}>
      <div className="space-y-3">
        {entries.map((entry) => {
          const modified = isModified(entry.name, entry.value);
          const isNew = isNewEntry(entry.name);
          const markedForDeletion = isMarkedForDeletion(entry.name);

          return (
            <div
              key={entry.name}
              className={cn(
                'flex items-center gap-4 p-4 ',
                'border-2 border-[var(--swiss-gray-200)] dark:border-[#333]',
                'bg-[var(--swiss-gray-50)] dark:bg-[#252525]',
                'hover:border-[var(--swiss-gray-300)] dark:hover:border-[#444]',
                'hover:shadow-sm',
                'transition-all duration-150',
                // Priority: deletion > new > modified
                markedForDeletion
                  ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20 opacity-60'
                  : isNew
                    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                    : modified
                      ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                      : ''
              )}
            >
              {/* Key */}
              <div className="w-1/3 flex items-center gap-2">
                <span className={cn(
                  "font-mono text-sm font-medium",
                  markedForDeletion
                    ? "line-through text-red-500 dark:text-red-400"
                    : "text-[var(--swiss-black)] dark:text-[#E5E5E5]"
                )}>
                  {entry.name}
                </span>
                {markedForDeletion && (
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-red-500 text-white rounded-full">
                    {t('kvm.table.toDelete', 'To Delete')}
                  </span>
                )}
                {!markedForDeletion && isNew && (
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-green-500 text-white rounded-full">
                    {t('kvm.table.new', 'New')}
                  </span>
                )}
                {!markedForDeletion && modified && !isNew && (
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-yellow-500 text-white rounded-full">
                    {t('kvm.table.modified', 'Modified')}
                  </span>
                )}
              </div>

              {/* Value - editable */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={entry.value}
                    onChange={(e) => updateEntry(entry.name, e.target.value)}
                    className={cn(
                      'w-full bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
                      'border px-3 py-2 font-mono text-sm',
                      'text-[var(--swiss-gray-700)] dark:text-[#E5E5E5]',
                      'focus:outline-none focus:ring-2',
                      'placeholder:text-[var(--swiss-gray-400)]',
                      'transition-all duration-150',
                      entry.value.length > ENTRY_VALUE_MAX_LENGTH
                        ? 'border-red-500 focus:ring-red-500'
                        : entry.value.length > 100000
                          ? 'border-yellow-500 focus:ring-yellow-500'
                          : 'border-[var(--swiss-gray-200)] dark:border-[#444] focus:ring-[var(--swiss-black)] dark:focus:ring-[#666]'
                    )}
                    placeholder={t('kvm.table.enterValue', 'Enter value...')}
                  />
                  {/* Size indicator for large values */}
                  {entry.value.length > 10000 && (
                    <div
                      className={cn(
                        'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono',
                        entry.value.length > ENTRY_VALUE_MAX_LENGTH
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : entry.value.length > 100000
                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-[var(--swiss-gray-100)] text-[var(--swiss-gray-500)] dark:bg-[#333] dark:text-[#888]'
                      )}
                      title={entry.value.length > ENTRY_VALUE_MAX_LENGTH
                        ? t('kvm.table.valueTooLarge', 'Value exceeds maximum size')
                        : t('kvm.table.valueLarge', 'Large value may impact performance')
                      }
                    >
                      {entry.value.length > ENTRY_VALUE_MAX_LENGTH && (
                        <AlertCircle className="h-2.5 w-2.5" />
                      )}
                      {entry.value.length <= ENTRY_VALUE_MAX_LENGTH && entry.value.length > 100000 && (
                        <AlertTriangle className="h-2.5 w-2.5" />
                      )}
                      {formatBytes(entry.value.length)}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => toggleEntryForDeletion(entry.name)}
                className={cn(
                  'p-2  transition-all duration-150',
                  markedForDeletion
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'text-[var(--swiss-gray-400)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                )}
                title={
                  markedForDeletion
                    ? t('kvm.table.restore', 'Restore entry')
                    : t('kvm.table.delete', 'Mark for deletion')
                }
              >
                {markedForDeletion ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
