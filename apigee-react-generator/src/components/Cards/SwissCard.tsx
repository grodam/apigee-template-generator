import { ChevronRight, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SwissCardProps {
  number: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  completion?: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  collapsedPreview?: ReactNode;
  disabled?: boolean;
  onHelpClick?: () => void;
}

export const SwissCard: React.FC<SwissCardProps> = ({
  number,
  title,
  subtitle,
  badge,
  completion,
  isExpanded,
  onToggle,
  children,
  collapsedPreview,
  disabled = false,
  onHelpClick,
}) => {
  return (
    <article
      className={cn(
        "bg-[var(--swiss-white)] border-t-2 swiss-card-shadow",
        disabled
          ? "border-[var(--swiss-gray-300)] opacity-60"
          : "border-[var(--swiss-black)]",
        !disabled && !isExpanded && "hover:bg-[var(--swiss-gray-50)]"
      )}
    >
      {/* Header - Always visible */}
      <div
        className={cn(
          "flex items-center justify-between px-6 py-5",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
        onClick={disabled ? undefined : onToggle}
      >
        <div className="flex items-center gap-6">
          <span className="text-3xl font-black text-[var(--swiss-gray-200)] font-sans">
            {number}
          </span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-[var(--swiss-black)]">
              {title}
            </h2>
            {subtitle && (
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-[var(--swiss-gray-500)] font-mono">{subtitle}</p>
                {badge}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {completion !== undefined && (
            <div className="text-right">
              <span className="text-[10px] text-[var(--swiss-gray-400)] uppercase font-bold">
                Completion
              </span>
              <p className="text-lg font-black text-[var(--swiss-black)]">
                {completion}%
              </p>
            </div>
          )}
          {onHelpClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHelpClick();
              }}
              className={cn(
                "p-2 hover:bg-[var(--swiss-gray-100)] transition-colors rounded",
                disabled && "pointer-events-none opacity-50"
              )}
              title="Aide"
            >
              <HelpCircle className="w-5 h-5 text-[var(--swiss-gray-400)] hover:text-[var(--swiss-black)]" />
            </button>
          )}
          <ChevronRight
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
        </div>
      </div>

      {/* Collapsed Preview - Visible when collapsed */}
      {!isExpanded && collapsedPreview && (
        <div className="px-6 pb-4">
          {collapsedPreview}
        </div>
      )}

      {/* Expandable Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[2000px]" : "max-h-0"
        )}
      >
        <div className="px-6 pb-6 border-t border-[var(--swiss-gray-100)]">
          <div className="pt-6">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
};
