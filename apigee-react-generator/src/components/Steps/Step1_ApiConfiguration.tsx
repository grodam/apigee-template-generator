import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, HelpCircle } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { AUTH_TYPES } from '../../utils/constants';

// Kebab-case regex: lowercase letter, then optionally (lowercase letters/numbers),
// then optionally repeated (-lowercase letter followed by lowercase letters/numbers)
const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/;
const kebabCaseMessage = 'Must be kebab-case (lowercase, words separated by single hyphens)';

// Path kebab-case: starts with /, then kebab-case segments separated by /
const pathKebabCaseRegex = /^\/([a-z][a-z0-9]*(-[a-z][a-z0-9]*)*)(\/[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*)*$/;
const pathKebabCaseMessage = 'Must start with / and use kebab-case';

const apiConfigSchema = z.object({
  entity: z.enum(['elis', 'ext'], { errorMap: () => ({ message: 'Entity must be "elis" or "ext"' }) }),
  domain: z.string()
    .min(1, 'Domain is required')
    .regex(kebabCaseRegex, kebabCaseMessage),
  backendApps: z.string()
    .min(1, 'At least one backend app is required')
    .regex(/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/, 'Format: app1 or app1-app2-app3 (kebab-case, lowercase)'),
  businessObject: z.string()
    .min(1, 'Business object is required')
    .regex(kebabCaseRegex, kebabCaseMessage),
  version: z.string()
    .regex(/^v[0-9]+$/, 'Version must be in format v1, v2, etc.'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  proxyBasepath: z.string()
    .min(1, 'Proxy basepath is required')
    .regex(pathKebabCaseRegex, pathKebabCaseMessage),
  targetPath: z.string()
    .min(1, 'Target path is required')
    .regex(/^\//, 'Must start with /'),
  mockUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  globalRateLimit: z.string()
    .regex(/^[0-9]+(pm|ps)$/, 'Format: {number}pm or {number}ps')
    .optional()
    .or(z.literal('')),
  authSouthbound: z.enum(['Basic', 'OAuth2-ClientCredentials', 'None']),
});

type ApiConfigFormData = z.infer<typeof apiConfigSchema>;

// Soft Section Component
const SoftSection: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => (
  <div className="soft-card">
    <div className="section-header">
      <div className="icon">
        <span className="text-sm font-bold">{id}</span>
      </div>
      <h3>{title}</h3>
    </div>
    {children}
  </div>
);

// Label with tooltip
const LabelWithTooltip: React.FC<{ htmlFor: string; label: string; tooltip: string; required?: boolean }> = ({
  htmlFor,
  label,
  tooltip,
  required = false
}) => (
  <div className="inline-flex items-baseline gap-1.5 mb-3">
    <Label
      htmlFor={htmlFor}
      className="soft-label"
    >
      {label}
      {required && <span className="text-[var(--error-base)] ml-0.5">*</span>}
    </Label>
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--text-muted)] cursor-help hover:text-[var(--accent-500)] transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="soft-tooltip">
          <p className="text-sm leading-relaxed">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

export const Step1_ApiConfiguration: React.FC = () => {
  const { t } = useTranslation();
  const { apiConfig, updateApiConfig } = useProjectStore();

  // Track if description was manually edited by user
  const [isDescriptionManuallyEdited, setIsDescriptionManuallyEdited] = React.useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<ApiConfigFormData>({
    resolver: zodResolver(apiConfigSchema),
    mode: 'onChange',
    defaultValues: {
      entity: (apiConfig.entity as 'elis' | 'ext') || 'elis',
      domain: apiConfig.domain || '',
      backendApps: apiConfig.backendApps?.join('-') || '',
      businessObject: apiConfig.businessObject || '',
      version: apiConfig.version || '',
      description: apiConfig.description || '',
      proxyBasepath: apiConfig.proxyBasepath || '',
      targetPath: apiConfig.targetPath || '',
      mockUrl: apiConfig.mockUrl || '',
      globalRateLimit: apiConfig.globalRateLimit || '100pm',
      authSouthbound: apiConfig.authSouthbound || 'Basic',
    }
  });

  const entity = watch('entity');
  const domain = watch('domain');
  const backendApps = watch('backendApps');
  const businessObject = watch('businessObject');
  const version = watch('version');

  // Proxy name format: [entity].[domain].[backendapp1-backendapp2-...].[businessobject].[version]
  const proxyName = entity && domain && backendApps && businessObject && version
    ? `${entity}.${domain}.${backendApps}.${businessObject}.${version}`
    : '';

  // Generate description from proxy name components
  const generateDescription = React.useCallback(() => {
    if (!domain || !backendApps || !businessObject) return '';

    const entityLabel = entity === 'elis' ? 'internal' : 'external';
    const backendAppsList = backendApps.split('-').join(', ').toUpperCase();
    const businessObjectCapitalized = businessObject.charAt(0).toUpperCase() + businessObject.slice(1);
    const domainCapitalized = domain.charAt(0).toUpperCase() + domain.slice(1);

    return `API proxy for ${businessObjectCapitalized} management in the ${domainCapitalized} domain.\nBackend: ${backendAppsList}.\nType: ${entityLabel}.`;
  }, [entity, domain, backendApps, businessObject]);

  // Auto-generate description when proxy name components change (if not manually edited)
  React.useEffect(() => {
    if (!isDescriptionManuallyEdited && domain && backendApps && businessObject) {
      const autoDescription = generateDescription();
      if (autoDescription) {
        setValue('description', autoDescription, { shouldValidate: true });
      }
    }
  }, [entity, domain, backendApps, businessObject, isDescriptionManuallyEdited, generateDescription, setValue]);

  // Also check on mount if we need to auto-generate (for when form loads with values but empty description)
  React.useEffect(() => {
    const currentDesc = apiConfig.description;
    if (!currentDesc && apiConfig.domain && apiConfig.backendApps?.length && apiConfig.businessObject) {
      const autoDescription = generateDescription();
      if (autoDescription) {
        setValue('description', autoDescription, { shouldValidate: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update store on every field change
  React.useEffect(() => {
    const subscription = watch((formData) => {
      // Convert backendApps string to array (split by '-')
      const backendAppsArray = formData.backendApps ? formData.backendApps.split('-').filter(Boolean) : [];

      updateApiConfig({
        entity: (formData.entity as 'elis' | 'ext') || 'elis',
        domain: formData.domain || '',
        backendApps: backendAppsArray,
        businessObject: formData.businessObject || '',
        version: formData.version || '',
        description: formData.description || '',
        proxyBasepath: formData.proxyBasepath || '',
        targetPath: formData.targetPath || '',
        mockUrl: formData.mockUrl || '',
        globalRateLimit: formData.globalRateLimit || '100pm',
        authSouthbound: formData.authSouthbound || 'Basic',
        oasFormat: apiConfig.oasFormat || 'json',
        oasVersion: apiConfig.oasVersion || '3.0.0',
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, updateApiConfig, apiConfig.oasFormat, apiConfig.oasVersion]);

  const onSubmit = (data: ApiConfigFormData) => {
    const backendAppsArray = data.backendApps ? data.backendApps.split('-').filter(Boolean) : [];
    updateApiConfig({
      ...data,
      backendApps: backendAppsArray,
      oasFormat: 'json',
      oasVersion: '3.0.0',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1 text-[var(--text-primary)]">{t('step1.title')}</h2>
        <p className="text-sm text-[var(--text-muted)]">{t('step1.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <SoftSection id="01" title={t('step1.sections.proxyNaming')}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Entity */}
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="entity"
                label={t('step1.fields.entity.label')}
                required
                tooltip={t('step1.fields.entity.tooltip')}
              />
              <Controller
                name="entity"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="entity"
                      className={`soft-input font-mono text-sm ${errors.entity ? 'border-[var(--error-base)]' : ''}`}
                    >
                      <SelectValue placeholder={t('step1.fields.entity.placeholder')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--bg-primary)] border-[var(--border-default)] rounded-md shadow-lg">
                      <SelectItem value="elis" className="text-sm font-mono">{t('step1.fields.entity.options.elis')}</SelectItem>
                      <SelectItem value="ext" className="text-sm font-mono">{t('step1.fields.entity.options.ext')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.entity && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.entity.message}
                </p>
              )}
            </div>

            {/* Domain */}
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="domain"
                label={t('step1.fields.domain.label')}
                required
                tooltip={t('step1.fields.domain.tooltip')}
              />
              <Controller
                name="domain"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="domain"
                    placeholder={t('step1.fields.domain.placeholder')}
                    className={`soft-input font-mono text-sm ${errors.domain ? 'border-[var(--error-base)]' : ''}`}
                  />
                )}
              />
              {errors.domain && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.domain.message}
                </p>
              )}
            </div>

            {/* Backend Apps */}
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="backendApps"
                label={t('step1.fields.backendApps.label')}
                required
                tooltip={t('step1.fields.backendApps.tooltip')}
              />
              <Controller
                name="backendApps"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="backendApps"
                    placeholder={t('step1.fields.backendApps.placeholder')}
                    className={`soft-input font-mono text-sm ${errors.backendApps ? 'border-[var(--error-base)]' : ''}`}
                  />
                )}
              />
              {errors.backendApps && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.backendApps.message}
                </p>
              )}
            </div>

            {/* Business Object */}
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="businessObject"
                label={t('step1.fields.businessObject.label')}
                required
                tooltip={t('step1.fields.businessObject.tooltip')}
              />
              <Controller
                name="businessObject"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="businessObject"
                    placeholder={t('step1.fields.businessObject.placeholder')}
                    className={`soft-input font-mono text-sm ${errors.businessObject ? 'border-[var(--error-base)]' : ''}`}
                  />
                )}
              />
              {errors.businessObject && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.businessObject.message}
                </p>
              )}
            </div>

            {/* Version */}
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="version"
                label={t('step1.fields.version.label')}
                required
                tooltip={t('step1.fields.version.tooltip')}
              />
              <Controller
                name="version"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="version"
                    placeholder={t('step1.fields.version.placeholder')}
                    className={`soft-input font-mono text-sm ${errors.version ? 'border-[var(--error-base)]' : ''}`}
                  />
                )}
              />
              {errors.version && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.version.message}
                </p>
              )}
            </div>
          </div>

          {/* Proxy Name Preview */}
          {proxyName && (
            <Alert className="soft-alert info mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <span className="font-semibold">{t('step1.proxyName.label')}</span>{' '}
                <code className="pill-badge font-mono text-xs">{proxyName}</code>
              </AlertDescription>
            </Alert>
          )}

          <div className="soft-stagger">
            <LabelWithTooltip
              htmlFor="description"
              label={t('step1.fields.description.label')}
              required
              tooltip={t('step1.fields.description.tooltip')}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder={t('step1.fields.description.placeholder')}
                  rows={3}
                  onKeyDown={() => setIsDescriptionManuallyEdited(true)}
                  className={`
                    soft-input font-mono text-sm resize-none
                    ${errors.description ? 'border-[var(--error-base)]' : ''}
                  `}
                />
              )}
            />
            <div className="flex items-center justify-between mt-2">
              {errors.description ? (
                <p className="text-xs text-[var(--error-base)] flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.description.message}
                </p>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">
                  {isDescriptionManuallyEdited ? t('common.manuallyModified') : t('common.autoGenerated')}
                </span>
              )}
              {isDescriptionManuallyEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDescriptionManuallyEdited(false);
                    const autoDesc = generateDescription();
                    if (autoDesc) setValue('description', autoDesc, { shouldValidate: true });
                  }}
                  className="text-xs text-[var(--accent-500)] hover:text-[var(--accent-600)] underline"
                >
                  {t('common.regenerate')}
                </button>
              )}
            </div>
          </div>
        </SoftSection>

        {/* Routing Configuration Section */}
        <SoftSection id="02" title={t('step1.sections.routing')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="proxyBasepath"
                label={t('step1.fields.proxyBasepath.label')}
                required
                tooltip={t('step1.fields.proxyBasepath.tooltip')}
              />
              <Controller
                name="proxyBasepath"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="proxyBasepath"
                    placeholder={t('step1.fields.proxyBasepath.placeholder')}
                    className={`
                      soft-input font-mono text-sm
                      ${errors.proxyBasepath ? 'border-[var(--error-base)]' : ''}
                    `}
                  />
                )}
              />
              {errors.proxyBasepath && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.proxyBasepath.message}
                </p>
              )}
            </div>

            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="targetPath"
                label={t('step1.fields.targetPath.label')}
                required
                tooltip={t('step1.fields.targetPath.tooltip')}
              />
              <Controller
                name="targetPath"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="targetPath"
                    placeholder={t('step1.fields.targetPath.placeholder')}
                    className={`
                      soft-input font-mono text-sm
                      ${errors.targetPath ? 'border-[var(--error-base)]' : ''}
                    `}
                  />
                )}
              />
              {errors.targetPath && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.targetPath.message}
                </p>
              )}
            </div>
          </div>
        </SoftSection>

        {/* Security & Limits Section */}
        <SoftSection id="03" title={t('step1.sections.security')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="authSouthbound"
                label={t('step1.fields.authSouthbound.label')}
                required
                tooltip={t('step1.fields.authSouthbound.tooltip')}
              />
              <Controller
                name="authSouthbound"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="authSouthbound"
                      className="soft-input font-mono text-sm"
                    >
                      <SelectValue placeholder={t('step1.fields.authSouthbound.placeholder')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--bg-primary)] border-[var(--border-default)] rounded-md shadow-lg font-mono">
                      <SelectItem
                        value="None"
                        className="text-sm text-[var(--text-primary)] focus:bg-[var(--accent-100)] focus:text-[var(--accent-600)] rounded-md"
                      >
                        {t('step1.fields.authSouthbound.options.none')}
                      </SelectItem>
                      <SelectItem
                        value="Basic"
                        className="text-sm text-[var(--text-primary)] focus:bg-[var(--accent-100)] focus:text-[var(--accent-600)] rounded-md"
                      >
                        {t('step1.fields.authSouthbound.options.basic')}
                      </SelectItem>
                      <SelectItem
                        value="OAuth2-ClientCredentials"
                        className="text-sm text-[var(--text-primary)] focus:bg-[var(--accent-100)] focus:text-[var(--accent-600)] rounded-md"
                      >
                        {t('step1.fields.authSouthbound.options.oauth2')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="globalRateLimit"
                label={t('step1.fields.globalRateLimit.label')}
                tooltip={t('step1.fields.globalRateLimit.tooltip')}
              />
              <Controller
                name="globalRateLimit"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="globalRateLimit"
                    placeholder={t('step1.fields.globalRateLimit.placeholder')}
                    className={`
                      soft-input font-mono text-sm
                      ${errors.globalRateLimit ? 'border-[var(--error-base)]' : ''}
                    `}
                  />
                )}
              />
              {errors.globalRateLimit && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.globalRateLimit.message}
                </p>
              )}
            </div>
          </div>
        </SoftSection>

        {/* Optional Configuration Section */}
        <SoftSection id="04" title={t('step1.sections.optional')}>
          <div className="soft-stagger">
            <LabelWithTooltip
              htmlFor="mockUrl"
              label={t('step1.fields.mockUrl.label')}
              tooltip={t('step1.fields.mockUrl.tooltip')}
            />
            <Controller
              name="mockUrl"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="mockUrl"
                  placeholder={t('step1.fields.mockUrl.placeholder')}
                  className={`
                    soft-input font-mono text-sm
                    ${errors.mockUrl ? 'border-[var(--error-base)]' : ''}
                  `}
                />
              )}
            />
            {errors.mockUrl && (
              <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                {errors.mockUrl.message}
              </p>
            )}
          </div>
        </SoftSection>
      </form>
    </div>
  );
};
