import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';
import { KvmHeader } from './KvmHeader';
import { KvmSidebar } from './KvmSidebar';
import { KvmViewer } from './KvmViewer';
import { KvmConsole } from './KvmConsole';
import { AddEntryDialog } from './AddEntryDialog';
import { CreateKvmDialog } from './CreateKvmDialog';

export const KvmPage: React.FC = () => {
  const { t } = useTranslation();
  const { connection, selectedEnvironment } = useKvmStore();

  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isCreateKvmOpen, setIsCreateKvmOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-[var(--swiss-bg-canvas)]">
      {/* Header - Connection Panel */}
      <KvmHeader />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-[var(--swiss-gray-200)] flex flex-col">
          <KvmSidebar className="flex-1 overflow-auto relative" />

          {/* Create KVM Button */}
          {connection.isConnected && selectedEnvironment && (
            <div className="p-3 border-t border-[var(--swiss-gray-200)] bg-[var(--swiss-white)]">
              <button
                onClick={() => setIsCreateKvmOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2',
                  'text-[10px] font-bold uppercase tracking-wider',
                  'border-2 border-dashed border-[var(--swiss-gray-400)]',
                  'text-[var(--swiss-gray-600)]',
                  'hover:border-[var(--swiss-black)] hover:text-[var(--swiss-black)]',
                  'transition-colors'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('kvm.sidebar.createKvm', 'Create KVM')}
              </button>
            </div>
          )}
        </div>

        {/* Main Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <KvmViewer
            className="flex-1 overflow-hidden"
            onAddEntry={() => setIsAddEntryOpen(true)}
          />
        </div>
      </div>

      {/* Console - Fixed at bottom */}
      <KvmConsole className="flex-shrink-0 border-t border-[var(--swiss-gray-200)]" />

      {/* Dialogs */}
      <AddEntryDialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen} />
      <CreateKvmDialog open={isCreateKvmOpen} onOpenChange={setIsCreateKvmOpen} />
    </div>
  );
};
