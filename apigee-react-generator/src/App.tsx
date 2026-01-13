import { useTranslation } from 'react-i18next';
import { CanvasContainer } from './components/Canvas/CanvasContainer'
import { FileCode2, Settings, RefreshCw } from 'lucide-react'
import { SettingsModal } from './components/Settings/SettingsModal'
import { ThemeToggle } from './components/ThemeToggle'
import { useProjectStore } from './store/useProjectStore'
import { useTemplateSync } from './hooks/useTemplateSync'

function App() {
  const { t } = useTranslation();
  const setSettingsModalOpen = useProjectStore((state) => state.setSettingsModalOpen)
  const templateRepoConfig = useProjectStore((state) => state.templateRepoConfig)

  // Initialize template sync on startup
  const templateSyncState = useTemplateSync();

  return (
    <div className="min-h-screen bg-[var(--swiss-gray-50)]">
      {/* Header - Swiss Design Style */}
      <header className="swiss-header">
        <div className="swiss-header-inner">
          <div className="flex items-center gap-4">
            <div className="swiss-header-logo">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">
                Apigee Generator
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--swiss-gray-400)]">
                {t('app.subtitle', 'Automate API Proxy Building')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Template sync indicator */}
            {templateRepoConfig.enabled && (
              <div className="flex items-center gap-1.5">
                {templateSyncState.isSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 text-[var(--swiss-gray-500)] animate-spin" />
                ) : templateSyncState.source === 'remote' ? (
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 bg-green-100 text-green-700 cursor-help"
                    title="Templates synchronized with Azure DevOps repository"
                  >
                    Synced
                  </span>
                ) : null}
              </div>
            )}
            <ThemeToggle />
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="w-8 h-8 border border-[var(--swiss-gray-200)] flex items-center justify-center hover:bg-[var(--swiss-gray-50)] transition-colors"
              title={t('common.settings')}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal />

      {/* Main Canvas Content */}
      <CanvasContainer />

      {/* Footer - Swiss Style */}
      <footer className="swiss-footer">
        <p className="swiss-footer-text">
          Apigee Template Generator &mdash; v1.0.0
        </p>
      </footer>
    </div>
  )
}

export default App
