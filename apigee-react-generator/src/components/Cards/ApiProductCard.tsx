import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SwissCard } from './SwissCard';
import { useProjectStore } from '../../store/useProjectStore';
import { ENVIRONMENTS } from '../../utils/constants';
import type { Environment } from '../../utils/constants';
import { cn } from '@/lib/utils';

// Input with tooltip helper component
const InputWithTooltip: React.FC<{
  tooltip: string;
  showSparkle?: boolean;
  isSelect?: boolean;
  children: React.ReactNode;
}> = ({ tooltip, showSparkle = false, isSelect = false, children }) => (
  <div className="relative">
    {children}
    <div className={cn(
      "absolute top-1/2 -translate-y-1/2 inline-flex items-center gap-1",
      isSelect ? "right-8" : "right-2"
    )}>
      {showSparkle && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 cursor-help" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" collisionPadding={16} className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1">
              Auto-generated from proxy name
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center">
              <HelpCircle className="h-3.5 w-3.5 text-[var(--swiss-gray-400)] cursor-help hover:text-[var(--swiss-black)] transition-colors" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="end" collisionPadding={16} className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1 max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
);

interface ApiProductCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const ApiProductCard: React.FC<ApiProductCardProps> = ({ isExpanded, onToggle, disabled }) => {
  const { t } = useTranslation();
  const { apiConfig, updateEnvironmentConfig } = useProjectStore();
  const [selectedEnv, setSelectedEnv] = useState<Environment>('dev1');

  const currentEnvConfig = apiConfig.environments?.[selectedEnv];
  const apiProduct = currentEnvConfig?.apiProducts?.[0];

  // Ref for auto-resizing description textarea
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content (max 5 lines)
  const autoResizeTextarea = useCallback(() => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate line height (approx 20px per line for text-sm)
    const lineHeight = 20;
    const maxLines = 5;
    const maxHeight = lineHeight * maxLines;

    // Set height based on content, capped at max
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Auto-resize on content change
  useEffect(() => {
    autoResizeTextarea();
  }, [apiProduct?.description, autoResizeTextarea]);

  // Calculate completion - count environments with configured API products
  const configuredEnvs = ENVIRONMENTS.filter(env => {
    const envConfig = apiConfig.environments?.[env];
    return envConfig?.apiProducts?.[0]?.name;
  });
  const completion = Math.round((configuredEnvs.length / ENVIRONMENTS.length) * 100);

  const handleProductChange = (field: string, value: any) => {
    if (!currentEnvConfig) return;

    const updatedProducts = currentEnvConfig.apiProducts?.length > 0
      ? [...currentEnvConfig.apiProducts]
      : [{
          name: '',
          displayName: '',
          description: '',
          approvalType: 'manual' as const,
          environments: [selectedEnv],
          attributes: [{ name: 'access', value: 'private' }]
        }];

    updatedProducts[0] = {
      ...updatedProducts[0],
      [field]: value
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      apiProducts: updatedProducts
    });
  };

  // Collapsed preview - compact table
  const collapsedPreview = (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-[var(--swiss-gray-200)]">
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-20">Env</th>
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)]">Product Name</th>
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)]">Display Name</th>
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-24">Approval</th>
          <th className="text-right py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-20">Status</th>
        </tr>
      </thead>
      <tbody>
        {ENVIRONMENTS.map((env) => {
          const envConfig = apiConfig.environments?.[env];
          const product = envConfig?.apiProducts?.[0];
          const hasProduct = !!product?.name;

          return (
            <tr key={env} className="border-b border-[var(--swiss-gray-100)]">
              <td className="py-2 font-mono font-bold">{env}</td>
              <td className="py-2 font-mono text-[var(--swiss-gray-600)]">
                {product?.name || <span className="text-[var(--swiss-gray-300)]">Not configured</span>}
              </td>
              <td className="py-2 font-mono text-[var(--swiss-gray-600)]">
                {product?.displayName || <span className="text-[var(--swiss-gray-300)]">-</span>}
              </td>
              <td className="py-2 font-mono">
                {product?.name ? (product.approvalType || 'manual') : <span className="text-[var(--swiss-gray-300)]">-</span>}
              </td>
              <td className="py-2 text-right">
                <span className={cn(
                  "w-2 h-2 inline-block",
                  hasProduct ? "bg-[var(--swiss-black)]" : "bg-[var(--swiss-gray-200)]"
                )} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <SwissCard
      number="03"
      title={t('canvas.cards.apiProduct.title', 'API Products')}
      subtitle={t('canvas.cards.apiProduct.subtitle', 'Product configuration per environment')}
      completion={completion}
      isExpanded={isExpanded}
      onToggle={onToggle}
      collapsedPreview={collapsedPreview}
      disabled={disabled}
    >
      {/* Environment Tabs */}
      <div className="flex border-b border-[var(--swiss-gray-200)] mb-6">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEnv(env);
            }}
            className={cn(
              "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
              selectedEnv === env
                ? "bg-[var(--swiss-black)] text-[var(--swiss-white)]"
                : "hover:bg-[var(--swiss-gray-50)] text-[var(--swiss-gray-500)]"
            )}
          >
            {env}
          </button>
        ))}
      </div>

      {/* Environment Content */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Product Name */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step3.apiProduct.name', 'Product Name')} <span className="swiss-badge-auto">AUTO</span>
            </label>
            <InputWithTooltip
              tooltip="The unique identifier for this API product in the environment"
              showSparkle={!!apiProduct?.name}
            >
              <input
                value={apiProduct?.name || ''}
                onChange={(e) => handleProductChange('name', e.target.value)}
                placeholder={`${apiConfig.proxyName || 'proxy-name'}.${selectedEnv}`}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-14"
              />
            </InputWithTooltip>
          </div>

          {/* Display Name */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step3.apiProduct.displayName', 'Display Name')} <span className="swiss-badge-auto">AUTO</span>
            </label>
            <InputWithTooltip
              tooltip="The human-readable name shown in the developer portal"
              showSparkle={!!apiProduct?.displayName}
            >
              <input
                value={apiProduct?.displayName || ''}
                onChange={(e) => handleProductChange('displayName', e.target.value)}
                placeholder={`${apiConfig.businessObject || 'business-object'}-${apiConfig.version || 'v1'}`}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-14"
              />
            </InputWithTooltip>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
            {t('step3.apiProduct.description', 'Description')} <span className="swiss-badge-auto">AUTO</span>
          </label>
          <InputWithTooltip
            tooltip="A description of this API product for developers"
            showSparkle={!!apiProduct?.description}
          >
            <textarea
              ref={descriptionRef}
              value={apiProduct?.description || ''}
              onChange={(e) => {
                handleProductChange('description', e.target.value);
                // Trigger resize after state update
                setTimeout(autoResizeTextarea, 0);
              }}
              placeholder={`API Product for ${apiConfig.businessObject || 'business-object'} ${apiConfig.version || 'v1'} - ${selectedEnv} environment`}
              className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none resize-none pr-14 overflow-y-auto"
              style={{ minHeight: '20px', maxHeight: '100px' }}
            />
          </InputWithTooltip>
        </div>

        {/* Approval Type & Access */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step3.apiProduct.approvalType', 'Approval Type')}
            </label>
            <InputWithTooltip tooltip="Auto: Developers can use immediately. Manual: Requires admin approval." isSelect>
              <select
                value={apiProduct?.approvalType || 'manual'}
                onChange={(e) => handleProductChange('approvalType', e.target.value)}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-16"
              >
                <option value="auto">{t('step3.apiProduct.auto', 'Auto')}</option>
                <option value="manual">{t('step3.apiProduct.manual', 'Manual')}</option>
              </select>
            </InputWithTooltip>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              Access Level
            </label>
            <InputWithTooltip tooltip="Private: Only specific apps. Public: All developers. Internal: Internal use only." isSelect>
              <select
                value={apiProduct?.attributes?.find(a => a.name === 'access')?.value || 'private'}
                onChange={(e) => {
                  const newAttributes = [{ name: 'access', value: e.target.value }];
                  handleProductChange('attributes', newAttributes);
                }}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-16"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="internal">Internal</option>
              </select>
            </InputWithTooltip>
          </div>
        </div>

      </div>
    </SwissCard>
  );
};
