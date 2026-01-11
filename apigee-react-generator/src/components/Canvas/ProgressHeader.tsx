import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  id: string;
  label: string;
  status: 'complete' | 'partial' | 'empty';
}

interface ProgressHeaderProps {
  steps: ProgressStep[];
  overallProgress: number;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  steps,
  overallProgress,
}) => {
  const { t } = useTranslation();

  return (
    <section className="bg-[var(--swiss-white)] border-b border-[var(--swiss-gray-200)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Progress Label and Percentage */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--swiss-gray-400)]">
            {t('canvas.progress.title', 'Configuration Progress')}
          </span>
          <span className="text-2xl font-black text-[var(--swiss-black)]">
            {overallProgress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-[2px] bg-[var(--swiss-gray-100)] mb-4">
          <div
            className="h-full bg-[var(--swiss-black)] transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex gap-8">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "w-4 h-4 flex items-center justify-center text-[10px] font-bold",
                  step.status === 'complete' && "bg-[var(--swiss-black)] text-[var(--swiss-white)]",
                  step.status === 'partial' && "bg-[var(--swiss-white)] border-2 border-[var(--swiss-black)]",
                  step.status === 'empty' && "bg-[var(--swiss-white)] border border-[var(--swiss-gray-300)] text-[var(--swiss-gray-300)]"
                )}
              >
                {step.status === 'complete' ? (
                  <Check className="w-3 h-3" />
                ) : step.status === 'partial' ? (
                  <span className="w-1.5 h-1.5 bg-[var(--swiss-black)] rounded-full" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-[var(--swiss-gray-300)] rounded-full" />
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  step.status === 'empty' && "text-[var(--swiss-gray-400)]"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
