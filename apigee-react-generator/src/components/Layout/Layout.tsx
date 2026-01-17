import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, RefreshCw, ArrowLeft } from 'lucide-react';
import { AppIcon } from '../AppIcon';
import { SettingsModal } from '../Settings/SettingsModal';
import { ThemeToggle } from '../ThemeToggle';
import { useProjectStore } from '../../store/useProjectStore';
import { useTemplateSync } from '../../hooks/useTemplateSync';
import { version } from '../../../package.json';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSettingsModalOpen = useProjectStore((state) => state.setSettingsModalOpen);
  const templateRepoConfig = useProjectStore((state) => state.templateRepoConfig);

  // Initialize template sync on startup
  const templateSyncState = useTemplateSync();

  const isHomePage = location.pathname === '/';
  const isGeneratorPage = location.pathname === '/generator';

  // Get header title and subtitle based on current route
  const getHeaderContent = () => {
    switch (location.pathname) {
      case '/generator':
        return {
          title: 'Proxy Generator',
          subtitle: 'Create Apigee proxies from OpenAPI specs',
        };
      case '/kvm':
        return {
          title: 'KVM Manager',
          subtitle: 'Browse and edit Key-Value Maps',
        };
      default:
        return {
          title: 'Apigee Workbench',
          subtitle: t('app.subtitle', 'Apigee Development Tools'),
        };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <div className="min-h-screen bg-[var(--swiss-gray-50)]">
      {/* Header - Swiss Design Style */}
      <header className="swiss-header">
        <div className="swiss-header-inner">
          <div className="flex items-center gap-4">
            {/* Back button - only show when not on home page */}
            {!isHomePage && (
              <button
                onClick={() => navigate('/')}
                className="w-9 h-9 flex items-center justify-center border-2 border-[#999] text-[#888] hover:border-[#333] hover:text-[#333] hover:bg-[#333]/10 dark:border-[#555] dark:text-[#888] dark:hover:border-[#E5E5E5] dark:hover:text-[#E5E5E5] dark:hover:bg-[#E5E5E5]/10 transition-all duration-200"
                title="Back to Home"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
              </button>
            )}
            <div className="swiss-header-logo">
              <AppIcon className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">
                {headerContent.title}
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--swiss-gray-400)]">
                {headerContent.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Template sync indicator - only on generator page */}
            {isGeneratorPage && templateRepoConfig.enabled && (
              <div className="flex items-center gap-1.5">
                {templateSyncState.isSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 text-[var(--swiss-gray-500)] animate-spin" />
                ) : templateSyncState.source === 'remote' ? (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-[var(--swiss-gray-300)] text-[var(--swiss-gray-600)] cursor-help"
                    title="Templates synchronized with Azure DevOps repository"
                  >
                    Synced
                  </span>
                ) : null}
              </div>
            )}
            <ThemeToggle />
            {/* Settings button - only on generator page */}
            {isGeneratorPage && (
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="w-8 h-8 border border-[var(--swiss-gray-200)] flex items-center justify-center hover:bg-[var(--swiss-gray-50)] transition-colors"
                title={t('common.settings')}
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal />

      {/* Main Content */}
      {children}

      {/* Footer - Swiss Style */}
      <footer className="swiss-footer">
        <p className="swiss-footer-text">
          Apigee Workbench &mdash; v{version}
        </p>
      </footer>
    </div>
  );
};
