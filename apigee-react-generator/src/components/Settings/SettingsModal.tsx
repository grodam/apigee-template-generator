import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode2, Cloud, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '@/store/useProjectStore';
import { TemplateManager } from './TemplateManager/TemplateManager';
import { AzureDevOpsSettings } from './AzureDevOpsSettings/AzureDevOpsSettings';

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
      <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] max-h-[900px] p-0 gap-0 bg-[var(--cream-100)] border-[var(--border-light)] rounded-3xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border-light)] bg-white/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
            <Settings className="h-5 w-5 text-[var(--lavender-600)]" />
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configuration des templates et des paramètres Azure DevOps
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-56 border-r border-[var(--border-light)] bg-white/30 p-4">
            <Tabs
              value={settingsActiveTab}
              onValueChange={(v) => setSettingsActiveTab(v as 'templates' | 'azure-devops')}
              orientation="vertical"
              className="h-full"
            >
              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-2">
                <TabsTrigger
                  value="templates"
                  className="w-full justify-start gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-200 data-[state=active]:bg-[var(--lavender-200)] data-[state=active]:text-[var(--lavender-700)] data-[state=inactive]:text-[var(--text-secondary)] data-[state=inactive]:hover:bg-[var(--cream-200)]"
                >
                  <FileCode2 className="h-4 w-4" />
                  {t('settings.tabs.templates')}
                </TabsTrigger>
                <TabsTrigger
                  value="azure-devops"
                  className="w-full justify-start gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-200 data-[state=active]:bg-[var(--lavender-200)] data-[state=active]:text-[var(--lavender-700)] data-[state=inactive]:text-[var(--text-secondary)] data-[state=inactive]:hover:bg-[var(--cream-200)]"
                >
                  <Cloud className="h-4 w-4" />
                  {t('settings.tabs.azureDevOps')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={settingsActiveTab} className="h-full">
              <TabsContent value="templates" className="h-full m-0 p-0 data-[state=inactive]:hidden">
                <TemplateManager />
              </TabsContent>
              <TabsContent value="azure-devops" className="h-full m-0 p-6 data-[state=inactive]:hidden overflow-y-auto">
                <AzureDevOpsSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
