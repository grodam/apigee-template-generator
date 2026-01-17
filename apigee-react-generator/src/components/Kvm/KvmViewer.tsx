import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileJson,
  Table,
  Plus,
  Save,
  Loader2,
  Database,
  Lock,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import { ApigeeClient, KvmService } from '@/services/apigee';
import { KvmJsonView } from './KvmJsonView';
import { KvmTableView } from './KvmTableView';
import { DeleteKvmDialog } from './DeleteKvmDialog';

interface KvmViewerProps {
  className?: string;
  onAddEntry: () => void;
}

export const KvmViewer: React.FC<KvmViewerProps> = ({ className, onAddEntry }) => {
  const { t } = useTranslation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const {
    connection,
    currentKvm,
    originalKvm,
    selectedEnvironment,
    selectedScope,
    selectedProxyName,
    selectedKvmName,
    viewMode,
    hasUnsavedChanges,
    isSaving,
    entriesMarkedForDeletion,
    setViewMode,
    setSaving,
    setCurrentKvm,
    setHasUnsavedChanges,
    addConsoleMessage,
  } = useKvmStore();

  const handleSave = useCallback(async () => {
    if (!currentKvm || !originalKvm || !selectedEnvironment || !selectedKvmName) return;

    const client = new ApigeeClient({
      organizationId: connection.organizationId,
      accessToken: connection.accessToken,
    });
    const service = new KvmService(client);

    setSaving(true);
    addConsoleMessage({ type: 'info', message: `Saving changes to ${selectedKvmName}...` });

    try {
      // Get current entries and filter out those marked for deletion
      // (without modifying state - entries stay visible until refresh)
      const allCurrentEntries = currentKvm.keyValueEntries || [];
      const newEntries = allCurrentEntries.filter(
        (entry) => !entriesMarkedForDeletion.has(entry.name)
      );
      const oldEntries = originalKvm.keyValueEntries || [];

      let stats: { added: number; updated: number; deleted: number };

      if (selectedScope === 'environment') {
        stats = await service.saveEnvKvmEntries(
          selectedEnvironment,
          selectedKvmName,
          newEntries,
          oldEntries
        );
      } else if (selectedProxyName) {
        stats = await service.saveProxyKvmEntries(
          selectedProxyName,
          selectedKvmName,
          newEntries,
          oldEntries
        );
      } else {
        throw new Error('Invalid scope configuration');
      }

      // Refresh KVM data
      const refreshedKvm =
        selectedScope === 'environment'
          ? await service.getEnvKvm(selectedEnvironment, selectedKvmName)
          : await service.getProxyKvm(selectedProxyName!, selectedKvmName);

      setCurrentKvm(refreshedKvm);
      setHasUnsavedChanges(false);

      addConsoleMessage({
        type: 'success',
        message: `Saved: ${stats.added} added, ${stats.updated} updated, ${stats.deleted} deleted`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      addConsoleMessage({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  }, [
    connection,
    currentKvm,
    originalKvm,
    selectedEnvironment,
    selectedScope,
    selectedProxyName,
    selectedKvmName,
    entriesMarkedForDeletion,
    setSaving,
    setCurrentKvm,
    setHasUnsavedChanges,
    addConsoleMessage,
  ]);

  // Empty state when not connected or no KVM selected
  if (!connection.isConnected) {
    return (
      <div className={cn(
        'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
        'shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
        'flex flex-col items-center justify-center gap-4',
        className
      )}>
        <Database className="h-12 w-12 text-[var(--swiss-gray-300)]" />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]">
            {t('kvm.viewer.notConnected', 'Not Connected')}
          </p>
          <p className="text-xs text-[var(--swiss-gray-400)] mt-1">
            {t('kvm.viewer.connectHint', 'Connect to your Apigee organization to manage KVMs')}
          </p>
        </div>
      </div>
    );
  }

  if (!currentKvm) {
    return (
      <div className={cn(
        'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
        'shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
        'flex flex-col items-center justify-center gap-4',
        className
      )}>
        <Database className="h-12 w-12 text-[var(--swiss-gray-300)]" />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]">
            {t('kvm.viewer.selectKvm', 'Select a KVM')}
          </p>
          <p className="text-xs text-[var(--swiss-gray-400)] mt-1">
            {t('kvm.viewer.selectHint', 'Choose a KVM from the sidebar to view and edit its entries')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
      'shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
      'flex flex-col h-full overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--swiss-gray-100)] dark:border-[#333]">
        {/* KVM Info */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-base text-[var(--swiss-black)] dark:text-[#E5E5E5]">
              {currentKvm.name}
            </h2>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title={t('kvm.viewer.unsavedChanges', 'Unsaved changes')} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--swiss-gray-500)] dark:text-[var(--swiss-gray-400)]">
            <span>{selectedEnvironment}</span>
            <span>·</span>
            <span>{currentKvm.keyValueEntries?.length || 0} entries</span>
            {currentKvm.encrypted && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  encrypted
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* View Toggle - Pill style */}
          <div className="flex items-center h-9 bg-[var(--swiss-gray-100)] dark:bg-[#252525]  p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center justify-center gap-1.5 h-7 px-3 ',
                'text-[11px] font-semibold',
                'transition-all duration-150',
                viewMode === 'table'
                  ? 'bg-[var(--swiss-white)] dark:bg-[#333] shadow-sm text-[var(--swiss-black)] dark:text-[#E5E5E5]'
                  : 'text-[var(--swiss-gray-500)] dark:text-[var(--swiss-gray-400)] hover:text-[var(--swiss-gray-700)] dark:hover:text-[#E5E5E5]'
              )}
            >
              <Table className="h-3.5 w-3.5" />
              {t('kvm.viewer.table', 'Table')}
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={cn(
                'flex items-center justify-center gap-1.5 h-7 px-3 ',
                'text-[11px] font-semibold',
                'transition-all duration-150',
                viewMode === 'json'
                  ? 'bg-[var(--swiss-white)] dark:bg-[#333] shadow-sm text-[var(--swiss-black)] dark:text-[#E5E5E5]'
                  : 'text-[var(--swiss-gray-500)] dark:text-[var(--swiss-gray-400)] hover:text-[var(--swiss-gray-700)] dark:hover:text-[#E5E5E5]'
              )}
            >
              <FileJson className="h-3.5 w-3.5" />
              {t('kvm.viewer.json', 'JSON')}
            </button>
          </div>

          {/* Add Entry Button */}
          <button
            onClick={onAddEntry}
            className={cn(
              'flex items-center justify-center gap-1.5 h-9 px-4 ',
              'text-[11px] font-semibold',
              'bg-[var(--swiss-gray-100)] dark:bg-[#333]',
              'text-[var(--swiss-gray-700)] dark:text-[#E5E5E5]',
              'hover:bg-[var(--swiss-gray-200)] dark:hover:bg-[#444]',
              'transition-all duration-150'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('kvm.viewer.addEntry', 'Add Entry')}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={cn(
              'flex items-center justify-center gap-1.5 h-9 px-5 ',
              'text-[11px] font-semibold',
              'transition-all duration-150',
              hasUnsavedChanges && !isSaving
                ? 'bg-[var(--swiss-black)] dark:bg-[#E5E5E5] text-[var(--swiss-white)] dark:text-[#1A1A1A] shadow-md hover:shadow-lg hover:opacity-90'
                : 'bg-[var(--swiss-gray-200)] dark:bg-[#333] text-[var(--swiss-gray-400)] cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t('kvm.viewer.save', 'Save')}
          </button>

          {/* Delete KVM Button */}
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isSaving}
            className={cn(
              'flex items-center justify-center h-9 w-9',
              'text-[var(--swiss-gray-400)]',
              'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
              'transition-all duration-150',
              isSaving && 'opacity-50 cursor-not-allowed'
            )}
            title={t('kvm.viewer.deleteKvm', 'Delete KVM')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'json' ? (
          <KvmJsonView className="h-full" />
        ) : (
          <KvmTableView className="h-full" />
        )}
      </div>

      {/* Delete KVM Dialog */}
      <DeleteKvmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </div>
  );
};
