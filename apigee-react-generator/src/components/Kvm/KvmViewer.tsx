import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileJson,
  Table,
  Plus,
  Save,
  Loader2,
  Database,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import { ApigeeClient, KvmService } from '@/services/apigee';
import { KvmJsonView } from './KvmJsonView';
import { KvmTableView } from './KvmTableView';

interface KvmViewerProps {
  className?: string;
  onAddEntry: () => void;
}

export const KvmViewer: React.FC<KvmViewerProps> = ({ className, onAddEntry }) => {
  const { t } = useTranslation();
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
      const newEntries = currentKvm.keyValueEntries || [];
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
    setSaving,
    setCurrentKvm,
    setHasUnsavedChanges,
    addConsoleMessage,
  ]);

  // Empty state when not connected or no KVM selected
  if (!connection.isConnected) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
        <Database className="h-12 w-12 text-[var(--swiss-gray-300)]" />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--swiss-gray-600)]">
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
      <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
        <Database className="h-12 w-12 text-[var(--swiss-gray-300)]" />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--swiss-gray-600)]">
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
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--swiss-gray-200)] bg-[var(--swiss-white)]">
        {/* KVM Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-[var(--swiss-gray-600)]" />
            <span className="font-mono text-sm font-medium">{currentKvm.name}</span>
          </div>
          {currentKvm.encrypted && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase bg-[var(--swiss-gray-200)] text-[var(--swiss-gray-600)] rounded">
              <Lock className="h-3 w-3" />
              {t('kvm.viewer.encrypted', 'Encrypted')}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="w-2 h-2 bg-yellow-500 rounded-full" title={t('kvm.viewer.unsavedChanges', 'Unsaved changes')} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border-2 border-[var(--swiss-black)]">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'text-[10px] font-bold uppercase tracking-wider',
                'transition-colors',
                viewMode === 'table'
                  ? 'bg-[var(--swiss-black)] text-[var(--swiss-white)]'
                  : 'bg-[var(--swiss-white)] text-[var(--swiss-black)] hover:bg-[var(--swiss-gray-100)]'
              )}
            >
              <Table className="h-3.5 w-3.5" />
              {t('kvm.viewer.table', 'Table')}
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'text-[10px] font-bold uppercase tracking-wider',
                'transition-colors border-l-2 border-[var(--swiss-black)]',
                viewMode === 'json'
                  ? 'bg-[var(--swiss-black)] text-[var(--swiss-white)]'
                  : 'bg-[var(--swiss-white)] text-[var(--swiss-black)] hover:bg-[var(--swiss-gray-100)]'
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
              'flex items-center gap-1.5 px-3 py-1.5',
              'text-[10px] font-bold uppercase tracking-wider',
              'border-2 border-[var(--swiss-black)]',
              'bg-[var(--swiss-white)] text-[var(--swiss-black)]',
              'hover:bg-[var(--swiss-black)] hover:text-[var(--swiss-white)]',
              'transition-colors'
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
              'flex items-center gap-1.5 px-4 py-1.5',
              'text-[10px] font-bold uppercase tracking-wider',
              'transition-colors',
              hasUnsavedChanges && !isSaving
                ? 'bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]'
                : 'bg-[var(--swiss-gray-300)] text-[var(--swiss-white)] cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t('kvm.viewer.save', 'Save')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-[var(--swiss-white)]">
        {viewMode === 'json' ? (
          <KvmJsonView className="h-full" />
        ) : (
          <KvmTableView className="h-full" />
        )}
      </div>
    </div>
  );
};
