import { useTranslation } from 'react-i18next';
import { WizardContainer } from './components/Wizard/WizardContainer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileCode2, Settings, RefreshCw } from 'lucide-react'
import { SettingsModal } from './components/Settings/SettingsModal'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { useProjectStore } from './store/useProjectStore'
import { useTemplateSync } from './hooks/useTemplateSync'

function App() {
  const { t } = useTranslation();
  const setSettingsModalOpen = useProjectStore((state) => state.setSettingsModalOpen)
  const templateRepoConfig = useProjectStore((state) => state.templateRepoConfig)

  // Initialize template sync on startup
  const templateSyncState = useTemplateSync();

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header - Clean, bordered */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-container accent">
                <FileCode2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  {t('app.title')}
                </h1>
                <p className="text-sm text-[var(--text-muted)]">{t('app.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Template sync indicator */}
              {templateRepoConfig.enabled && (
                <div className="flex items-center gap-1.5">
                  {templateSyncState.isSyncing ? (
                    <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-500)] animate-spin" />
                  ) : templateSyncState.source === 'remote' ? (
                    <Badge variant="outline" className="text-[10px] font-medium py-0 px-1.5 h-5 gap-1 border-green-300 text-green-600 bg-green-50">
                      <RefreshCw className="h-3 w-3" />
                      Synced
                    </Badge>
                  ) : null}
                </div>
              )}
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsModalOpen(true)}
                className="h-8 w-8 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title={t('common.settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="text-xs font-medium">v2.0.0</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        <WizardContainer />
      </main>

      {/* Footer - Minimal */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] mt-6">
        <div className="container mx-auto px-6 py-4">
          <p className="text-xs text-center text-[var(--text-faint)]">
            {t('app.footer')}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
