import React, { useState, useCallback } from 'react';
import { ProgressHeader } from './ProgressHeader';
import { ConsolePanel } from './ConsolePanel';
import type { ConsoleMessage } from './ConsolePanel';
import { OpenAPICard } from '../Cards/OpenAPICard';
import { ProxyConfigCard } from '../Cards/ProxyConfigCard';
import { TargetServersCard } from '../Cards/TargetServersCard';
import { ApiProductCard } from '../Cards/ApiProductCard';
import { AzurePushModal } from './AzurePushModal';
import { useProjectStore } from '../../store/useProjectStore';
import { ApigeeProjectGenerator } from '../../services/generators/ApigeeGenerator';
import { ZipExporter } from '../../services/exporters/ZipExporter';
import { AzureDevOpsService } from '../../services/azure-devops/AzureDevOpsService';
import { ENVIRONMENTS } from '../../utils/constants';

type CardId = 'openapi' | 'proxy' | 'targets' | 'products';

export const CanvasContainer: React.FC = () => {
  const {
    parsedOpenAPI,
    apiConfig,
    getCompleteConfig,
    generatedProject,
    setGeneratedProject,
    azureDevOpsConfig,
    portalConfig,
  } = useProjectStore();

  // Card expansion state - allows multiple cards to be expanded
  const [expandedCards, setExpandedCards] = useState<Set<CardId>>(new Set(['openapi']));

  // Console messages
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);

  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // Azure push modal
  const [isAzurePushModalOpen, setIsAzurePushModalOpen] = useState(false);

  // Toggle card expansion
  const toggleCard = useCallback((cardId: CardId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  // Collapse all cards except openapi when a new spec is loaded
  const handleSpecLoaded = useCallback(() => {
    setExpandedCards(new Set(['openapi']));
  }, []);

  // Add console message
  const addConsoleMessage = useCallback((message: string, type: ConsoleMessage['type']) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setConsoleMessages(prev => [...prev, { timestamp, message, type }]);
  }, []);

  // Calculate progress based on configuration state
  const calculateProgress = useCallback(() => {
    let score = 0;
    const totalSteps = 4;

    // OpenAPI loaded
    if (parsedOpenAPI) score++;

    // Proxy config complete
    const config = getCompleteConfig();
    if (config) score++;

    // At least one environment configured
    const hasConfiguredEnv = ENVIRONMENTS.some(env => {
      const envConfig = apiConfig.environments?.[env];
      return envConfig?.targetServers?.[0]?.host;
    });
    if (hasConfiguredEnv) score++;

    // All environments configured
    const allEnvsConfigured = ENVIRONMENTS.every(env => {
      const envConfig = apiConfig.environments?.[env];
      return envConfig?.targetServers?.[0]?.host;
    });
    if (allEnvsConfigured) score++;

    return Math.round((score / totalSteps) * 100);
  }, [parsedOpenAPI, getCompleteConfig, apiConfig.environments]);

  // Get step statuses for progress header
  const getStepStatus = useCallback((step: string): 'complete' | 'partial' | 'empty' => {
    switch (step) {
      case 'openapi':
        return parsedOpenAPI ? 'complete' : 'empty';
      case 'proxy': {
        const config = getCompleteConfig();
        if (config) return 'complete';
        if (apiConfig.proxyName) return 'partial';
        return 'empty';
      }
      case 'targets': {
        const configured = ENVIRONMENTS.filter(env => {
          const envConfig = apiConfig.environments?.[env];
          return envConfig?.targetServers?.[0]?.host;
        });
        if (configured.length === ENVIRONMENTS.length) return 'complete';
        if (configured.length > 0) return 'partial';
        return 'empty';
      }
      case 'products': {
        const configuredProducts = ENVIRONMENTS.filter(env => {
          const envConfig = apiConfig.environments?.[env];
          return envConfig?.apiProducts?.[0]?.name;
        });
        if (configuredProducts.length === ENVIRONMENTS.length) return 'complete';
        if (configuredProducts.length > 0) return 'partial';
        return 'empty';
      }
      case 'export':
        return generatedProject ? 'complete' : 'empty';
      default:
        return 'empty';
    }
  }, [parsedOpenAPI, getCompleteConfig, apiConfig.proxyName, apiConfig.environments, generatedProject]);

  // Handle generate project
  const handleGenerate = async () => {
    const config = getCompleteConfig();

    if (!config || !parsedOpenAPI) {
      addConsoleMessage('ERROR: Configuration or OpenAPI spec missing', 'error');
      return;
    }

    setIsGenerating(true);
    addConsoleMessage('INITIALIZING GENERATION...', 'info');

    try {
      // Generate the project
      const generator = new ApigeeProjectGenerator(config, parsedOpenAPI.rawSpec, azureDevOpsConfig, portalConfig);

      addConsoleMessage('PARSING OPENAPI SPECIFICATION...', 'info');
      await new Promise(resolve => setTimeout(resolve, 200));

      addConsoleMessage('GENERATING PROXY CONFIGURATION...', 'info');
      await new Promise(resolve => setTimeout(resolve, 300));

      addConsoleMessage('CREATING FLOWS AND POLICIES...', 'info');
      await new Promise(resolve => setTimeout(resolve, 400));

      addConsoleMessage('GENERATING ENVIRONMENT CONFIGS...', 'info');
      await new Promise(resolve => setTimeout(resolve, 300));

      const project = await generator.generate();
      setGeneratedProject(project);

      addConsoleMessage(`SUCCESS: PROJECT GENERATED (${project.files.size} files)`, 'success');
    } catch (error: any) {
      addConsoleMessage(`ERROR: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download ZIP (only download, no generation)
  const handleDownloadZip = async () => {
    const config = getCompleteConfig();

    if (!generatedProject || !config) {
      addConsoleMessage('ERROR: No project generated yet', 'error');
      return;
    }

    try {
      addConsoleMessage('EXPORTING TO ZIP...', 'info');
      const exporter = new ZipExporter();
      await exporter.exportAndDownload(generatedProject);
      addConsoleMessage(`SUCCESS: ZIP DOWNLOADED - ${config.proxyName}.zip`, 'success');
    } catch (error: any) {
      addConsoleMessage(`ERROR: ${error.message}`, 'error');
    }
  };

  // Open Azure push modal
  const handlePushToAzure = () => {
    if (!generatedProject) {
      addConsoleMessage('ERROR: No project generated yet', 'error');
      return;
    }
    setIsAzurePushModalOpen(true);
  };

  // Actually perform the push to Azure DevOps
  const performPushToAzure = async () => {
    if (!generatedProject) {
      addConsoleMessage('ERROR: No project generated yet', 'error');
      return;
    }

    if (!azureDevOpsConfig.organization || !azureDevOpsConfig.project || !azureDevOpsConfig.personalAccessToken) {
      addConsoleMessage('ERROR: Azure DevOps not configured', 'error');
      return;
    }

    setIsPushing(true);
    addConsoleMessage('CONNECTING TO AZURE DEVOPS...', 'info');

    try {
      const azureService = new AzureDevOpsService(
        azureDevOpsConfig.organization,
        azureDevOpsConfig.personalAccessToken,
        true
      );

      addConsoleMessage(`CREATING REPOSITORY: ${azureDevOpsConfig.repositoryName}`, 'info');

      // Test connection first
      const connectionSuccess = await azureService.testConnection();
      if (!connectionSuccess) {
        throw new Error('Connection failed');
      }

      addConsoleMessage('CONNECTION VERIFIED', 'success');
      addConsoleMessage(`PUSHING FILES (${generatedProject.files.size}/${generatedProject.files.size})...`, 'info');

      // Push to Azure DevOps
      const result = await azureService.pushProject(azureDevOpsConfig, generatedProject);

      if (result.success) {
        addConsoleMessage(`SUCCESS: REPOSITORY CREATED AT ${result.repositoryUrl}`, 'success');
        setIsAzurePushModalOpen(false);
      } else {
        throw new Error(result.message || 'Push failed');
      }
    } catch (error: any) {
      addConsoleMessage(`ERROR: ${error.message}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  // Progress header steps
  const progressSteps = [
    { id: 'openapi', label: 'OpenAPI', status: getStepStatus('openapi') },
    { id: 'proxy', label: 'Proxy', status: getStepStatus('proxy') },
    { id: 'products', label: 'Products', status: getStepStatus('products') },
    { id: 'targets', label: 'Targets', status: getStepStatus('targets') },
    { id: 'export', label: 'Export', status: getStepStatus('export') },
  ];

  // Can generate/export?
  const canGenerate = !!parsedOpenAPI && !!getCompleteConfig();
  const canDownload = !!generatedProject;
  const canPush = !!generatedProject && azureDevOpsConfig.enabled;

  // Card expansion rules
  const hasOpenAPISpec = !!parsedOpenAPI;
  const isProxyComplete = !!getCompleteConfig();

  const canExpandProxy = hasOpenAPISpec;
  const canExpandProducts = hasOpenAPISpec && isProxyComplete;
  const canExpandTargets = hasOpenAPISpec && isProxyComplete;

  return (
    <div className="min-h-screen swiss-canvas swiss-grid-bg">
      {/* Progress Header */}
      <ProgressHeader
        steps={progressSteps}
        overallProgress={calculateProgress()}
      />

      {/* Main Canvas */}
      <main className="max-w-6xl mx-auto px-8 py-10 space-y-6">
        {/* OpenAPI Card */}
        <OpenAPICard
          isExpanded={expandedCards.has('openapi')}
          onToggle={() => toggleCard('openapi')}
          onSpecLoaded={handleSpecLoaded}
        />

        {/* Proxy Configuration Card */}
        <ProxyConfigCard
          isExpanded={expandedCards.has('proxy')}
          onToggle={() => canExpandProxy && toggleCard('proxy')}
          disabled={!canExpandProxy}
        />

        {/* API Products Card */}
        <ApiProductCard
          isExpanded={expandedCards.has('products')}
          onToggle={() => canExpandProducts && toggleCard('products')}
          disabled={!canExpandProducts}
        />

        {/* Target Servers Card */}
        <TargetServersCard
          isExpanded={expandedCards.has('targets')}
          onToggle={() => canExpandTargets && toggleCard('targets')}
          disabled={!canExpandTargets}
        />
      </main>

      {/* Export & Console Section */}
      <ConsolePanel
        messages={consoleMessages}
        onGenerate={handleGenerate}
        onDownloadZip={handleDownloadZip}
        onPushToAzure={handlePushToAzure}
        isGenerating={isGenerating}
        isPushing={isPushing}
        canGenerate={canGenerate}
        canDownload={canDownload}
        canPush={canPush}
      />

      {/* Azure Push Modal */}
      <AzurePushModal
        isOpen={isAzurePushModalOpen}
        onClose={() => setIsAzurePushModalOpen(false)}
        onPush={performPushToAzure}
        isPushing={isPushing}
      />
    </div>
  );
};
