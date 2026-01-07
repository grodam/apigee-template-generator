import React, { useState, useEffect } from 'react';
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
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--lavender-100)] text-[var(--lavender-600)]">
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

    // Update current environment
    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      targetServers: updatedTargetServers
    });

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig) {
            const envTargetServers = envConfig.targetServers.length > 0
              ? [...envConfig.targetServers]
              : [{
                  name: `${apiConfig.proxyName}.backend`,
                  host: `backend-${env}.elis.com`,
                  isEnabled: true,
                  port: 443,
                  sSLInfo: { enabled: true, clientAuthEnabled: false }
                }];

            // Adapter la valeur pour l'environnement cible
            let adaptedValue = value;
            if (field === 'host' && typeof value === 'string') {
              // Remplacer dev1 par le nom de l'env cible dans le host
              adaptedValue = value.replace(/dev1/gi, env);
            }

            envTargetServers[0] = {
              ...envTargetServers[0],
              [field]: adaptedValue
            };

            updateEnvironmentConfig(env, {
              ...envConfig,
              targetServers: envTargetServers
            });
          }
        }
      });
    }
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
          attributes: [{ name: 'access', value: selectedEnv === 'prod1' ? 'private' : 'public' }]
        }];

    updatedProducts[0] = {
      ...updatedProducts[0],
      [field]: value
    };

    // Update current environment
    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      apiProducts: updatedProducts
    });

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig) {
            const envProducts = envConfig.apiProducts.length > 0
              ? [...envConfig.apiProducts]
              : [{
                  name: `${apiConfig.proxyName}-product-${env}`,
                  displayName: `${apiConfig.proxyName} Product ${env.toUpperCase()}`,
                  approvalType: 'auto',
                  environments: [env],
                  attributes: [{ name: 'access', value: env === 'prod1' ? 'private' : 'public' }]
                }];

            // Adapter la valeur pour l'environnement cible
            let adaptedValue = value;
            if (typeof value === 'string') {
              // Remplacer dev1 par le nom de l'env cible dans les noms et display names
              adaptedValue = value.replace(/dev1/gi, env).replace(/DEV1/g, env.toUpperCase());
            }

            envProducts[0] = {
              ...envProducts[0],
              [field]: adaptedValue
            };

            updateEnvironmentConfig(env, {
              ...envConfig,
              apiProducts: envProducts
            });
          }
        }
      });
    }
  };

  // KVM Management Functions
  const handleAddKVM = () => {
    if (!currentEnvConfig) return;

    const newKVM: KVM = {
      name: `${apiConfig.proxyName}-kvm-${selectedEnv}`,
      encrypted: false,
      entry: []
    };

    const updatedKVMs = [...(currentEnvConfig.kvms || []), newKVM];

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig) {
            const adaptedKVM: KVM = {
              name: `${apiConfig.proxyName}-kvm-${env}`,
              encrypted: false,
              entry: []
            };
            updateEnvironmentConfig(env, {
              ...envConfig,
              kvms: [...(envConfig.kvms || []), adaptedKVM]
            });
          }
        }
      });
    }
  };

  const handleRemoveKVM = (index: number) => {
    if (!currentEnvConfig) return;

    const updatedKVMs = currentEnvConfig.kvms?.filter((_, i) => i !== index) || [];

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig) {
            const envKVMs = envConfig.kvms?.filter((_, i) => i !== index) || [];
            updateEnvironmentConfig(env, {
              ...envConfig,
              kvms: envKVMs
            });
          }
        }
      });
    }
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

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig && envConfig.kvms && envConfig.kvms[kvmIndex]) {
            const envKVMs = [...envConfig.kvms];
            let adaptedValue = value;
            if (field === 'name' && typeof value === 'string') {
              adaptedValue = value.replace(/dev1/gi, env);
            }
            envKVMs[kvmIndex] = {
              ...envKVMs[kvmIndex],
              [field]: adaptedValue
            };
            updateEnvironmentConfig(env, {
              ...envConfig,
              kvms: envKVMs
            });
          }
        }
      });
    }
  };

  const handleAddKVMEntry = (kvmIndex: number) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = [...currentEnvConfig.kvms];
    const currentEntries = updatedKVMs[kvmIndex].entry || [];
    updatedKVMs[kvmIndex] = {
      ...updatedKVMs[kvmIndex],
      entry: [...currentEntries, { name: '', value: '' }]
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig && envConfig.kvms && envConfig.kvms[kvmIndex]) {
            const envKVMs = [...envConfig.kvms];
            const envEntries = envKVMs[kvmIndex].entry || [];
            envKVMs[kvmIndex] = {
              ...envKVMs[kvmIndex],
              entry: [...envEntries, { name: '', value: '' }]
            };
            updateEnvironmentConfig(env, {
              ...envConfig,
              kvms: envKVMs
            });
          }
        }
      });
    }
  };

  const handleRemoveKVMEntry = (kvmIndex: number, entryIndex: number) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = [...currentEnvConfig.kvms];
    const updatedEntries = updatedKVMs[kvmIndex].entry?.filter((_, i) => i !== entryIndex) || [];
    updatedKVMs[kvmIndex] = {
      ...updatedKVMs[kvmIndex],
      entry: updatedEntries
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig && envConfig.kvms && envConfig.kvms[kvmIndex]) {
            const envKVMs = [...envConfig.kvms];
            const envEntries = envKVMs[kvmIndex].entry?.filter((_, i) => i !== entryIndex) || [];
            envKVMs[kvmIndex] = {
              ...envKVMs[kvmIndex],
              entry: envEntries
            };
            updateEnvironmentConfig(env, {
              ...envConfig,
              kvms: envKVMs
            });
          }
        }
      });
    }
  };

  const handleKVMEntryChange = (kvmIndex: number, entryIndex: number, field: 'name' | 'value', value: string) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = [...currentEnvConfig.kvms];
    const updatedEntries = [...(updatedKVMs[kvmIndex].entry || [])];
    updatedEntries[entryIndex] = {
      ...updatedEntries[entryIndex],
      [field]: value
    };
    updatedKVMs[kvmIndex] = {
      ...updatedKVMs[kvmIndex],
      entry: updatedEntries
    };

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });

    // Si on est dans dev1, synchroniser avec les autres environnements
    if (selectedEnv === 'dev1' && apiConfig.environments) {
      ENVIRONMENTS.forEach((env) => {
        if (env !== 'dev1') {
          const envConfig = apiConfig.environments![env];
          if (envConfig && envConfig.kvms && envConfig.kvms[kvmIndex]) {
            const envKVMs = [...envConfig.kvms];
            const envEntries = [...(envKVMs[kvmIndex].entry || [])];
            if (envEntries[entryIndex]) {
              envEntries[entryIndex] = {
                ...envEntries[entryIndex],
                [field]: value
              };
              envKVMs[kvmIndex] = {
                ...envKVMs[kvmIndex],
                entry: envEntries
              };
              updateEnvironmentConfig(env, {
                ...envConfig,
                kvms: envKVMs
              });
            }
          }
        }
      });
    }
  };

  // Check if basic config is complete
  const isConfigComplete = apiConfig.entity && apiConfig.apiname && apiConfig.version;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">Environment Configuration</h2>
        <p className="text-[var(--text-secondary)]">Configure target servers and API products for each environment</p>
      </div>

      {!isConfigComplete && (
        <Alert variant="destructive" className="soft-alert error mb-6">
          <AlertDescription className="text-sm">
            Veuillez d'abord compléter la configuration API (Entity, API Name, Version) dans l'onglet Configuration.
          </AlertDescription>
        </Alert>
      )}

      {!apiConfig.environments && isConfigComplete && (
        <Alert className="soft-alert info mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Les environnements sont en cours d'initialisation...
          </AlertDescription>
        </Alert>
      )}

      {selectedEnv === 'dev1' && (
        <Alert className="soft-alert info mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Mode synchronisation actif :</strong> Les modifications dans DEV1 seront automatiquement répliquées vers tous les autres environnements (UAT1, STAGING, PROD1) avec adaptation des noms d'environnement.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedEnv} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 h-11 bg-[var(--cream-200)] border border-[var(--border-light)] rounded-2xl p-1 mb-6">
          {ENVIRONMENTS.map((env) => (
            <TabsTrigger
              key={env}
              value={env}
              className="h-full flex items-center justify-center data-[state=active]:bg-[var(--lavender-500)] data-[state=active]:text-white data-[state=active]:shadow-sm text-[var(--text-secondary)] rounded-xl transition-all font-medium"
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
                title="Target Server Configuration"
                icon={<Server className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`targetServerName-${env}`} className="soft-label">
                      Target Server Name
                    </Label>
                    <Input
                      id={`targetServerName-${env}`}
                      value={targetServer?.name || ''}
                      disabled
                      className="soft-input font-mono text-sm opacity-60"
                    />
                    <p className="text-sm text-[var(--text-tertiary)]">Auto-generated based on proxy name</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`host-${env}`} className="soft-label">
                        Host
                      </Label>
                      <Input
                        id={`host-${env}`}
                        value={targetServer?.host || ''}
                        onChange={(e) => handleTargetServerChange('host', e.target.value)}
                        placeholder={`e.g., backend-${env}.elis.com`}
                        className="soft-input font-mono text-sm"
                      />
                      <p className="text-sm text-[var(--text-tertiary)]">e.g., backend-{env}.elis.com</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`port-${env}`} className="soft-label">
                        Port
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
                title="API Product Configuration"
                icon={<Package className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`productName-${env}`} className="soft-label">
                        Product Name
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
                        Display Name
                      </Label>
                      <Input
                        id={`displayName-${env}`}
                        value={apiProduct?.displayName || ''}
                        onChange={(e) => handleApiProductChange('displayName', e.target.value)}
                        className="soft-input text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`productDescription-${env}`} className="soft-label">
                      Description
                    </Label>
                    <Textarea
                      id={`productDescription-${env}`}
                      value={apiProduct?.description || ''}
                      onChange={(e) => handleApiProductChange('description', e.target.value)}
                      rows={2}
                      className="soft-input text-sm"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Key-Value Maps (KVM)"
                description="Manage encrypted key-value storage for backend credentials and configuration"
                icon={<Key className="h-5 w-5" />}
                action={
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddKVM}
                    className="soft-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add KVM
                  </Button>
                }
              >
                <div className="space-y-4">
                  {(!envConfig?.kvms || envConfig.kvms.length === 0) && (
                    <Alert className="soft-alert info">
                      <Key className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        No KVMs configured. Click "Add KVM" to create a key-value map for storing backend credentials or configuration.
                      </AlertDescription>
                    </Alert>
                  )}

                  {envConfig?.kvms?.map((kvm, kvmIndex) => (
                    <div key={kvmIndex} className="border-2 border-[var(--border-light)] rounded-2xl p-5 bg-[var(--cream-100)]">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-3 flex-1">
                          <div className="space-y-2">
                            <Label htmlFor={`kvm-name-${env}-${kvmIndex}`} className="soft-label">
                              KVM Name
                            </Label>
                            <Input
                              id={`kvm-name-${env}-${kvmIndex}`}
                              value={kvm.name}
                              onChange={(e) => handleKVMChange(kvmIndex, 'name', e.target.value)}
                              placeholder="my-backend-credentials"
                              className="soft-input font-mono text-sm"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`kvm-encrypted-${env}-${kvmIndex}`}
                              checked={kvm.encrypted}
                              onCheckedChange={(checked) => handleKVMChange(kvmIndex, 'encrypted', checked)}
                              className="border-[var(--border-medium)] data-[state=checked]:bg-[var(--lavender-500)] data-[state=checked]:border-[var(--lavender-500)]"
                            />
                            <Label
                              htmlFor={`kvm-encrypted-${env}-${kvmIndex}`}
                              className="text-sm font-normal cursor-pointer text-[var(--text-primary)]"
                            >
                              Encrypted (recommended for sensitive data like passwords)
                            </Label>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveKVM(kvmIndex)}
                          className="text-[var(--error-base)] hover:text-[var(--error-dark)] hover:bg-[var(--rose-soft)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Key-Value Entries</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddKVMEntry(kvmIndex)}
                            className="soft-button secondary h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Entry
                          </Button>
                        </div>

                        {(!kvm.entry || kvm.entry.length === 0) && (
                          <p className="text-sm text-[var(--text-tertiary)] italic">
                            No entries yet. Click "Add Entry" to add key-value pairs.
                          </p>
                        )}

                        <div className="space-y-2">
                          {kvm.entry?.map((entry, entryIndex) => (
                            <div key={entryIndex} className="flex items-center gap-2">
                              <Input
                                placeholder="Key (e.g., username)"
                                value={entry.name}
                                onChange={(e) => handleKVMEntryChange(kvmIndex, entryIndex, 'name', e.target.value)}
                                className="flex-1 soft-input font-mono text-sm"
                              />
                              <Input
                                placeholder="Value (e.g., admin)"
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
                                className="text-[var(--error-base)] hover:text-[var(--error-dark)] hover:bg-[var(--rose-soft)]"
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
