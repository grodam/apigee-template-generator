import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, HelpCircle } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { AUTH_TYPES } from '../../utils/constants';

const apiConfigSchema = z.object({
  entity: z.enum(['elis', 'ext'], { errorMap: () => ({ message: 'Entity must be "elis" or "ext"' }) }),
  domain: z.string()
    .min(1, 'Domain is required')
    .regex(/^[a-z][a-z0-9-]*$/, 'Use lowercase letters, numbers, and hyphens'),
  backendApps: z.string()
    .min(1, 'At least one backend app is required')
    .regex(/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/, 'Format: app1 or app1-app2-app3 (lowercase)'),
  businessObject: z.string()
    .min(1, 'Business object is required')
    .regex(/^[a-z][a-z0-9-]*$/, 'Use lowercase letters, numbers, and hyphens'),
  version: z.string()
    .regex(/^v[0-9]+$/, 'Version must be in format v1, v2, etc.'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  proxyBasepath: z.string().min(1, 'Proxy basepath is required'),
  targetPath: z.string().min(1, 'Target path is required'),
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
  <div className="flex items-center gap-2 mb-3">
    <Label
      htmlFor={htmlFor}
      className="soft-label"
    >
      {label}
      {required && <span className="text-[var(--peach-500)] ml-1">*</span>}
    </Label>
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-[var(--text-tertiary)] cursor-help hover:text-[var(--lavender-500)] transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="right" className="soft-tooltip">
          <p className="text-sm leading-relaxed">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

export const Step1_ApiConfiguration: React.FC = () => {
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
      targetPath: apiConfig.targetPath || '/v1',
      mockUrl: apiConfig.mockUrl || '',
      globalRateLimit: apiConfig.globalRateLimit || '',
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

    return `API proxy for ${businessObjectCapitalized} management in the ${domainCapitalized} domain. Backend: ${backendAppsList}. Type: ${entityLabel}.`;
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
        targetPath: formData.targetPath || '/v1',
        mockUrl: formData.mockUrl || '',
        globalRateLimit: formData.globalRateLimit || '',
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Configuration</h1>
        <p className="text-[var(--text-secondary)] text-lg">Configure your API proxy parameters</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <SoftSection id="01" title="Proxy Naming Convention">
          {/* Naming convention info */}
          <div className="mb-6 p-4 rounded-xl bg-[var(--lavender-50)] border border-[var(--lavender-200)]">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--lavender-600)]">Format:</span>{' '}
              <code className="font-mono text-xs bg-white px-2 py-1 rounded">
                [entity].[domain].[backendApps].[businessObject].[version]
              </code>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Entity */}
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="entity"
                label="Entity"
                required
                tooltip="L'entité propriétaire de l'API. 'elis' pour les APIs internes, 'ext' pour les APIs exposées aux partenaires externes."
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
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-light)] rounded-xl shadow-lg">
                      <SelectItem value="elis" className="text-sm font-mono">elis</SelectItem>
                      <SelectItem value="ext" className="text-sm font-mono">ext</SelectItem>
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
                label="Domain"
                required
                tooltip="Le domaine métier de l'API (ex: finance, rh, supply-chain, sales, marketing). Utilisez des minuscules et des tirets."
              />
              <Controller
                name="domain"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="domain"
                    placeholder="finance"
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
                label="Backend Apps"
                required
                tooltip="Le(s) nom(s) de l'application backend. Pour plusieurs apps, séparez par des tirets (ex: sap-salesforce). Utilisez des minuscules."
              />
              <Controller
                name="backendApps"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="backendApps"
                    placeholder="sap-sf"
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
                label="Business Object"
                required
                tooltip="L'objet métier exposé par l'API (ex: invoice, customer, order, product). Utilisez des minuscules et des tirets."
              />
              <Controller
                name="businessObject"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="businessObject"
                    placeholder="invoice"
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
                label="Version"
                required
                tooltip="La version de l'API au format v1, v2, v3, etc. Permet de gérer plusieurs versions d'une même API."
              />
              <Controller
                name="version"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="version"
                    placeholder="v1"
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
                <span className="font-semibold">Proxy Name:</span>{' '}
                <code className="pill-badge font-mono text-xs">{proxyName}</code>
              </AlertDescription>
            </Alert>
          )}

          <div className="soft-stagger">
            <LabelWithTooltip
              htmlFor="description"
              label="Description"
              required
              tooltip="Auto-générée à partir du nom du proxy. Modifiable manuellement si besoin. La description apparaît dans l'interface Apigee et aide les développeurs à comprendre l'API."
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Describe your API proxy purpose and functionality..."
                  rows={3}
                  onKeyDown={() => setIsDescriptionManuallyEdited(true)}
                  className={`
                    soft-input text-sm resize-none
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
                <span className="text-xs text-[var(--text-tertiary)]">
                  {isDescriptionManuallyEdited ? '✎ Modifiée manuellement' : '✨ Auto-générée'}
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
                  className="text-xs text-[var(--lavender-500)] hover:text-[var(--lavender-600)] underline"
                >
                  Régénérer
                </button>
              )}
            </div>
          </div>
        </SoftSection>

        {/* Routing Configuration Section */}
        <SoftSection id="02" title="Routing Configuration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="proxyBasepath"
                label="Proxy Basepath"
                required
                tooltip="The public URL path where your API will be accessible in Apigee (e.g., 'customer-api/v1'). Clients will call https://api.domain.com/{proxyBasepath}/resource to access your API."
              />
              <Controller
                name="proxyBasepath"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="proxyBasepath"
                    placeholder="customer-api/v1"
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
                label="Target Path"
                required
                tooltip="The base path on the backend/target server (e.g., '/v1'). Apigee prepends this to all backend calls. For example, if your backend API is at backend.com/v1/customers, set this to '/v1'."
              />
              <Controller
                name="targetPath"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="targetPath"
                    placeholder="/v1"
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
        <SoftSection id="03" title="Security & Limits">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="authSouthbound"
                label="Southbound Authentication"
                required
                tooltip="Authentication method used when Apigee calls your backend service. 'Basic' uses username/password, 'OAuth2-ClientCredentials' uses client credentials flow, 'None' for unprotected backends. This is separate from how clients authenticate to Apigee."
              />
              <Controller
                name="authSouthbound"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="authSouthbound"
                      className="soft-input"
                    >
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-light)] rounded-xl shadow-lg">
                      {AUTH_TYPES.map((type) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="text-sm text-[var(--text-primary)] focus:bg-[var(--lavender-100)] focus:text-[var(--lavender-600)] rounded-lg"
                        >
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="globalRateLimit"
                label="Global Rate Limit"
                tooltip="Maximum number of API calls allowed globally. Format: {number}pm (per minute) or {number}ps (per second). Example: '500pm' allows 500 requests per minute. This applies to all clients combined and helps protect your backend from overload."
              />
              <Controller
                name="globalRateLimit"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="globalRateLimit"
                    placeholder="500pm or 100ps"
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
        <SoftSection id="04" title="Optional Configuration">
          <div className="soft-stagger">
            <LabelWithTooltip
              htmlFor="mockUrl"
              label="Mock URL"
              tooltip="Optional mock server URL for testing (e.g., from Stoplight, Mockoon, or Prism). When provided, Apigee can be configured to route to this mock instead of the real backend during development and testing phases."
            />
            <Controller
              name="mockUrl"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="mockUrl"
                  placeholder="https://stoplight.io/mocks/..."
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
