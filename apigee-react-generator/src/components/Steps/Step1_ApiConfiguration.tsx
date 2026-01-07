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
  entity: z.string().min(1, 'Entity is required'),
  apiname: z.string()
    .min(1, 'API name is required')
    .regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, 'Invalid API name (use letters, numbers, and hyphens)'),
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

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ApiConfigFormData>({
    resolver: zodResolver(apiConfigSchema),
    mode: 'onChange',
    defaultValues: {
      entity: apiConfig.entity || '',
      apiname: apiConfig.apiname || '',
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
  const apiname = watch('apiname');
  const version = watch('version');

  const proxyName = entity && apiname && version ? `${entity}.${apiname}.${version}` : '';

  // Update store on every field change
  React.useEffect(() => {
    const subscription = watch((formData) => {
      updateApiConfig({
        entity: formData.entity || '',
        apiname: formData.apiname || '',
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
    updateApiConfig({
      ...data,
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
        <SoftSection id="01" title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="entity"
                label="Entity"
                required
                tooltip="The entity or organization name in Apigee. This is typically your company or business unit identifier (e.g., 'elis'). It becomes part of the API proxy name."
              />
              <Controller
                name="entity"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="entity"
                    placeholder="elis"
                    className={`
                      soft-input font-mono text-sm
                      ${errors.entity ? 'border-[var(--error-base)]' : ''}
                    `}
                  />
                )}
              />
              {errors.entity && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.entity.message}
                </p>
              )}
            </div>

            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="apiname"
                label="API Name"
                required
                tooltip="The functional name of your API (e.g., 'customer', 'product'). Use lowercase letters, numbers, and hyphens only. This identifies the API's business domain in Apigee."
              />
              <Controller
                name="apiname"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="apiname"
                    placeholder="customer"
                    className={`
                      soft-input font-mono text-sm
                      ${errors.apiname ? 'border-[var(--error-base)]' : ''}
                    `}
                  />
                )}
              />
              {errors.apiname && (
                <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                  {errors.apiname.message}
                </p>
              )}
            </div>

            <div className="soft-stagger">
              <LabelWithTooltip
                htmlFor="version"
                label="Version"
                required
                tooltip="The API version in format v1, v2, v3, etc. This allows multiple versions of the same API to coexist in Apigee, enabling smooth versioning and migration strategies."
              />
              <Controller
                name="version"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="version"
                    placeholder="v1"
                    className={`
                      soft-input font-mono text-sm
                      ${errors.version ? 'border-[var(--error-base)]' : ''}
                    `}
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

          {proxyName && (
            <Alert className="soft-alert info mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Proxy Name: <code className="pill-badge font-mono text-xs">{proxyName}</code>
              </AlertDescription>
            </Alert>
          )}

          <div className="soft-stagger">
            <LabelWithTooltip
              htmlFor="description"
              label="Description"
              required
              tooltip="A clear description of your API's purpose and functionality. This appears in the Apigee UI and documentation, helping developers understand what the API does and when to use it."
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
                  className={`
                    soft-input text-sm resize-none
                    ${errors.description ? 'border-[var(--error-base)]' : ''}
                  `}
                />
              )}
            />
            {errors.description && (
              <p className="text-xs text-[var(--error-base)] mt-2 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error-base)]"></span>
                {errors.description.message}
              </p>
            )}
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
