import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';

interface KvmTableViewProps {
  className?: string;
}

export const KvmTableView: React.FC<KvmTableViewProps> = ({ className }) => {
  const { t } = useTranslation();
  const { currentKvm, originalKvm, updateEntry, deleteEntry } = useKvmStore();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = (name: string) => {
    if (deleteConfirm === name) {
      deleteEntry(name);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(name);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
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
    <div className={cn('overflow-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--swiss-gray-100)] dark:bg-[var(--swiss-gray-800)]">
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)] border-b-2 border-[var(--swiss-black)] w-1/3">
              {t('kvm.table.name', 'Name')}
            </th>
            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)] border-b-2 border-[var(--swiss-black)]">
              {t('kvm.table.value', 'Value')}
            </th>
            <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)] border-b-2 border-[var(--swiss-black)] w-20">
              {t('kvm.table.actions', 'Actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const modified = isModified(entry.name, entry.value);
            const isNew = isNewEntry(entry.name);

            return (
              <tr
                key={entry.name}
                className={cn(
                  'border-b border-[var(--swiss-gray-200)] dark:border-[var(--swiss-gray-700)]',
                  'hover:bg-[var(--swiss-gray-50)] dark:hover:bg-[var(--swiss-gray-800)]',
                  modified && 'bg-yellow-50 dark:bg-yellow-900/20',
                  isNew && 'bg-green-50 dark:bg-green-900/20'
                )}
              >
                {/* Name cell - read only */}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[var(--swiss-black)]">
                      {entry.name}
                    </span>
                    {isNew && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-green-500 text-white rounded">
                        {t('kvm.table.new', 'New')}
                      </span>
                    )}
                    {modified && !isNew && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-yellow-500 text-white rounded">
                        {t('kvm.table.modified', 'Modified')}
                      </span>
                    )}
                  </div>
                </td>

                {/* Value cell - editable */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={entry.value}
                    onChange={(e) => updateEntry(entry.name, e.target.value)}
                    className={cn(
                      'w-full bg-transparent border-b-2 py-1 font-mono text-sm',
                      'focus:outline-none transition-colors',
                      'border-transparent focus:border-[var(--swiss-black)]',
                      'text-[var(--swiss-black)]',
                      'placeholder:text-[var(--swiss-gray-400)]'
                    )}
                    placeholder={t('kvm.table.enterValue', 'Enter value...')}
                  />
                </td>

                {/* Actions cell */}
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleDelete(entry.name)}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      deleteConfirm === entry.name
                        ? 'bg-red-500 text-white'
                        : 'text-[var(--swiss-gray-400)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    )}
                    title={
                      deleteConfirm === entry.name
                        ? t('kvm.table.confirmDelete', 'Click again to confirm')
                        : t('kvm.table.delete', 'Delete entry')
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
