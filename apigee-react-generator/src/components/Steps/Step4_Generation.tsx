import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Play, Sparkles } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { ApigeeProjectGenerator } from '../../services/generators/ApigeeGenerator';

export const Step4_Generation: React.FC = () => {
  const { t } = useTranslation();
  const {
    getCompleteConfig,
    parsedOpenAPI,
    setGeneratedProject,
    azureDevOpsConfig,
    portalConfig,
  } = useProjectStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  const config = getCompleteConfig();
  const isConfigComplete = !!config;
  const isOpenAPIComplete = !!parsedOpenAPI;

  const handleGenerate = async () => {
    const config = getCompleteConfig();

    if (!config && !parsedOpenAPI) {
      setError(t('step4.errors.both'));
      return;
    }

    if (!config) {
      setError(t('step4.errors.configIncomplete'));
      return;
    }

    if (!parsedOpenAPI) {
      setError(t('step4.errors.openApiMissing'));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationSteps([]);
    setIsComplete(false);
    setProgress(0);

    try {
      const generator = new ApigeeProjectGenerator(config, parsedOpenAPI.rawSpec, azureDevOpsConfig, portalConfig);

      const steps = [
        { message: t('step4.steps.initializing'), delay: 100, progress: 10 },
        { message: t('step4.steps.eclipse'), delay: 300, progress: 20 },
        { message: t('step4.steps.maven'), delay: 500, progress: 35 },
        { message: t('step4.steps.proxyConfig'), delay: 700, progress: 50 },
        { message: t('step4.steps.flows'), delay: 1000, progress: 65 },
        { message: t('step4.steps.policies'), delay: 1300, progress: 75 },
        { message: t('step4.steps.targetEndpoints'), delay: 1600, progress: 85 },
        { message: t('step4.steps.envConfig'), delay: 2000, progress: 95 },
        { message: t('step4.steps.finalizing'), delay: 2300, progress: 99 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay - (steps[steps.indexOf(step) - 1]?.delay || 0)));
        setGenerationSteps(prev => [...prev, step.message]);
        setProgress(step.progress);
      }

      const project = await generator.generate();

      setGeneratedProject(project);
      setGenerationSteps(prev => [...prev, t('step4.steps.complete')]);
      setProgress(100);
      setIsComplete(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation');
      setGenerationSteps(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('step4.title')}</h1>
        <p className="text-[var(--text-secondary)] text-lg">{t('step4.subtitle')}</p>
      </div>

      <div className="soft-card">
        {!isGenerating && !isComplete && (
          <div className="space-y-8">
            {/* Checklist Section */}
            <div className="space-y-6">
              <div className="section-header">
                <div className="icon">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3>{t('step4.checklist.title')}</h3>
              </div>

              <div className="space-y-4 pl-4">
                <div className="flex items-center gap-3 soft-stagger">
                  {isConfigComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--mint-base)] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[var(--error-base)] flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isConfigComplete ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-tertiary)]'}`}>
                    {t('step4.checklist.apiConfig')}
                  </span>
                </div>
                <div className="flex items-center gap-3 soft-stagger">
                  {isOpenAPIComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--mint-base)] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[var(--error-base)] flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isOpenAPIComplete ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-tertiary)]'}`}>
                    {t('step4.checklist.openApiSpec')}
                  </span>
                </div>
              </div>
            </div>

            {/* Generation Button Section */}
            <div className="text-center py-12 border-t border-[var(--border-light)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                {isConfigComplete && isOpenAPIComplete
                  ? t('step4.ready.title')
                  : t('step4.notReady.title')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-8">
                {isConfigComplete && isOpenAPIComplete
                  ? t('step4.ready.description')
                  : t('step4.notReady.description')}
              </p>
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!isConfigComplete || !isOpenAPIComplete}
                className="soft-button px-8 py-6 text-base"
              >
                <Play className="mr-2 h-5 w-5" />
                {t('step4.button')}
              </Button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-6">
            <div className="section-header">
              <div className="icon">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <h3>{t('step4.generating')}</h3>
            </div>

            <div className="soft-progress">
              <div
                className="soft-progress-bar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="space-y-3 pl-4">
              {generationSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 soft-stagger">
                  <CheckCircle2 className="h-4 w-4 text-[var(--mint-base)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)]">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isComplete && !isGenerating && (
          <div className="space-y-6">
            <Alert className="soft-alert success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">
                {t('step4.success')}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {generationSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 soft-stagger">
                  <CheckCircle2 className="h-4 w-4 text-[var(--mint-base)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)]">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert className="soft-alert error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
