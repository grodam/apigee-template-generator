import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Plus, Trash2, Key, Server, Package, Sparkles } from 'lucide-react';
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
  const { apiConfig, updateApiConfig, updateEnvironmentConfig, autoDetectedConfig } = useProjectStore();
  const [selectedEnv, setSelectedEnv] = useState<Environment>('dev1');
  const [autoFilledHosts, setAutoFilledHosts] = useState<Set<string>>(new Set());
  const [autoFilledKvmEntries, setAutoFilledKvmEntries] = useState<Set<string>>(new Set());
  const hasAppliedAutoFill = useRef(false);

  // Initialize environments if not present
  useEffect(() => {
    if (apiConfig.entity && apiConfig.apiname && apiConfig.version && !apiConfig.environments) {
      // Trigger environment initialization by updating config
      updateApiConfig({});
    }
  }, [apiConfig.entity, apiConfig.apiname, apiConfig.version, apiConfig.environments, updateApiConfig]);

  // Apply auto-detected hosts on mount (only once)
  useEffect(() => {
    if (hasAppliedAutoFill.current) return;
    if (!autoDetectedConfig || !apiConfig.environments) return;
    if (!autoDetectedConfig.environmentHosts || Object.keys(autoDetectedConfig.environmentHosts).length === 0) return;

    hasAppliedAutoFill.current = true;
    const newAutoFilledHosts = new Set<string>();

    // Apply detected hosts to each environment
    for (const env of ENVIRONMENTS) {
      const envHost = autoDetectedConfig.environmentHosts[env];
      const envConfig = apiConfig.environments[env];

      if (envHost?.host && envConfig) {
        const targetServer = envConfig.targetServers[0];

        // Build updated config with all changes at once
        let updatedEnvConfig = { ...envConfig };

        // Update target server host if empty
        if (targetServer && !targetServer.host) {
          const updatedTargetServers = [...envConfig.targetServers];
          updatedTargetServers[0] = {
            ...targetServer,
            host: envHost.host,
            port: envHost.port,
          };
          updatedEnvConfig = {
            ...updatedEnvConfig,
            targetServers: updatedTargetServers,
          };
          newAutoFilledHosts.add(env);
        }

        // Apply KVM variables from variabilized paths
        if (autoDetectedConfig.hasVariablePath && autoDetectedConfig.variabilizedBasePath) {
          const kvmVars = autoDetectedConfig.variabilizedBasePath.kvmVariables;
          let updatedKvms = [...(updatedEnvConfig.kvms || [])];

          for (const kvmVar of kvmVars) {
            const varValue = kvmVar.values[env] || '';

            if (updatedKvms.length > 0) {
              const existingEntryIndex = updatedKvms[0].entries?.findIndex(
                e => e.name === kvmVar.variableName
              );

              if (existingEntryIndex !== undefined && existingEntryIndex >= 0 && updatedKvms[0].entries) {
                updatedKvms[0].entries[existingEntryIndex].value = varValue;
              } else {
                if (!updatedKvms[0].entries) {
                  updatedKvms[0].entries = [];
                }
                updatedKvms[0].entries.push({
                  name: kvmVar.variableName,
                  value: varValue
                });
              }
            }
          }

          updatedEnvConfig = {
            ...updatedEnvConfig,
            kvms: updatedKvms,
          };
        }

        // Apply all changes in a single update
        updateEnvironmentConfig(env, updatedEnvConfig);
      }
    }

    setAutoFilledHosts(newAutoFilledHosts);

    // Track auto-filled KVM entries
    if (autoDetectedConfig.hasVariablePath && autoDetectedConfig.variabilizedBasePath) {
      const newAutoFilledKvmEntries = new Set<string>();
      for (const kvmVar of autoDetectedConfig.variabilizedBasePath.kvmVariables) {
        newAutoFilledKvmEntries.add(kvmVar.variableName);
      }
      setAutoFilledKvmEntries(newAutoFilledKvmEntries);
    }
  }, [autoDetectedConfig, apiConfig.environments, updateEnvironmentConfig]);

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
          host: '',
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

  const handleApiProductChange = (field: string, value: unknown) => {
    if (!currentEnvConfig) {
      console.warn('Environment config not initialized');
      return;
    }

    const updatedProducts = currentEnvConfig.apiProducts.length > 0
      ? [...currentEnvConfig.apiProducts]
      : [{
          name: `${apiConfig.proxyName}-product-${selectedEnv}`,
          displayName: `${apiConfig.proxyName} Product ${selectedEnv.toUpperCase()}`,
          approvalType: 'auto' as const,
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
    <div>
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
                    <div className="relative">
                      <Input
                        id={`targetServerName-${env}`}
                        value={targetServer?.name || ''}
                        disabled
                        className="soft-input font-mono text-sm opacity-60 pr-10"
                      />
                      {targetServer?.name && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="soft-tooltip">
                              <p className="text-sm leading-relaxed">Auto-generated from proxy name</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2 space-y-2">
                      <div className="h-5 flex items-center">
                        <Label htmlFor={`host-${env}`} className="soft-label">
                          {t('step3.targetServer.host')}
                        </Label>
                      </div>
                      <div className="relative">
                        <Input
                          id={`host-${env}`}
                          value={targetServer?.host || ''}
                          onChange={(e) => {
                            handleTargetServerChange('host', e.target.value);
                            // Remove auto-fill indicator when user modifies
                            setAutoFilledHosts(prev => {
                              const next = new Set(prev);
                              next.delete(env);
                              return next;
                            });
                          }}
                          placeholder={`backend-${env}.elis.com`}
                          className="soft-input font-mono text-sm pr-10"
                        />
                        {autoFilledHosts.has(env) && (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="soft-tooltip">
                                <p className="text-sm leading-relaxed">Auto-filled from OpenAPI spec</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-5 flex items-center">
                        <Label htmlFor={`port-${env}`} className="soft-label">
                          {t('step3.targetServer.port')}
                        </Label>
                      </div>
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
                      <div className="relative">
                        <Input
                          id={`productName-${env}`}
                          value={apiProduct?.name || ''}
                          onChange={(e) => handleApiProductChange('name', e.target.value)}
                          className="soft-input font-mono text-sm pr-10"
                        />
                        {apiProduct?.name && (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="soft-tooltip">
                                <p className="text-sm leading-relaxed">Auto-generated from proxy name</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`displayName-${env}`} className="soft-label">
                        {t('step3.apiProduct.displayName')}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`displayName-${env}`}
                          value={apiProduct?.displayName || ''}
                          onChange={(e) => handleApiProductChange('displayName', e.target.value)}
                          className="soft-input font-mono text-sm pr-10"
                        />
                        {apiProduct?.displayName && (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="soft-tooltip">
                                <p className="text-sm leading-relaxed">Auto-generated from proxy name</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`productDescription-${env}`} className="soft-label">
                      {t('step3.apiProduct.description')}
                    </Label>
                    <div className="relative">
                      <Textarea
                        id={`productDescription-${env}`}
                        value={apiProduct?.description || ''}
                        onChange={(e) => handleApiProductChange('description', e.target.value)}
                        rows={2}
                        className="soft-input font-mono text-sm pr-10"
                      />
                      {apiProduct?.description && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="absolute right-3 top-3 inline-flex items-center">
                                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="soft-tooltip">
                              <p className="text-sm leading-relaxed">Auto-generated from proxy name</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
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
                            <div className="relative">
                              <Input
                                id={`kvm-name-${env}-${kvmIndex}`}
                                value={kvm.name}
                                onChange={(e) => handleKVMChange(kvmIndex, 'name', e.target.value)}
                                placeholder={t('step3.kvm.namePlaceholder')}
                                className="soft-input font-mono text-sm pr-10"
                              />
                              {kvm.name && !kvm.name.startsWith('custom-') && (
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                                        <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="soft-tooltip">
                                      <p className="text-sm leading-relaxed">Auto-generated from proxy name</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
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
                              <div className="flex-1 relative">
                                <Input
                                  placeholder={t('step3.kvm.keyPlaceholder')}
                                  value={entry.name}
                                  onChange={(e) => {
                                    handleKVMEntryChange(kvmIndex, entryIndex, 'name', e.target.value);
                                    // Remove from auto-filled if user modifies
                                    if (autoFilledKvmEntries.has(entry.name)) {
                                      setAutoFilledKvmEntries(prev => {
                                        const next = new Set(prev);
                                        next.delete(entry.name);
                                        return next;
                                      });
                                    }
                                  }}
                                  className="soft-input font-mono text-sm"
                                />
                                {autoFilledKvmEntries.has(entry.name) && (
                                  <TooltipProvider delayDuration={300}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center">
                                          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="soft-tooltip">
                                        <p className="text-sm leading-relaxed">Auto-filled from OpenAPI spec</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <div className="flex-1 relative">
                                <Input
                                  placeholder={t('step3.kvm.valuePlaceholder')}
                                  value={entry.value}
                                  onChange={(e) => handleKVMEntryChange(kvmIndex, entryIndex, 'value', e.target.value)}
                                  type={kvm.encrypted ? 'password' : 'text'}
                                  className="soft-input font-mono text-sm"
                                />
                                {autoFilledKvmEntries.has(entry.name) && (
                                  <TooltipProvider delayDuration={300}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center">
                                          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-500)] cursor-help" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="soft-tooltip">
                                        <p className="text-sm leading-relaxed">Auto-filled from OpenAPI spec</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
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
