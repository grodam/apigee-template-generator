import React, { useEffect } from 'react';
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
  { id: 0, name: 'Configuration', label: 'Configuration' },
  { id: 1, name: 'OpenAPI', label: 'OpenAPI' },
  { id: 2, name: 'Environments', label: 'Environments' },
  { id: 3, name: 'Generate', label: 'Generate' },
  { id: 4, name: 'AzureDevOps', label: 'Azure DevOps' },
  { id: 5, name: 'Export', label: 'Export' }
];

export const WizardContainer: React.FC = () => {
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
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="glass-panel rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="pill-badge text-sm font-semibold">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-[var(--text-secondary)] text-sm font-medium">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="soft-progress">
          <div
            className="soft-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={`step${currentStep}`} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className="glass-panel grid w-full grid-cols-6 p-1 gap-2 rounded-2xl">
          {steps.map((step) => (
            <TabsTrigger
              key={step.id}
              value={`step${step.id}`}
              disabled={step.id > currentStep}
              className="
                data-[state=active]:bg-gradient-to-br
                data-[state=active]:from-[var(--lavender-500)]
                data-[state=active]:to-[var(--lavender-600)]
                data-[state=active]:text-white
                data-[state=active]:shadow-lg
                data-[state=inactive]:text-[var(--text-secondary)]
                disabled:opacity-40
                disabled:cursor-not-allowed
                rounded-xl
                font-medium
                text-sm
                transition-all
                duration-200
                py-1
              "
            >
              {step.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Step Content */}
        <TabsContent value={`step${currentStep}`} className="space-y-8">
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStep === 0}
              className="
                soft-button secondary
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < totalSteps - 1 && (
              <Button
                onClick={handleNextStep}
                disabled={!canGoNext()}
                className="
                  soft-button
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
