import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { SwissCard } from './SwissCard';
import { HelpPanel } from '../Help/HelpPanel';
import { targetServersHelpContent } from '../Help/helpContent';
import { useProjectStore } from '../../store/useProjectStore';
import { ENVIRONMENTS } from '../../utils/constants';
import type { Environment } from '../../utils/constants';
import { cn } from '@/lib/utils';
import { InputWithTooltip } from '@/components/ui/InputWithTooltip';

interface TargetServersCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const TargetServersCard: React.FC<TargetServersCardProps> = React.memo(({ isExpanded, onToggle, disabled }) => {
  const { t } = useTranslation();
  const { apiConfig, updateEnvironmentConfig, autoDetectedConfig } = useProjectStore();
  const [selectedEnv, setSelectedEnv] = useState<Environment>('dev1');
  const [autoFilledHosts, setAutoFilledHosts] = useState<Set<string>>(new Set());
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [newKvmName, setNewKvmName] = useState('');
  const [isAddingKvm, setIsAddingKvm] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const hasAppliedAutoFill = useRef(false);

  // Toggle visibility for KVM entry values
  const toggleValueVisibility = (kvmIndex: number, entryIndex: number) => {
    const key = `${selectedEnv}-${kvmIndex}-${entryIndex}`;
    setVisibleValues(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isValueVisible = (kvmIndex: number, entryIndex: number) => {
    return visibleValues.has(`${selectedEnv}-${kvmIndex}-${entryIndex}`);
  };

  const currentEnvConfig = apiConfig.environments?.[selectedEnv];

  // Reset hasAppliedAutoFill when autoDetectedConfig changes (new spec loaded)
  useEffect(() => {
    if (!autoDetectedConfig) {
      hasAppliedAutoFill.current = false;
      setAutoFilledHosts(new Set());
    }
  }, [autoDetectedConfig]);

  // Apply auto-detected hosts when autoDetectedConfig is set
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

        if (targetServer && !targetServer.host) {
          const updatedTargetServers = [...envConfig.targetServers];
          updatedTargetServers[0] = {
            ...targetServer,
            host: envHost.host,
            port: envHost.port || 443,
          };
          updateEnvironmentConfig(env, {
            ...envConfig,
            targetServers: updatedTargetServers,
          });
          newAutoFilledHosts.add(env);
        }
      }
    }

    setAutoFilledHosts(newAutoFilledHosts);
  }, [autoDetectedConfig, apiConfig.environments, updateEnvironmentConfig]);

  // Calculate completion - count environments with configured hosts
  const configuredEnvs = ENVIRONMENTS.filter(env => {
    const envConfig = apiConfig.environments?.[env];
    return envConfig?.targetServers?.[0]?.host;
  });
  const completion = Math.round((configuredEnvs.length / ENVIRONMENTS.length) * 100);

  const handleTargetServerChange = (field: string, value: any) => {
    if (!currentEnvConfig) return;

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

    // Remove auto-fill indicator when user modifies host
    if (field === 'host') {
      setAutoFilledHosts(prev => {
        const next = new Set(prev);
        next.delete(selectedEnv);
        return next;
      });
    }
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

  const handleAddKVM = (kvmName: string) => {
    if (!currentEnvConfig || !kvmName.trim()) return;

    const newKVM = {
      name: kvmName.trim(),
      encrypted: true,
      entries: []
    };

    const updatedKVMs = [...(currentEnvConfig.kvms || []), newKVM];

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  const handleRemoveKVM = (kvmIndex: number) => {
    if (!currentEnvConfig || !currentEnvConfig.kvms) return;

    const updatedKVMs = currentEnvConfig.kvms.filter((_, i) => i !== kvmIndex);

    updateEnvironmentConfig(selectedEnv, {
      ...currentEnvConfig,
      kvms: updatedKVMs
    });
  };

  // Collapsed preview - compact table
  const targetPath = apiConfig.targetPath || autoDetectedConfig?.targetPath || '/';
  const collapsedPreview = (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-[var(--swiss-gray-200)]">
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-16">Env</th>
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-[40%]">Host</th>
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)]">Target Path</th>
          <th className="text-left py-2 font-bold uppercase text-[10px] text-[var(--swiss-gray-400)] w-16">Port</th>
        </tr>
      </thead>
      <tbody>
        {ENVIRONMENTS.map((env) => {
          const envConfig = apiConfig.environments?.[env];
          const targetServer = envConfig?.targetServers?.[0];

          return (
            <tr key={env} className={cn(
              "border-b border-[var(--swiss-gray-100)]",
              !targetServer?.host && "opacity-45"
            )}>
              <td className="py-2 font-mono font-bold">{env}</td>
              <td className="py-2 font-mono text-[var(--swiss-gray-600)]">
                {targetServer?.host || <span className="text-[var(--swiss-gray-300)]">Not configured</span>}
              </td>
              <td className="py-2 font-mono text-[var(--swiss-gray-600)]">
                {targetServer?.host ? targetPath : <span className="text-[var(--swiss-gray-300)]">-</span>}
              </td>
              <td className="py-2 font-mono">
                {targetServer?.host ? targetServer.port || 443 : <span className="text-[var(--swiss-gray-300)]">-</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const targetServer = currentEnvConfig?.targetServers?.[0];

  return (
    <>
    <SwissCard
      number="04"
      title={t('canvas.cards.targets.title', 'Target Servers')}
      subtitle={t('canvas.cards.targets.subtitle', 'Multi-environment target servers configuration')}
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

      {/* Environment Content */}
      <div className="space-y-6">
        {/* Target Path (from OpenAPI spec) */}
        {autoDetectedConfig?.targetPath && (
          <div className="bg-[var(--swiss-gray-50)] p-4 border-l-4 border-[var(--swiss-black)]">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase">
                {t('step1.fields.targetPath.label', 'Target Path')}
              </p>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-sm font-mono font-bold">{autoDetectedConfig.targetPath}</p>
            <p className="text-[10px] text-[var(--swiss-gray-400)] mt-1">
              {t('step1.fields.targetPath.tooltip', 'The path prefix to add when forwarding requests to the backend')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Target Server Name */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step3.targetServer.name', 'Target Server Name')} <span className="swiss-badge-auto">AUTO</span>
            </label>
            <InputWithTooltip tooltip={t('step3.targetServer.autoGenerated', 'Auto-generated based on proxy name')}>
              <input
                value={targetServer?.name || ''}
                disabled
                className="w-full bg-transparent border-b-2 border-[var(--swiss-gray-200)] py-2 text-sm font-medium font-mono opacity-60 pr-8"
              />
            </InputWithTooltip>
          </div>

          {/* Host */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step3.targetServer.host', 'Host')}
            </label>
            <InputWithTooltip
              tooltip="The hostname of your backend server for this environment"
              showSparkle={autoFilledHosts.has(selectedEnv)}
            >
              <input
                value={targetServer?.host || ''}
                onChange={(e) => handleTargetServerChange('host', e.target.value)}
                placeholder={`api-${selectedEnv}.example.com`}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-14"
              />
            </InputWithTooltip>
          </div>

          {/* Port */}
          <div>
            <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
              {t('step3.targetServer.port', 'Port')}
            </label>
            <InputWithTooltip tooltip="The port number of your backend server (default: 443 for HTTPS)">
              <input
                type="number"
                value={targetServer?.port || 443}
                onChange={(e) => handleTargetServerChange('port', parseInt(e.target.value))}
                className="w-full bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-medium font-mono focus:outline-none pr-8"
              />
            </InputWithTooltip>
          </div>
        </div>

        {/* SSL Options */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={targetServer?.sSLInfo?.enabled ?? true}
              onChange={(e) => handleTargetServerChange('sSLInfo', {
                ...targetServer?.sSLInfo,
                enabled: e.target.checked
              })}
              className="w-4 h-4 accent-[var(--swiss-black)]"
            />
            <span className="text-xs font-medium uppercase">SSL Enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={targetServer?.sSLInfo?.clientAuthEnabled ?? false}
              onChange={(e) => handleTargetServerChange('sSLInfo', {
                ...targetServer?.sSLInfo,
                clientAuthEnabled: e.target.checked
              })}
              className="w-4 h-4 accent-[var(--swiss-black)]"
            />
            <span className="text-xs font-medium uppercase">Client Auth</span>
          </label>
        </div>

        {/* KVMs */}
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--swiss-gray-400)] mb-3">
            KVM Entries
          </h4>

          {/* Existing KVMs */}
          <div className="space-y-3">
            {currentEnvConfig?.kvms?.map((kvm, kvmIndex) => (
              <div key={kvmIndex} className="border border-[var(--swiss-gray-200)] divide-y divide-[var(--swiss-gray-100)]">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--swiss-gray-50)]">
                  <span className="font-mono text-xs font-bold">{kvm.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[var(--swiss-gray-400)]">
                      {kvm.entries?.length || 0} entries
                    </span>
                    <button
                      onClick={() => handleRemoveKVM(kvmIndex)}
                      className="text-[var(--swiss-gray-400)] hover:text-red-500"
                      title="Delete KVM"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {kvm.entries?.map((entry, entryIndex) => (
                  <div key={entryIndex} className="flex items-center gap-2 px-4 py-2">
                    <input
                      value={entry.name}
                      onChange={(e) => handleKVMEntryChange(kvmIndex, entryIndex, 'name', e.target.value)}
                      placeholder="Key"
                      className="flex-1 bg-transparent border-b border-[var(--swiss-gray-200)] py-1 text-xs font-mono focus:outline-none focus:border-[var(--swiss-black)]"
                    />
                    <div className="flex-1 relative">
                      <input
                        value={entry.value}
                        onChange={(e) => handleKVMEntryChange(kvmIndex, entryIndex, 'value', e.target.value)}
                        placeholder="Value"
                        type={kvm.encrypted && !isValueVisible(kvmIndex, entryIndex) ? 'password' : 'text'}
                        className="w-full bg-transparent border-b border-[var(--swiss-gray-200)] py-1 text-xs font-mono focus:outline-none focus:border-[var(--swiss-black)] pr-7"
                      />
                      {kvm.encrypted && (
                        <button
                          type="button"
                          onClick={() => toggleValueVisibility(kvmIndex, entryIndex)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--swiss-gray-400)] hover:text-[var(--swiss-black)]"
                          title={isValueVisible(kvmIndex, entryIndex) ? 'Hide value' : 'Show value'}
                        >
                          {isValueVisible(kvmIndex, entryIndex) ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveKVMEntry(kvmIndex, entryIndex)}
                      className="text-[var(--swiss-gray-400)] hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddKVMEntry(kvmIndex)}
                  className="w-full px-4 py-2 text-[10px] font-bold uppercase text-[var(--swiss-gray-400)] hover:text-[var(--swiss-black)] hover:bg-[var(--swiss-gray-50)] flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Entry
                </button>
              </div>
            ))}
          </div>

          {/* Add New KVM */}
          {isAddingKvm ? (
            <div className="mt-3 border border-dashed border-[var(--swiss-gray-300)] p-4">
              <label className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase block mb-2">
                Map Identifier (KVM Name)
              </label>
              <div className="flex gap-2">
                <input
                  value={newKvmName}
                  onChange={(e) => setNewKvmName(e.target.value)}
                  placeholder="e.g., my-app.v1.config"
                  className="flex-1 bg-transparent border-b-2 border-[var(--swiss-black)] py-2 text-sm font-mono focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newKvmName.trim()) {
                      handleAddKVM(newKvmName);
                      setNewKvmName('');
                      setIsAddingKvm(false);
                    } else if (e.key === 'Escape') {
                      setNewKvmName('');
                      setIsAddingKvm(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (newKvmName.trim()) {
                      handleAddKVM(newKvmName);
                      setNewKvmName('');
                      setIsAddingKvm(false);
                    }
                  }}
                  disabled={!newKvmName.trim()}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase",
                    newKvmName.trim()
                      ? "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
                      : "bg-[var(--swiss-gray-200)] text-[var(--swiss-gray-400)] cursor-not-allowed"
                  )}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setNewKvmName('');
                    setIsAddingKvm(false);
                  }}
                  className="px-4 py-2 text-[10px] font-black uppercase text-[var(--swiss-gray-500)] hover:text-[var(--swiss-black)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingKvm(true)}
              className="mt-3 w-full px-4 py-3 border-2 border-dashed border-[var(--swiss-gray-300)] text-[10px] font-bold uppercase text-[var(--swiss-gray-400)] hover:text-[var(--swiss-black)] hover:border-[var(--swiss-black)] flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add KVM
            </button>
          )}
        </div>
      </div>
    </SwissCard>

    {/* Help Panel */}
    <HelpPanel
      isOpen={isHelpOpen}
      onClose={() => setIsHelpOpen(false)}
      {...targetServersHelpContent}
    />
    </>
  );
});
