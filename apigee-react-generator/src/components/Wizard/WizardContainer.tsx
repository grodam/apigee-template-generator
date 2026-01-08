import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { Step1_ApiConfiguration } from '../Steps/Step1_ApiConfiguration';
import { Step2_OpenAPIEditor } from '../Steps/Step2_OpenAPIEditor';
import { Step3_EnvironmentConfig } from '../Steps/Step3_EnvironmentConfig';
import { Step4_Generation } from '../Steps/Step4_Generation';
import { Step5_AzureDevOps } from '../Steps/Step5_AzureDevOps';
import { Step6_Export } from '../Steps/Step6_Export';

const steps = [
  { id: 0, name: 'Configuration', labelKey: 'wizard.steps.configuration' },
  { id: 1, name: 'OpenAPI', labelKey: 'wizard.steps.openapi' },
  { id: 2, name: 'Environments', labelKey: 'wizard.steps.environments' },
  { id: 3, name: 'Generate', labelKey: 'wizard.steps.generate' },
  { id: 4, name: 'AzureDevOps', labelKey: 'wizard.steps.azureDevOps' },
  { id: 5, name: 'Export', labelKey: 'wizard.steps.export' }
];

export const WizardContainer: React.FC = () => {
  const { t } = useTranslation();
  const currentStep = useProjectStore(state => state.currentStep);
  const setCurrentStep = useProjectStore(state => state.setCurrentStep);
  const nextStep = useProjectStore(state => state.nextStep);
  const previousStep = useProjectStore(state => state.previousStep);
  const parsedOpenAPI = useProjectStore(state => state.parsedOpenAPI);
  const generatedProject = useProjectStore(state => state.generatedProject);

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  const handleTabChange = (value: string) => {
    const stepId = parseInt(value.replace('step', ''));
    if (!isNaN(stepId) && stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1_ApiConfiguration />;
      case 1:
        return <Step2_OpenAPIEditor />;
      case 2:
        return <Step3_EnvironmentConfig />;
      case 3:
        return <Step4_Generation />;
      case 4:
        return <Step5_AzureDevOps />;
      case 5:
        return <Step6_Export />;
      default:
        return <Step1_ApiConfiguration />;
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1: // OpenAPI step
        return parsedOpenAPI !== null;
      case 3: // Generation step
        return generatedProject !== null;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    nextStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousStep = () => {
    previousStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {t('wizard.progress', { current: currentStep + 1, total: totalSteps })}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            {Math.round(progress)}% {t('common.complete')}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Tabs Navigation */}
      <Tabs value={`step${currentStep}`} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 gap-1 h-10 bg-[var(--bg-tertiary)] p-1 rounded-lg">
          {steps.map((step) => (
            <TabsTrigger
              key={step.id}
              value={`step${step.id}`}
              disabled={step.id > currentStep}
              className="
                h-full
                data-[state=active]:bg-[var(--accent-500)]
                data-[state=active]:text-white
                data-[state=active]:shadow-sm
                data-[state=inactive]:text-[var(--text-muted)]
                data-[state=inactive]:hover:text-[var(--text-primary)]
                data-[state=inactive]:hover:bg-[var(--bg-primary)]
                disabled:opacity-40
                disabled:cursor-not-allowed
                rounded-md
                font-medium
                text-sm
                transition-all
                duration-150
              "
            >
              {t(step.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Step Content */}
        <TabsContent value={`step${currentStep}`} className="space-y-6">
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t border-[var(--border-subtle)]">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>

            {currentStep < totalSteps - 1 && (
              <Button
                onClick={handleNextStep}
                disabled={!canGoNext()}
              >
                {t('common.next')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
