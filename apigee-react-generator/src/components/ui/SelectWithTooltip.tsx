import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Sparkles, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SelectWithTooltipProps {
  tooltip: string;
  showSparkle?: boolean;
  children: React.ReactNode;
}

/**
 * Select wrapper that displays a help tooltip, optional sparkle icon,
 * and a custom chevron indicator.
 */
export const SelectWithTooltip: React.FC<SelectWithTooltipProps> = ({
  tooltip,
  showSparkle = false,
  children
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {children}
      <div className="absolute top-1/2 -translate-y-1/2 inline-flex items-center gap-1 right-0 pointer-events-none">
        {showSparkle && (
          <span className="inline-flex items-center pointer-events-auto">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 cursor-help" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="end"
                  collisionPadding={16}
                  className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1"
                >
                  {t('common.autoFilledFromSpec', 'Auto-filled from OpenAPI spec')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        )}
        <span className="inline-flex items-center pointer-events-auto">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 text-[var(--swiss-gray-400)] cursor-help hover:text-[var(--swiss-black)] transition-colors" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="end"
                collisionPadding={16}
                className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1 max-w-xs"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--swiss-gray-400)]" />
      </div>
    </div>
  );
};
