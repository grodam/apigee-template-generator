import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Sparkles, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SwissCard } from './SwissCard';
import { HelpPanel } from '../Help/HelpPanel';
import { proxyConfigHelpContent } from '../Help/helpContent';
import { useProjectStore } from '../../store/useProjectStore';
import { cn } from '@/lib/utils';

// Input with tooltip helper component
const InputWithTooltip: React.FC<{
  tooltip: string;
  showSparkle?: boolean;
  children: React.ReactNode;
}> = ({ tooltip, showSparkle = false, children }) => (
  <div className="relative">
    {children}
    <div className="absolute top-1/2 -translate-y-1/2 inline-flex items-center gap-1 right-0">
      {showSparkle && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center pointer-events-auto">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 cursor-help" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" collisionPadding={16} className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1">
              Auto-filled from OpenAPI spec
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
          <TooltipContent side="top" align="end" collisionPadding={16} className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1 max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
);

// Select with tooltip helper component (with custom chevron)
const SelectWithTooltip: React.FC<{
  tooltip: string;
  showSparkle?: boolean;
  children: React.ReactNode;
}> = ({ tooltip, showSparkle = false, children }) => (
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
              <TooltipContent side="top" align="end" collisionPadding={16} className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1">
                Auto-filled from OpenAPI spec
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
            <TooltipContent side="top" align="end" collisionPadding={16} className="bg-[var(--swiss-black)] text-[var(--swiss-white)] text-xs px-2 py-1 max-w-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
      <ChevronDown className="h-4 w-4 text-[var(--swiss-gray-400)]" />
    </div>
  </div>
);

// Validation schemas
const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/;
const pathKebabCaseRegex = /^\/([a-z][a-z0-9]*(-[a-z][a-z0-9]*)*)(\/[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*)*$/;

const apiConfigSchema = z.object({
  entity: z.enum(['elis', 'ext']),
  domain: z.string().min(1).regex(kebabCaseRegex),
  backendApps: z.string().min(1).regex(/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/),
  businessObject: z.string().min(1).regex(kebabCaseRegex),
  version: z.string().regex(/^v[0-9]+$/),
  proxyBasepath: z.string().min(1).regex(pathKebabCaseRegex),
  authSouthbound: z.enum(['Basic', 'OAuth2-ClientCredentials', 'ApiKey', 'None']),
  globalRateLimit: z.string()
    .regex(/^[0-9]+(pm|ps)$/, 'Format: {number}pm or {number}ps')
    .optional()
    .or(z.literal('')),
});

type ApiConfigFormData = z.infer<typeof apiConfigSchema>;

interface ProxyConfigCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const ProxyConfigCard: React.FC<ProxyConfigCardProps> = ({ isExpanded, onToggle, disabled }) => {
  const { t } = useTranslation();
  const { apiConfig, updateApiConfig, autoDetectedConfig, applyAutoDetectedConfig } = useProjectStore();

  // Help panel state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Track which fields were auto-filled from OpenAPI spec
  const [autoFilledFields, setAutoFilledFields] = React.useState<Set<string>>(new Set());

  const { control, watch, setValue, reset, formState: { errors } } = useForm<ApiConfigFormData>({
    resolver: zodResolver(apiConfigSchema),
    mode: 'onChange',
    defaultValues: {
      entity: (apiConfig.entity as 'elis' | 'ext') || 'elis',
      domain: apiConfig.domain || '',
      backendApps: apiConfig.backendApps?.join('-') || '',
      businessObject: apiConfig.businessObject || '',
      version: apiConfig.version || '',
      proxyBasepath: apiConfig.proxyBasepath || '',
      authSouthbound: apiConfig.authSouthbound || 'Basic',
      globalRateLimit: apiConfig.globalRateLimit || '100pm',
    }
  });

  const entity = watch('entity');
  const domain = watch('domain');
  const backendApps = watch('backendApps');
  const businessObject = watch('businessObject');
  const version = watch('version');
  const proxyBasepath = watch('proxyBasepath');

  const proxyName = entity && domain && backendApps && businessObject && version
    ? `${entity}.${domain}.${backendApps}.${businessObject}.${version}`
    : '';

  // Auto-generate proxyBasepath from businessObject and version
  // Format: /{businessObject}/{version}
  useEffect(() => {
    if (businessObject && version) {
      const generatedBasepath = `/${businessObject}/${version}`;
      // Only auto-update if the field is empty or matches the previous auto-generated pattern
      const currentBasepath = proxyBasepath || '';
      const isAutoGenerated = !currentBasepath || /^\/[a-z][a-z0-9-]*\/v[0-9]+$/.test(currentBasepath);
      if (isAutoGenerated && currentBasepath !== generatedBasepath) {
        setValue('proxyBasepath', generatedBasepath, { shouldValidate: true });
        setAutoFilledFields(prev => new Set([...prev, 'proxyBasepath']));
      }
    }
  }, [businessObject, version, proxyBasepath, setValue]);

  // Reset form when apiConfig is cleared (new spec loaded)
  useEffect(() => {
    if (!apiConfig.entity && !apiConfig.domain && !apiConfig.businessObject) {
      reset({
        entity: 'elis',
        domain: '',
        backendApps: '',
        businessObject: '',
        version: '',
        proxyBasepath: '',
        authSouthbound: 'Basic',
        globalRateLimit: '100pm',
      });
      setAutoFilledFields(new Set());
    }
  }, [apiConfig.entity, apiConfig.domain, apiConfig.businessObject, reset]);

  // Apply auto-detected values when autoDetectedConfig changes
  useEffect(() => {
    if (autoDetectedConfig) {
      const newAutoFilled = new Set<string>();

      if (autoDetectedConfig.auth.type) {
        setValue('authSouthbound', autoDetectedConfig.auth.type, { shouldValidate: true });
        newAutoFilled.add('authSouthbound');
      }

      setAutoFilledFields(newAutoFilled);
      applyAutoDetectedConfig();
    }
  }, [autoDetectedConfig, setValue, applyAutoDetectedConfig]);

  // Update store on field changes
  useEffect(() => {
    const subscription = watch((formData) => {
      const backendAppsArray = formData.backendApps ? formData.backendApps.split('-').filter(Boolean) : [];
      updateApiConfig({
        entity: (formData.entity as 'elis' | 'ext') || 'elis',
        domain: formData.domain || '',
        backendApps: backendAppsArray,
        businessObject: formData.businessObject || '',
        version: formData.version || '',
        proxyBasepath: formData.proxyBasepath || '',
        authSouthbound: formData.authSouthbound || 'Basic',
        globalRateLimit: formData.globalRateLimit || '',
        oasFormat: apiConfig.oasFormat || 'json',
        oasVersion: apiConfig.oasVersion || '3.0.0',
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, updateApiConfig, apiConfig.oasFormat, apiConfig.oasVersion]);

  // Calculate completion
  const requiredFields = ['entity', 'domain', 'backendApps', 'businessObject', 'version', 'proxyBasepath', 'authSouthbound'];
  const filledFields = requiredFields.filter(field => {
    const value = watch(field as keyof ApiConfigFormData);
    return value && value.toString().length > 0;
  });
  const completion = Math.round((filledFields.length / requiredFields.length) * 100);

  // Auth badge
  const authBadge = apiConfig.authSouthbound ? (
    <span className="text-[9px] px-2 py-0.5 bg-[var(--swiss-gray-100)] uppercase font-bold">
      {apiConfig.authSouthbound}
    </span>
  ) : null;

  return (
    <>
    <SwissCard
      number="02"
      title={t('canvas.cards.proxy.title', 'API Proxy')}
      subtitle={proxyName || undefined}
      badge={authBadge}
      completion={completion}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
      onHelpClick={() => setIsHelpOpen(true)}
    >
      <div className="space-y-8">
        {/* Naming Convention Section */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--swiss-gray-400)] mb-4 pb-2 border-b border-[var(--swiss-gray-100)]">
            {t('step1.sections.proxyNaming', 'Naming Convention')}
          </h3>
          <div className="grid grid-cols-5 gap-4 mb-4">
            {/* Entity */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('step1.fields.entity.label')}
              </label>
              <Controller
                name="entity"
                control={control}
                render={({ field }) => (
                  <SelectWithTooltip tooltip={t('step1.fields.entity.tooltip')}>
                    <select
                      {...field}
                      className={cn(
                        "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none pr-14 appearance-none cursor-pointer",
                        errors.entity ? "border-red-500" : "border-[var(--swiss-black)]"
                      )}
                    >
                      <option value="elis">elis</option>
                      <option value="ext">ext</option>
                    </select>
                  </SelectWithTooltip>
                )}
              />
            </div>

            {/* Domain */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('step1.fields.domain.label')}
              </label>
              <Controller
                name="domain"
                control={control}
                render={({ field }) => (
                  <InputWithTooltip tooltip={t('step1.fields.domain.tooltip')}>
                    <input
                      {...field}
                      placeholder={t('step1.fields.domain.placeholder')}
                      className={cn(
                        "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none pr-8",
                        errors.domain ? "border-red-500" : "border-[var(--swiss-black)]"
                      )}
                    />
                  </InputWithTooltip>
                )}
              />
            </div>

            {/* Backend Apps */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('step1.fields.backendApps.label')}
              </label>
              <Controller
                name="backendApps"
                control={control}
                render={({ field }) => (
                  <InputWithTooltip tooltip={t('step1.fields.backendApps.tooltip')}>
                    <input
                      {...field}
                      placeholder={t('step1.fields.backendApps.placeholder')}
                      className={cn(
                        "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none pr-8",
                        errors.backendApps ? "border-red-500" : "border-[var(--swiss-black)]"
                      )}
                    />
                  </InputWithTooltip>
                )}
              />
            </div>

            {/* Business Object */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('step1.fields.businessObject.label')}
              </label>
              <Controller
                name="businessObject"
                control={control}
                render={({ field }) => (
                  <InputWithTooltip tooltip={t('step1.fields.businessObject.tooltip')}>
                    <input
                      {...field}
                      placeholder={t('step1.fields.businessObject.placeholder')}
                      className={cn(
                        "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none pr-8",
                        errors.businessObject ? "border-red-500" : "border-[var(--swiss-black)]"
                      )}
                    />
                  </InputWithTooltip>
                )}
              />
            </div>

            {/* Version */}
            <div>
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                {t('step1.fields.version.label')}
              </label>
              <Controller
                name="version"
                control={control}
                render={({ field }) => (
                  <InputWithTooltip tooltip={t('step1.fields.version.tooltip')}>
                    <input
                      {...field}
                      placeholder={t('step1.fields.version.placeholder')}
                      className={cn(
                        "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none pr-8",
                        errors.version ? "border-red-500" : "border-[var(--swiss-black)]"
                      )}
                    />
                  </InputWithTooltip>
                )}
              />
            </div>
          </div>

          {/* Generated Proxy Name Preview */}
          {proxyName && (
            <div className="bg-[var(--swiss-gray-50)] p-4 border-l-4 border-[var(--swiss-black)]">
              <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase mb-1">
                Generated Proxy Name
              </p>
              <p className="text-lg font-black font-mono tracking-tight">{proxyName}</p>
            </div>
          )}
        </div>

        {/* Base Path & Auth */}
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step1.fields.proxyBasepath.label')} <span className="swiss-badge-auto">AUTO</span>
            </label>
            <Controller
              name="proxyBasepath"
              control={control}
              render={({ field }) => (
                <InputWithTooltip
                  tooltip={t('step1.fields.proxyBasepath.tooltip')}
                  showSparkle={autoFilledFields.has('proxyBasepath')}
                >
                  <input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // When user manually edits, remove from auto-filled
                      setAutoFilledFields(prev => {
                        const next = new Set(prev);
                        next.delete('proxyBasepath');
                        return next;
                      });
                    }}
                    placeholder={t('step1.fields.proxyBasepath.placeholder')}
                    className={cn(
                      "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none pr-8",
                      errors.proxyBasepath ? "border-red-500" : "border-[var(--swiss-black)]"
                    )}
                  />
                </InputWithTooltip>
              )}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step1.fields.authSouthbound.label')}
            </label>
            <Controller
              name="authSouthbound"
              control={control}
              render={({ field }) => (
                <SelectWithTooltip
                  tooltip={t('step1.fields.authSouthbound.tooltip')}
                  showSparkle={autoFilledFields.has('authSouthbound')}
                >
                  <select
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setAutoFilledFields(prev => {
                        const next = new Set(prev);
                        next.delete('authSouthbound');
                        return next;
                      });
                    }}
                    className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-14 appearance-none cursor-pointer"
                  >
                    <option value="None">{t('step1.fields.authSouthbound.options.none')}</option>
                    <option value="Basic">{t('step1.fields.authSouthbound.options.basic')}</option>
                    <option value="OAuth2-ClientCredentials">{t('step1.fields.authSouthbound.options.oauth2')}</option>
                    <option value="ApiKey">{t('step1.fields.authSouthbound.options.apikey', 'API Key')}</option>
                  </select>
                </SelectWithTooltip>
              )}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step1.fields.globalRateLimit.label')}
            </label>
            <Controller
              name="globalRateLimit"
              control={control}
              render={({ field }) => (
                <InputWithTooltip tooltip={t('step1.fields.globalRateLimit.tooltip')}>
                  <input
                    {...field}
                    placeholder={t('step1.fields.globalRateLimit.placeholder')}
                    className={cn(
                      "w-full bg-transparent border-b-2 py-2 text-sm font-medium font-mono focus:outline-none pr-8",
                      errors.globalRateLimit ? "border-red-500" : "border-[var(--swiss-black)]"
                    )}
                  />
                </InputWithTooltip>
              )}
            />
          </div>
        </div>
      </div>
    </SwissCard>

    {/* Help Panel */}
    <HelpPanel
      isOpen={isHelpOpen}
      onClose={() => setIsHelpOpen(false)}
      {...proxyConfigHelpContent}
    />
    </>
  );
};
