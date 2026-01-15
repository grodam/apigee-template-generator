import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { SwissCard } from './SwissCard';
import { AuthorizedPathsEditor } from './AuthorizedPathsEditor';
import { ProductSuggestionsModal } from '../Modals/ProductSuggestionsModal';
import { HelpPanel } from '../Help/HelpPanel';
import { apiProductsHelpContent } from '../Help/helpContent';
import { useProjectStore } from '../../store/useProjectStore';
import { ENVIRONMENTS } from '../../utils/constants';
import type { Environment } from '../../utils/constants';
import type { ApiProduct } from '../../models/ApiConfiguration';
import { createProductForEnv, getDefaultAuthorizedPaths, extractGroupPrefix, findSmallestCommonRoot } from '../../utils/pathAnalyzer';
import { cn } from '@/lib/utils';
import { InputWithTooltip } from '@/components/ui/InputWithTooltip';

interface ApiProductCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const ApiProductCard: React.FC<ApiProductCardProps> = React.memo(({ isExpanded, onToggle, disabled }) => {
  const { t } = useTranslation();
  const {
    apiConfig,
    updateProduct,
    addProduct,
    removeProduct,
    generateProductsFromPaths,
    applySelectedSuggestions,
    suggestedProducts,
    parsedOpenAPI
  } = useProjectStore();

  const [selectedEnv, setSelectedEnv] = useState<Environment>('dev1');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedProductIndex, setExpandedProductIndex] = useState<number | null>(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const currentEnvConfig = apiConfig.environments?.[selectedEnv];
  const products = currentEnvConfig?.apiProducts || [];

  // Get suggested paths from OpenAPI for autocomplete (grouped by prefix like auto-generate)
  const suggestedPaths = React.useMemo(() => {
    if (!parsedOpenAPI?.rawSpec?.paths) return [];
    const paths = Object.keys(parsedOpenAPI.rawSpec.paths);

    // Start with the default/root paths (smallest common root)
    const suggestions: string[] = [];
    const commonRoot = findSmallestCommonRoot(paths);
    if (commonRoot && commonRoot !== '/') {
      suggestions.push(commonRoot);
      suggestions.push(`${commonRoot}/**`);
    }

    // Extract unique group prefixes (same logic as auto-generate)
    const prefixSet = new Set<string>();
    paths.forEach(p => {
      const prefix = extractGroupPrefix(p);
      // Only add if different from the common root
      if (prefix !== commonRoot) {
        prefixSet.add(prefix);
      }
    });

    // Add prefix and wildcard versions for each unique group
    Array.from(prefixSet).sort().forEach(prefix => {
      suggestions.push(prefix);
      suggestions.push(`${prefix}/**`);
    });

    return suggestions;
  }, [parsedOpenAPI]);

  // Ref for auto-resizing description textareas
  const descriptionRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  // Auto-resize textarea based on content (max 5 lines)
  const autoResizeTextarea = useCallback((index: number) => {
    const textarea = descriptionRefs.current.get(index);
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = 20;
    const maxLines = 5;
    const maxHeight = lineHeight * maxLines;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Check if a product is fully configured (all required fields filled)
  const isProductComplete = (product: ApiProduct) => {
    return !!(
      product?.name &&
      product?.displayName &&
      product?.description &&
      (product?.authorizedPaths?.length ?? 0) > 0
    );
  };

  // Check if an environment's products are fully configured
  const isEnvComplete = (env: Environment) => {
    const envConfig = apiConfig.environments?.[env];
    const envProducts = envConfig?.apiProducts || [];
    if (envProducts.length === 0) return false;
    return envProducts.every(isProductComplete);
  };

  // Calculate completion - count environments with ALL products fully configured
  const configuredEnvs = ENVIRONMENTS.filter(isEnvComplete);
  const completion = Math.round((configuredEnvs.length / ENVIRONMENTS.length) * 100);

  // Handle product field changes
  const handleProductChange = (productIndex: number, field: string, value: any) => {
    updateProduct(selectedEnv, productIndex, { [field]: value });
  };

  // Handle add new product
  const handleAddProduct = () => {
    const proxyName = apiConfig.proxyName || '';
    // Extract OpenAPI paths for computing default authorized paths
    const openAPIPaths = parsedOpenAPI?.rawSpec?.paths
      ? Object.keys(parsedOpenAPI.rawSpec.paths)
      : undefined;
    const newProduct = createProductForEnv(
      proxyName,
      `product-${products.length + 1}`,
      selectedEnv,
      undefined, // Let it use default from OpenAPI paths
      openAPIPaths
    );
    addProduct(selectedEnv, newProduct);
    setExpandedProductIndex(products.length);
  };

  // Handle remove product
  const handleRemoveProduct = (index: number) => {
    removeProduct(selectedEnv, index);
    if (expandedProductIndex === index) {
      setExpandedProductIndex(null);
    } else if (expandedProductIndex !== null && expandedProductIndex > index) {
      setExpandedProductIndex(expandedProductIndex - 1);
    }
  };

  // Handle auto-generate from OpenAPI
  const handleAutoGenerate = () => {
    generateProductsFromPaths();
    setIsModalOpen(true);
  };

  // Handle authorized paths change
  const handleAuthorizedPathsChange = (productIndex: number, paths: string[]) => {
    updateProduct(selectedEnv, productIndex, { authorizedPaths: paths });
  };

  // Collapsed preview - compact table
  const collapsedPreview = (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-[var(--swiss-gray-200)]">
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-20">Env</th>
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)]">Products</th>
          <th className="text-right py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-20">Count</th>
        </tr>
      </thead>
      <tbody>
        {ENVIRONMENTS.map((env) => {
          const envConfig = apiConfig.environments?.[env];
          const envProducts = envConfig?.apiProducts || [];
          const hasProducts = envProducts.length > 0 && envProducts[0]?.name;
          const envComplete = isEnvComplete(env);

          return (
            <tr key={env} className={cn(
              "border-b border-[var(--swiss-gray-100)]",
              !envComplete && "opacity-45"
            )}>
              <td className="py-2 font-mono font-bold">{env}</td>
              <td className="py-2 font-mono text-[var(--swiss-gray-600)]">
                {hasProducts ? (
                  envProducts.map(p => p.name).join(', ')
                ) : (
                  <span className="text-[var(--swiss-gray-300)]">Not configured</span>
                )}
              </td>
              <td className="py-2 text-right">
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-bold",
                  hasProducts ? "bg-[var(--swiss-black)] text-[var(--swiss-white)]" : "bg-[var(--swiss-gray-200)] text-[var(--swiss-gray-400)]"
                )}>
                  {hasProducts ? envProducts.length : 0}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
    <SwissCard
      number="03"
      title={t('canvas.cards.apiProduct.title', 'API Products')}
      subtitle={t('canvas.cards.apiProduct.subtitle', 'Multi-environment api products configuration')}
      completion={completion}
      isExpanded={isExpanded}
      onToggle={onToggle}
      collapsedPreview={collapsedPreview}
      disabled={disabled}
      onHelpClick={() => setIsHelpOpen(true)}
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

      {/* Products List */}
      <div className="space-y-4">
        {products.map((product, index) => (
          <div
            key={index}
            className={cn(
              "border-2 transition-all",
              expandedProductIndex === index
                ? "border-[var(--swiss-black)]"
                : "border-[var(--swiss-gray-200)] hover:border-[var(--swiss-gray-400)]"
            )}
          >
            {/* Product Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpandedProductIndex(expandedProductIndex === index ? null : index)}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-[var(--swiss-gray-400)]">
                  #{index + 1}
                </span>
                <span className="font-bold text-sm">{product.name || t('canvas.cards.apiProduct.unnamedProduct', 'Unnamed Product')}</span>
                {product.authorizedPaths && product.authorizedPaths.length > 0 && (
                  <span className="text-[10px] text-[var(--swiss-gray-400)]">
                    ({product.authorizedPaths.length} path{product.authorizedPaths.length !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveProduct(index);
                    }}
                    className="p-2 text-[var(--swiss-gray-400)] hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Remove product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <span className={cn(
                  "transition-transform",
                  expandedProductIndex === index ? "rotate-180" : ""
                )}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* Product Content */}
            {expandedProductIndex === index && (
              <div className="p-4 pt-0 space-y-6 border-t border-[var(--swiss-gray-200)]">
                <div className="grid grid-cols-2 gap-6 pt-4">
                  {/* Product Name */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                      {t('step3.apiProduct.name', 'Product Name')} <span className="swiss-badge-auto">AUTO</span>
                    </label>
                    <InputWithTooltip
                      tooltip={t('canvas.cards.apiProduct.productIdTooltip', 'The unique identifier for this API product in the environment')}
                      showSparkle={!!product.name}
                      sparkleTooltip={t('common.autoGeneratedFromProxy', 'Auto-generated from proxy name')}
                      rightOffset="small"
                    >
                      <input
                        value={product.name || ''}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
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
                      tooltip={t('canvas.cards.apiProduct.displayNameTooltip', 'The human-readable name shown in the developer portal')}
                      showSparkle={!!product.displayName}
                      sparkleTooltip={t('common.autoGeneratedFromProxy', 'Auto-generated from proxy name')}
                      rightOffset="small"
                    >
                      <input
                        value={product.displayName || ''}
                        onChange={(e) => handleProductChange(index, 'displayName', e.target.value)}
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
                    tooltip={t('step3.apiProduct.description', 'A description of this API product for developers')}
                    showSparkle={!!product.description}
                    sparkleTooltip={t('common.autoGeneratedFromProxy', 'Auto-generated from proxy name')}
                    rightOffset="small"
                  >
                    <textarea
                      ref={(el) => {
                        if (el) descriptionRefs.current.set(index, el);
                      }}
                      value={product.description || ''}
                      onChange={(e) => {
                        handleProductChange(index, 'description', e.target.value);
                        setTimeout(() => autoResizeTextarea(index), 0);
                      }}
                      placeholder={`API Product for ${apiConfig.businessObject || 'business-object'} ${apiConfig.version || 'v1'} - ${selectedEnv} environment`}
                      className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none resize-none pr-14 overflow-y-auto"
                      style={{ minHeight: '20px', maxHeight: '100px' }}
                    />
                  </InputWithTooltip>
                </div>

                {/* Authorized Paths */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                    {t('canvas.cards.apiProduct.authorizedPaths', 'Authorized Paths')}
                  </label>
                  <AuthorizedPathsEditor
                    paths={product.authorizedPaths || getDefaultAuthorizedPaths(
                      parsedOpenAPI?.rawSpec?.paths ? Object.keys(parsedOpenAPI.rawSpec.paths) : undefined
                    )}
                    onChange={(paths) => handleAuthorizedPathsChange(index, paths)}
                    suggestedPaths={suggestedPaths}
                  />
                </div>

                {/* Approval Type & Access */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                      {t('step3.apiProduct.approvalType', 'Approval Type')}
                    </label>
                    <InputWithTooltip tooltip={t('canvas.cards.apiProduct.approvalTypeTooltip', 'Auto: Developers can use immediately. Manual: Requires admin approval.')} rightOffset="select">
                      <select
                        value={product.approvalType || 'manual'}
                        onChange={(e) => handleProductChange(index, 'approvalType', e.target.value)}
                        className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-16"
                      >
                        <option value="auto">{t('step3.apiProduct.auto', 'Auto')}</option>
                        <option value="manual">{t('step3.apiProduct.manual', 'Manual')}</option>
                      </select>
                    </InputWithTooltip>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                      {t('canvas.cards.apiProduct.accessLevel', 'Access Level')}
                    </label>
                    <InputWithTooltip tooltip={t('canvas.cards.apiProduct.accessLevelTooltip', 'Private: Only specific apps. Public: All developers. Internal: Internal use only.')} rightOffset="select">
                      <select
                        value={product.attributes?.find(a => a.name === 'access')?.value || 'private'}
                        onChange={(e) => {
                          const newAttributes = [{ name: 'access', value: e.target.value }];
                          handleProductChange(index, 'attributes', newAttributes);
                        }}
                        className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-16"
                      >
                        <option value="private">{t('common.private', 'Private')}</option>
                        <option value="public">{t('common.public', 'Public')}</option>
                        <option value="internal">{t('common.internal', 'Internal')}</option>
                      </select>
                    </InputWithTooltip>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-8 text-[var(--swiss-gray-500)] border-2 border-dashed border-[var(--swiss-gray-200)]">
            {t('canvas.cards.apiProduct.noProductsConfigured', 'No products configured. Click "Add Product" to create one.')}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[var(--swiss-gray-200)]">
        <button
          type="button"
          onClick={handleAddProduct}
          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-600)] hover:text-[var(--swiss-black)] hover:bg-[var(--swiss-gray-100)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('canvas.cards.apiProduct.addProduct', 'Add Product')}
        </button>

        {parsedOpenAPI && (
          <button
            type="button"
            onClick={handleAutoGenerate}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--swiss-gray-600)] hover:text-[var(--swiss-black)] hover:bg-[var(--swiss-gray-100)] transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t('canvas.cards.apiProduct.autoGenerate', 'Auto-generate from OpenAPI')}
          </button>
        )}
      </div>

      {/* Product Suggestions Modal */}
      <ProductSuggestionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        suggestions={suggestedProducts}
        onApply={applySelectedSuggestions}
      />
    </SwissCard>

    {/* Help Panel */}
    <HelpPanel
      isOpen={isHelpOpen}
      onClose={() => setIsHelpOpen(false)}
      {...apiProductsHelpContent}
    />
    </>
  );
});
