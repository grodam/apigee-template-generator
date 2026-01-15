import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InputWithTooltipProps {
  tooltip: string;
  showSparkle?: boolean;
  sparkleTooltip?: string;
  rightOffset?: 'none' | 'small' | 'select';
  children: React.ReactNode;
}

/**
 * Input wrapper that displays a help tooltip and optional sparkle icon
 * indicating auto-filled or auto-generated content.
 */
export const InputWithTooltip: React.FC<InputWithTooltipProps> = ({
  tooltip,
  showSparkle = false,
  sparkleTooltip,
  rightOffset = 'none',
  children
}) => {
  const { t } = useTranslation();

  const offsetClass = {
    none: 'right-0',
    small: 'right-2',
    select: 'right-8'
  }[rightOffset];

  const defaultSparkleTooltip = t('common.autoFilledFromSpec', 'Auto-filled from OpenAPI spec');

  return (
    <div className="relative">
      {children}
      <div className={cn("absolute top-1/2 -translate-y-1/2 inline-flex items-center gap-1", offsetClass)}>
        {showSparkle && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center pointer-events-auto">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 cursor-help" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="end"
                collisionPadding={16}
                className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1"
              >
                {sparkleTooltip || defaultSparkleTooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center pointer-events-auto">
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
      </div>
    </div>
  );
};
