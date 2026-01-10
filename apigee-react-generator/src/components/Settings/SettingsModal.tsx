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
      <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] max-h-[900px] p-0 gap-0 bg-[var(--bg-secondary)] border-[var(--border-default)] rounded-3xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border-default)] bg-white/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
            <Settings className="h-5 w-5 text-[var(--accent-600)]" />
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configuration des templates et des paramètres Azure DevOps
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-56 border-r border-[var(--border-default)] bg-white/30 p-4">
            <Tabs
              value={settingsActiveTab}
              onValueChange={(v) => setSettingsActiveTab(v as 'azure-devops' | 'template-sync')}
              orientation="vertical"
              className="h-full"
            >
              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-2">
                <TabsTrigger
                  value="azure-devops"
                  className="w-full justify-start gap-3 px-4 py-3 rounded-md text-left font-medium transition-all duration-200 data-[state=active]:bg-[var(--accent-200)] data-[state=active]:text-[var(--accent-700)] data-[state=inactive]:text-[var(--text-secondary)] data-[state=inactive]:hover:bg-[var(--bg-tertiary)]"
                >
                  <Cloud className="h-4 w-4" />
                  {t('settings.tabs.azureDevOps')}
                </TabsTrigger>
                <TabsTrigger
                  value="template-sync"
                  className="w-full justify-start gap-3 px-4 py-3 rounded-md text-left font-medium transition-all duration-200 data-[state=active]:bg-[var(--accent-200)] data-[state=active]:text-[var(--accent-700)] data-[state=inactive]:text-[var(--text-secondary)] data-[state=inactive]:hover:bg-[var(--bg-tertiary)]"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('settings.tabs.templateSync')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={settingsActiveTab} className="h-full">
              <TabsContent value="azure-devops" className="h-full m-0 p-6 data-[state=inactive]:hidden overflow-y-auto">
                <AzureDevOpsSettings />
              </TabsContent>
              <TabsContent value="template-sync" className="h-full m-0 p-6 data-[state=inactive]:hidden overflow-y-auto">
                <TemplateSyncSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
