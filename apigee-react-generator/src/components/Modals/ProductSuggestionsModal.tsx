import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Package, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SuggestedProduct } from '../../utils/pathAnalyzer';

interface ProductSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SuggestedProduct[];
  onApply: (selectedProducts: SuggestedProduct[]) => void;
}

export const ProductSuggestionsModal: React.FC<ProductSuggestionsModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  onApply
}) => {
  const { t } = useTranslation();
  const [localSuggestions, setLocalSuggestions] = useState<SuggestedProduct[]>([]);

  // Sync local state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSuggestions(suggestions.map(s => ({ ...s, selected: true })));
    }
  }, [isOpen, suggestions]);

  const handleToggle = (id: string) => {
    setLocalSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s)
    );
  };

  const handleSelectAll = () => {
    const allSelected = localSuggestions.every(s => s.selected);
    setLocalSuggestions(prev =>
      prev.map(s => ({ ...s, selected: !allSelected }))
    );
  };

  const handleApply = () => {
    onApply(localSuggestions);
    onClose();
  };

  const selectedCount = localSuggestions.filter(s => s.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-[var(--swiss-white)] border-2 border-[var(--swiss-black)] rounded-none overflow-hidden flex flex-col max-h-[85vh] shadow-none">
        {/* Swiss Header */}
        <DialogHeader className="px-6 py-5 border-b-2 border-[var(--swiss-black)] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--swiss-black)] text-[var(--swiss-white)] flex items-center justify-center">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase tracking-wide text-[var(--swiss-black)]">
                {t('canvas.cards.apiProduct.suggestionsModal.title', 'Suggested Products')}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--swiss-gray-500)] font-mono mt-1">
                {t('canvas.cards.apiProduct.suggestionsModal.description', 'Based on your OpenAPI specification, we suggest the following products:')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 swiss-scroll">
          {/* Select All Bar */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--swiss-gray-200)]">
            <span className="text-xs text-[var(--swiss-gray-500)]">
              {t('canvas.cards.apiProduct.suggestionsModal.selectedCount', '{{selected}} of {{total}} selected', { selected: selectedCount, total: localSuggestions.length })}
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-black)] hover:text-[var(--swiss-gray-600)] transition-colors"
            >
              {localSuggestions.every(s => s.selected)
                ? t('canvas.cards.apiProduct.suggestionsModal.deselectAll', 'Deselect All')
                : t('canvas.cards.apiProduct.suggestionsModal.selectAll', 'Select All')
              }
            </button>
          </div>

          {/* Suggestions List */}
          <div className="space-y-3">
            {localSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={cn(
                  "border-2 p-4 cursor-pointer transition-colors",
                  suggestion.selected
                    ? "border-[var(--swiss-black)] bg-[var(--swiss-gray-50)]"
                    : "border-[var(--swiss-gray-200)] hover:border-[var(--swiss-gray-400)]"
                )}
                onClick={() => handleToggle(suggestion.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Swiss Checkbox */}
                  <div className={cn(
                    "w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5",
                    suggestion.selected
                      ? "bg-[var(--swiss-black)] border-[var(--swiss-black)]"
                      : "border-[var(--swiss-gray-300)] bg-[var(--swiss-white)]"
                  )}>
                    {suggestion.selected && <Check className="h-3 w-3 text-[var(--swiss-white)]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Package className="h-4 w-4 text-[var(--swiss-gray-400)] flex-shrink-0" />
                      <span className="font-bold text-sm text-[var(--swiss-black)]">
                        {suggestion.displayName}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--swiss-gray-500)] bg-[var(--swiss-gray-100)] px-2 py-0.5">
                        {suggestion.name}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--swiss-gray-500)] mb-2">
                      {t('canvas.cards.apiProduct.suggestionsModal.pathPrefix', 'Path prefix:')} <span className="font-mono">{suggestion.pathPrefix}</span>
                    </div>

                    {/* Authorized Paths */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {suggestion.authorizedPaths.map((path) => (
                        <span
                          key={path}
                          className="px-2 py-0.5 text-[10px] font-mono bg-[var(--swiss-gray-100)] text-[var(--swiss-gray-600)]"
                        >
                          {path}
                        </span>
                      ))}
                    </div>

                    {/* Methods */}
                    <div className="flex gap-1 flex-wrap">
                      {suggestion.methods.map((method) => (
                        <span
                          key={method}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold uppercase",
                            method.toLowerCase() === 'get' && "bg-green-100 text-green-700",
                            method.toLowerCase() === 'post' && "bg-blue-100 text-blue-700",
                            method.toLowerCase() === 'put' && "bg-yellow-100 text-yellow-700",
                            method.toLowerCase() === 'patch' && "bg-orange-100 text-orange-700",
                            method.toLowerCase() === 'delete' && "bg-red-100 text-red-700"
                          )}
                        >
                          {method.toUpperCase()}
                        </span>
                      ))}
                    </div>

                    {/* Paths count */}
                    <div className="text-[10px] text-[var(--swiss-gray-400)] mt-2">
                      {t('canvas.cards.apiProduct.suggestionsModal.endpointsCount', '{{count}} endpoint(s) in this group', { count: suggestion.paths.length })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {localSuggestions.length === 0 && (
            <div className="text-center py-8 text-[var(--swiss-gray-500)]">
              {t('canvas.cards.apiProduct.suggestionsModal.noSuggestions', 'No product suggestions available')}
            </div>
          )}
        </div>

        {/* Swiss Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-[var(--swiss-black)] bg-[var(--swiss-gray-50)] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--swiss-gray-600)] hover:text-[var(--swiss-black)] transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={selectedCount === 0}
            className={cn(
              "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors",
              selectedCount > 0
                ? "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
                : "bg-[var(--swiss-gray-300)] text-[var(--swiss-gray-500)] cursor-not-allowed"
            )}
          >
            {t('canvas.cards.apiProduct.suggestionsModal.applySelected', 'Apply Selected')} ({selectedCount})
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSuggestionsModal;
