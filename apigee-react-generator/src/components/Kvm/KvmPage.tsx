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
    <div className="h-[calc(100vh-120px)] flex flex-col bg-[#E8ECF1] dark:bg-[#2A2A2A] p-5 gap-5">
      {/* Header - Connection Panel */}
      <KvmHeader />

      {/* Main Content - 3 Column Grid */}
      <div className="flex-1 grid grid-cols-[260px_1fr_300px] gap-5 min-h-0">
        {/* Sidebar */}
        <div className="flex flex-col gap-3 min-h-0">
          <KvmSidebar className="flex-1 overflow-hidden" />

          {/* Create KVM Button */}
          {connection.isConnected && selectedEnvironment && (
            <button
              onClick={() => setIsCreateKvmOpen(true)}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3',
                'text-[10px] font-bold uppercase tracking-wider',
                'bg-[var(--swiss-white)] dark:bg-[#1A1A1A]',
                'border-2 border-dashed border-[var(--swiss-gray-300)] dark:border-[var(--swiss-gray-600)]',
                'text-[var(--swiss-gray-600)] dark:text-[var(--swiss-gray-400)]',
                'hover:border-[var(--swiss-black)] hover:text-[var(--swiss-black)]',
                'dark:hover:border-[var(--swiss-gray-400)] dark:hover:text-[var(--swiss-white)]',
                'rounded-lg transition-all duration-200',
                'shadow-sm hover:shadow-md'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('kvm.sidebar.createKvm', 'Create KVM')}
            </button>
          )}
        </div>

        {/* Main Viewer */}
        <KvmViewer
          className="min-h-0"
          onAddEntry={() => setIsAddEntryOpen(true)}
        />

        {/* Console Panel - Right Side */}
        <KvmConsole className="min-h-0" />
      </div>

      {/* Dialogs */}
      <AddEntryDialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen} />
      <CreateKvmDialog open={isCreateKvmOpen} onOpenChange={setIsCreateKvmOpen} />
    </div>
  );
};
