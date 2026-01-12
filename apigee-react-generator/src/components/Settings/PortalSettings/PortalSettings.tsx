import { useTranslation } from 'react-i18next';
import { useProjectStore } from '@/store/useProjectStore';
import { Globe, Info } from 'lucide-react';

export function PortalSettings() {
  const { t } = useTranslation();
  const { portalConfig, updatePortalConfig } = useProjectStore();

  const handlePortalUrlChange = (env: 'dev1' | 'uat1' | 'staging' | 'prod1', value: string) => {
    updatePortalConfig({
      portalUrls: {
        ...portalConfig.portalUrls,
        [env]: value
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
          <Globe className="h-5 w-5" />
          {t('portalSettings.title', 'Portal & OAuth Configuration')}
        </h3>
        <p className="text-sm text-[var(--swiss-gray-500)] mt-2">
          {t('portalSettings.description', 'Configure portal URLs and Okta authentication endpoints for each environment.')}
        </p>
      </div>

      {/* Okta URLs Section */}
      <div className="space-y-6">
        <div className="border-b-2 border-[var(--swiss-black)] pb-2">
          <h4 className="text-sm font-black uppercase tracking-tight">
            {t('portalSettings.oktaSection', 'Okta Authentication URLs')}
          </h4>
        </div>

        {/* Info Box */}
        <div className="bg-[var(--swiss-gray-50)] p-4 border-l-4 border-[var(--swiss-black)] flex items-start gap-3">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[var(--swiss-gray-600)]">
            {t('portalSettings.oktaInfo', 'These URLs are displayed in the swagger documentation to help API consumers obtain access tokens.')}
          </p>
        </div>

        {/* Okta Non-Prod URL */}
        <div>
          <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
            {t('portalSettings.fields.oktaNonProd.label', 'Okta URL (Non-Prod)')}
          </label>
          <input
            value={portalConfig.oktaNonProdUrl}
            onChange={(e) => updatePortalConfig({ oktaNonProdUrl: e.target.value })}
            placeholder="https://elis-employees.oktapreview.com/oauth2/.../v1/token"
            className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
          />
          <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
            {t('portalSettings.fields.oktaNonProd.help', 'Used for DEV, UAT, and Staging environments')}
          </p>
        </div>

        {/* Okta Prod URL */}
        <div>
          <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
            {t('portalSettings.fields.oktaProd.label', 'Okta URL (Prod)')}
          </label>
          <input
            value={portalConfig.oktaProdUrl}
            onChange={(e) => updatePortalConfig({ oktaProdUrl: e.target.value })}
            placeholder="https://elis-employees.okta.com/oauth2/.../v1/token"
            className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
          />
          <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
            {t('portalSettings.fields.oktaProd.help', 'Used for Production environment only')}
          </p>
        </div>
      </div>

      {/* Portal URLs Section */}
      <div className="space-y-6">
        <div className="border-b-2 border-[var(--swiss-black)] pb-2">
          <h4 className="text-sm font-black uppercase tracking-tight">
            {t('portalSettings.portalSection', 'API Portal URLs')}
          </h4>
        </div>

        {/* Info Box */}
        <div className="bg-[var(--swiss-gray-50)] p-4 border-l-4 border-[var(--swiss-black)] flex items-start gap-3">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[var(--swiss-gray-600)]">
            {t('portalSettings.portalInfo', 'Base URLs for each environment. These will be combined with the proxy basepath in the generated swagger files.')}
          </p>
        </div>

        {/* Portal URLs Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* DEV1 */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              DEV1
            </label>
            <input
              value={portalConfig.portalUrls.dev1}
              onChange={(e) => handlePortalUrlChange('dev1', e.target.value)}
              placeholder="https://dev-api.elis.com"
              className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
            />
          </div>

          {/* UAT1 */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              UAT1
            </label>
            <input
              value={portalConfig.portalUrls.uat1}
              onChange={(e) => handlePortalUrlChange('uat1', e.target.value)}
              placeholder="https://uat-api.elis.com"
              className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
            />
          </div>

          {/* Staging */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              STAGING
            </label>
            <input
              value={portalConfig.portalUrls.staging}
              onChange={(e) => handlePortalUrlChange('staging', e.target.value)}
              placeholder="https://staging-api.elis.com"
              className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
            />
          </div>

          {/* PROD1 */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              PROD1
            </label>
            <input
              value={portalConfig.portalUrls.prod1}
              onChange={(e) => handlePortalUrlChange('prod1', e.target.value)}
              placeholder="https://api.elis.com"
              className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Generated Files Preview */}
      <div className="space-y-4">
        <div className="border-b-2 border-[var(--swiss-black)] pb-2">
          <h4 className="text-sm font-black uppercase tracking-tight">
            {t('portalSettings.filesSection', 'Generated Swagger Files')}
          </h4>
        </div>

        <div className="bg-[var(--swiss-gray-50)] p-4 font-mono text-xs space-y-1">
          <div className="text-[var(--swiss-gray-600)]">swagger-portal/</div>
          <div className="pl-4">swagger-dev1.json</div>
          <div className="pl-4">swagger-uat1.json</div>
          <div className="pl-4">swagger-staging.json</div>
          <div className="pl-4">swagger-prod1.json</div>
        </div>
      </div>
    </div>
  );
}
