import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Play, Sparkles } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { ApigeeProjectGenerator } from '../../services/generators/ApigeeGenerator';

export const Step4_Generation: React.FC = () => {
  const {
    getCompleteConfig,
    parsedOpenAPI,
    setGeneratedProject,
    azureDevOpsConfig,
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
      setError('Please complete the API configuration in Step 1 and upload/validate your OpenAPI specification in Step 2');
      return;
    }

    if (!config) {
      setError('API configuration is incomplete. Please fill in all required fields in Step 1 (Configuration)');
      return;
    }

    if (!parsedOpenAPI) {
      setError('OpenAPI specification is missing. Please upload and validate your OpenAPI spec in Step 2 (OpenAPI)');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationSteps([]);
    setIsComplete(false);
    setProgress(0);

    try {
      const generator = new ApigeeProjectGenerator(config, parsedOpenAPI.rawSpec, azureDevOpsConfig);

      const steps = [
        { message: 'Initializing generation...', delay: 100, progress: 10 },
        { message: 'Generating Eclipse files...', delay: 300, progress: 20 },
        { message: 'Generating Maven POMs...', delay: 500, progress: 35 },
        { message: 'Generating proxy configuration...', delay: 700, progress: 50 },
        { message: 'Generating flows from OpenAPI...', delay: 1000, progress: 65 },
        { message: 'Generating policies...', delay: 1300, progress: 75 },
        { message: 'Generating target endpoints...', delay: 1600, progress: 85 },
        { message: 'Generating environment configurations...', delay: 2000, progress: 95 },
        { message: 'Finalizing project structure...', delay: 2300, progress: 99 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay - (steps[steps.indexOf(step) - 1]?.delay || 0)));
        setGenerationSteps(prev => [...prev, step.message]);
        setProgress(step.progress);
      }

      const project = await generator.generate();

      setGeneratedProject(project);
      setGenerationSteps(prev => [...prev, 'Generation complete!']);
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
        <h1 className="text-3xl font-bold mb-2">Generate Apigee Project</h1>
        <p className="text-[var(--text-secondary)] text-lg">Generate the complete Apigee proxy bundle</p>
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
                <h3>Pre-generation Checklist</h3>
              </div>

              <div className="space-y-4 pl-4">
                <div className="flex items-center gap-3 soft-stagger">
                  {isConfigComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--mint-base)] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[var(--error-base)] flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isConfigComplete ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-tertiary)]'}`}>
                    API Configuration (Step 1)
                  </span>
                </div>
                <div className="flex items-center gap-3 soft-stagger">
                  {isOpenAPIComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--mint-base)] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[var(--error-base)] flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isOpenAPIComplete ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-tertiary)]'}`}>
                    OpenAPI Specification (Step 2)
                  </span>
                </div>
              </div>
            </div>

            {/* Generation Button Section */}
            <div className="text-center py-12 border-t border-[var(--border-light)]">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                {isConfigComplete && isOpenAPIComplete
                  ? 'Ready to generate your Apigee proxy'
                  : 'Complete the checklist to enable generation'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-8">
                {isConfigComplete && isOpenAPIComplete
                  ? 'Click the button below to generate the complete project structure'
                  : 'Please complete all required steps before generating'}
              </p>
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!isConfigComplete || !isOpenAPIComplete}
                className="soft-button px-8 py-6 text-base"
              >
                <Play className="mr-2 h-5 w-5" />
                Generate Project
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
              <h3>Generating...</h3>
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
                Project generated successfully!
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
