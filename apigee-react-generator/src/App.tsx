import { WizardContainer } from './components/Wizard/WizardContainer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileCode2, Settings } from 'lucide-react'
import { SettingsModal } from './components/Settings/SettingsModal'
import { useProjectStore } from './store/useProjectStore'

function App() {
  const setSettingsModalOpen = useProjectStore((state) => state.setSettingsModalOpen)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Apigee Template Generator</h1>
                <p className="text-sm text-muted-foreground">Generate professional Apigee API proxies</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsModalOpen(true)}
                className="rounded-xl hover:bg-[var(--cream-200)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Paramétrage"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Badge variant="secondary">v2.0.0</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <WizardContainer />
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 mt-8">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-center text-muted-foreground">
            Apigee Template Generator - Generate Apigee proxies from OpenAPI specifications
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
