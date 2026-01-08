import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Info, Plus, Trash2, Key, Server, Package } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { ENVIRONMENTS } from '../../utils/constants';
import type { Environment } from '../../utils/constants';
import type { KVM } from '../../models/ApiConfiguration';

const SectionCard: React.FC<{
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, children, action }) => (
  <div className="soft-card">
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[var(--accent-100)] text-[var(--accent-600)]">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
);

export const Step3_EnvironmentConfig: React.FC = () => {
  const { t } = useTranslation();
  const { apiConfig, updateApiConfig, updateEnvironmentConfig } = useProjectStore();
  const [selectedEnv, setSelectedEnv] = useState<Environment>('dev1');

  // Initialize environments if not present
  useEffect(() => {
    if (apiConfig.entity && apiConfig.apiname && apiConfig.version && !apiConfig.environments) {
      // Trigger environment initialization by updating config
      updateApiConfig({});
    }
  }, [apiConfig.entity, apiConfig.apiname, apiConfig.version, apiConfig.environments, updateApiConfig]);

  const currentEnvConfig = apiConfig.environments?.[selectedEnv];

  const handleTabChange = (newValue: string) => {
    setSelectedEnv(newValue as Environment);
  };

  const handleTargetServerChange = (field: string, value: any) => {
    if (!currentEnvConfig) {
      console.warn('Environment config not initialized');
      return;
    }

    const updatedTargetServers = currentEnvConfig.targetServers.length > 0
      ? [...currentEnvConfig.targetServers]
      : [{
          name: `${apiConfig.proxyName}.backend`,
          host: `backend-${selectedEnv}.elis.com`,
          isEnabled: true,
          port: 443,
          sSLInfo: { enabled: true, clientAuthEnabled: false }
        }];

    updatedTargetServers[0] = {
      ...updatedTargetServers[0],
      [field]: value
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      targetServers: updatedTargetServers
    });
  };

  const handleApiProductChange = (field: string, value: any) => {
    if (!currentEnvConfig) {
      console.warn('Environment config not initialized');
      return;
    }

    const updatedProducts = currentEnvConfig.apiProducts.length > 0
      ? [...currentEnvConfig.apiProducts]
      : [{
          name: `${apiConfig.proxyName}-product-${selectedEnv}`,
          displayName: `${apiConfig.proxyName} Product ${selectedEnv.toUpperCase()}`,
          approvalType: 'auto',
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

  // KVM Management Functions
  const handleAddKVM = () => {
    if (!currentEnvConfig) return;

    // Generate a unique KVM name for additional KVMs
    const existingKvms = currentEnvConfig.kvms || [];
    const customKvmCount = existingKvms.filter(kvm => kvm.name.startsWith('custom-')).length;
    const kvmName = `custom-kvm-${customKvmCount + 1}`;

    const newKVM: KVM = {
      name: kvmName,
      encrypted: false,
      entries: []
    };

    const updatedKVMs = [...existingKvms, newKVM];

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  const handleRemoveKVM = (index: number) => {
    if (!currentEnvConfig) return;

    const updatedKVMs = currentEnvConfig.kvms?.filter((_, i) => i !== index) || [];

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  const handleKVMChange = (kvmIndex: number, field: 'name' | 'encrypted', value: any) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = [...currentEnvConfig.kvms];
    updatedKVMs[kvmIndex] = {
      ...updatedKVMs[kvmIndex],
      [field]: value
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  const handleAddKVMEntry = (kvmIndex: number) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = [...currentEnvConfig.kvms];
    const currentEntries = updatedKVMs[kvmIndex].entries || [];
    updatedKVMs[kvmIndex] = {
      ...updatedKVMs[kvmIndex],
      entries: [...currentEntries, { name: '', value: '' }]
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  const handleRemoveKVMEntry = (kvmIndex: number, entryIndex: number) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = [...currentEnvConfig.kvms];
    const updatedEntries = updatedKVMs[kvmIndex].entries?.filter((_, i) => i !== entryIndex) || [];
    updatedKVMs[kvmIndex] = {
      ...updatedKVMs[kvmIndex],
      entries: updatedEntries
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  const handleKVMEntryChange = (kvmIndex: number, entryIndex: number, field: 'name' | 'value', value: string) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = [...currentEnvConfig.kvms];
    const updatedEntries = [...(updatedKVMs[kvmIndex].entries || [])];
    updatedEntries[entryIndex] = {
      ...updatedEntries[entryIndex],
      [field]: value
    };
    updatedKVMs[kvmIndex] = {
      ...updatedKVMs[kvmIndex],
      entries: updatedEntries
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  // Check if basic config is complete
  const isConfigComplete = apiConfig.entity && apiConfig.apiname && apiConfig.version;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight mb-1">{t('step3.title')}</h2>
        <p className="text-sm text-[var(--text-muted)]">{t('step3.subtitle')}</p>
      </div>

      {!isConfigComplete && (
        <Alert variant="destructive" className="soft-alert error mb-6">
          <AlertDescription className="text-sm">
            {t('step3.alerts.completeApiConfig')}
          </AlertDescription>
        </Alert>
      )}

      {!apiConfig.environments && isConfigComplete && (
        <Alert className="soft-alert info mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {t('step3.alerts.initializing')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedEnv} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 h-11 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg p-1 mb-6">
          {ENVIRONMENTS.map((env) => (
            <TabsTrigger
              key={env}
              value={env}
              className="h-full flex items-center justify-center data-[state=active]:bg-[var(--accent-500)] data-[state=active]:text-white data-[state=active]:shadow-sm text-[var(--text-secondary)] rounded-md transition-all font-medium"
            >
              {env.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        {ENVIRONMENTS.map((env) => {
          const envConfig = apiConfig.environments?.[env];
          const targetServer = envConfig?.targetServers?.[0];
          const apiProduct = envConfig?.apiProducts?.[0];

          return (
            <TabsContent key={env} value={env} className="space-y-6 mt-0">
              <SectionCard
                title={t('step3.tabs.targetServer')}
                icon={<Server className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`targetServerName-${env}`} className="soft-label">
                      {t('step3.targetServer.name')}
                    </Label>
                    <Input
                      id={`targetServerName-${env}`}
                      value={targetServer?.name || ''}
                      disabled
                      className="soft-input font-mono text-sm opacity-60"
                    />
                    <p className="text-sm text-[var(--text-muted)]">{t('step3.targetServer.autoGenerated')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`host-${env}`} className="soft-label">
                        {t('step3.targetServer.host')}
                      </Label>
                      <Input
                        id={`host-${env}`}
                        value={targetServer?.host || ''}
                        onChange={(e) => handleTargetServerChange('host', e.target.value)}
                        placeholder={`e.g., backend-${env}.elis.com`}
                        className="soft-input font-mono text-sm"
                      />
                      <p className="text-sm text-[var(--text-muted)]">e.g., backend-{env}.elis.com</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`port-${env}`} className="soft-label">
                        {t('step3.targetServer.port')}
                      </Label>
                      <Input
                        id={`port-${env}`}
                        type="number"
                        value={targetServer?.port || 443}
                        onChange={(e) => handleTargetServerChange('port', parseInt(e.target.value))}
                        className="soft-input font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title={t('step3.tabs.apiProduct')}
                icon={<Package className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`productName-${env}`} className="soft-label">
                        {t('step3.apiProduct.name')}
                      </Label>
                      <Input
                        id={`productName-${env}`}
                        value={apiProduct?.name || ''}
                        onChange={(e) => handleApiProductChange('name', e.target.value)}
                        className="soft-input font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`displayName-${env}`} className="soft-label">
                        {t('step3.apiProduct.displayName')}
                      </Label>
                      <Input
                        id={`displayName-${env}`}
                        value={apiProduct?.displayName || ''}
                        onChange={(e) => handleApiProductChange('displayName', e.target.value)}
                        className="soft-input font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`productDescription-${env}`} className="soft-label">
                      {t('step3.apiProduct.description')}
                    </Label>
                    <Textarea
                      id={`productDescription-${env}`}
                      value={apiProduct?.description || ''}
                      onChange={(e) => handleApiProductChange('description', e.target.value)}
                      rows={2}
                      className="soft-input font-mono text-sm"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title={t('step3.kvm.title')}
                description={t('step3.kvm.description')}
                icon={<Key className="h-5 w-5" />}
                action={
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddKVM}
                    className="soft-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('step3.kvm.addKvm')}
                  </Button>
                }
              >
                <div className="space-y-4">
                  {(!envConfig?.kvms || envConfig.kvms.length === 0) && (
                    <Alert className="soft-alert info">
                      <Key className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {t('step3.kvm.noKvms')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {envConfig?.kvms?.map((kvm, kvmIndex) => (
                    <div key={kvmIndex} className="border-2 border-[var(--border-default)] rounded-lg p-5 bg-[var(--bg-secondary)]">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-3 flex-1">
                          <div className="space-y-2">
                            <Label htmlFor={`kvm-name-${env}-${kvmIndex}`} className="soft-label">
                              {t('step3.kvm.name')}
                            </Label>
                            <Input
                              id={`kvm-name-${env}-${kvmIndex}`}
                              value={kvm.name}
                              onChange={(e) => handleKVMChange(kvmIndex, 'name', e.target.value)}
                              placeholder={t('step3.kvm.namePlaceholder')}
                              className="soft-input font-mono text-sm"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`kvm-encrypted-${env}-${kvmIndex}`}
                              checked={kvm.encrypted}
                              onCheckedChange={(checked) => handleKVMChange(kvmIndex, 'encrypted', checked)}
                              className="border-[var(--border-default)] data-[state=checked]:bg-[var(--accent-500)] data-[state=checked]:border-[var(--accent-500)]"
                            />
                            <Label
                              htmlFor={`kvm-encrypted-${env}-${kvmIndex}`}
                              className="text-sm font-normal cursor-pointer text-[var(--text-primary)]"
                            >
                              {t('step3.kvm.encryptedHelp')}
                            </Label>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveKVM(kvmIndex)}
                          className="text-[var(--error-base)] hover:text-[var(--error-text)] hover:bg-[var(--error-light)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('step3.kvm.entries')}</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddKVMEntry(kvmIndex)}
                            className="soft-button secondary h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('step3.kvm.addEntry')}
                          </Button>
                        </div>

                        {(!kvm.entries || kvm.entries.length === 0) && (
                          <p className="text-sm text-[var(--text-muted)] italic">
                            {t('step3.kvm.noEntries')}
                          </p>
                        )}

                        <div className="space-y-2">
                          {kvm.entries?.map((entry, entryIndex) => (
                            <div key={entryIndex} className="flex items-center gap-2">
                              <Input
                                placeholder={t('step3.kvm.keyPlaceholder')}
                                value={entry.name}
                                onChange={(e) => handleKVMEntryChange(kvmIndex, entryIndex, 'name', e.target.value)}
                                className="flex-1 soft-input font-mono text-sm"
                              />
                              <Input
                                placeholder={t('step3.kvm.valuePlaceholder')}
                                value={entry.value}
                                onChange={(e) => handleKVMEntryChange(kvmIndex, entryIndex, 'value', e.target.value)}
                                type={kvm.encrypted ? 'password' : 'text'}
                                className="flex-1 soft-input font-mono text-sm"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveKVMEntry(kvmIndex, entryIndex)}
                                className="text-[var(--error-base)] hover:text-[var(--error-text)] hover:bg-[var(--error-light)]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
