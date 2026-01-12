import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, Settings, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '@/store/useProjectStore';
import { AzureDevOpsSettings } from './AzureDevOpsSettings/AzureDevOpsSettings';
import { TemplateSyncSettings } from './TemplateSyncSettings/TemplateSyncSettings';
import { cn } from '@/lib/utils';

export function SettingsModal() {
  const { t } = useTranslation();
  const {
    isSettingsModalOpen,
    setSettingsModalOpen,
    settingsActiveTab,
    setSettingsActiveTab,
  } = useProjectStore();

  return (
    <Dialog open={isSettingsModalOpen} onOpenChange={setSettingsModalOpen}>
      <DialogContent className="max-w-[90vw] w-[1000px] h-[80vh] max-h-[800px] p-0 gap-0 bg-[var(--swiss-white)] border-2 border-[var(--swiss-black)] rounded-none overflow-hidden flex flex-col shadow-none">
        {/* Swiss Header */}
        <DialogHeader className="px-8 py-6 border-b-2 border-[var(--swiss-black)] flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
            <Settings className="h-6 w-6" />
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configuration des templates et des paramètres Azure DevOps
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Swiss Sidebar Navigation */}
          <div className="w-56 border-r-2 border-[var(--swiss-black)] bg-[var(--swiss-gray-50)] p-0">
            <Tabs
              value={settingsActiveTab}
              onValueChange={(v) => setSettingsActiveTab(v as 'azure-devops' | 'template-sync')}
              orientation="vertical"
              className="h-full"
            >
              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-0 p-0">
                <TabsTrigger
                  value="azure-devops"
                  className={cn(
                    "w-full justify-start gap-3 px-6 py-4 rounded-none text-left text-[11px] font-black uppercase tracking-wider transition-all border-b border-[var(--swiss-gray-200)]",
                    "data-[state=active]:bg-[var(--swiss-black)] data-[state=active]:text-[var(--swiss-white)]",
                    "data-[state=inactive]:text-[var(--swiss-gray-500)] data-[state=inactive]:hover:bg-[var(--swiss-gray-100)]"
                  )}
                >
                  <Cloud className="h-4 w-4" />
                  {t('settings.tabs.azureDevOps')}
                </TabsTrigger>
                <TabsTrigger
                  value="template-sync"
                  className={cn(
                    "w-full justify-start gap-3 px-6 py-4 rounded-none text-left text-[11px] font-black uppercase tracking-wider transition-all border-b border-[var(--swiss-gray-200)]",
                    "data-[state=active]:bg-[var(--swiss-black)] data-[state=active]:text-[var(--swiss-white)]",
                    "data-[state=inactive]:text-[var(--swiss-gray-500)] data-[state=inactive]:hover:bg-[var(--swiss-gray-100)]"
                  )}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('settings.tabs.templateSync')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden bg-[var(--swiss-white)]">
            <Tabs value={settingsActiveTab} className="h-full">
              <TabsContent value="azure-devops" className="h-full m-0 p-8 data-[state=inactive]:hidden overflow-y-auto">
                <AzureDevOpsSettings />
              </TabsContent>
              <TabsContent value="template-sync" className="h-full m-0 p-8 data-[state=inactive]:hidden overflow-y-auto">
                <TemplateSyncSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
