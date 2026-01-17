import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface KvmEntry {
  name: string;
  value: string;
}

export interface Kvm {
  name: string;
  encrypted: boolean;
  keyValueEntries?: KvmEntry[];
}

export interface KvmConsoleMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type KvmScope = 'environment' | 'proxy';

export interface GcpConnection {
  organizationId: string;
  accessToken: string;
  tokenExpiry: Date | null;
  isConnected: boolean;
}

interface KvmState {
  // Connection
  connection: GcpConnection;

  // Navigation state
  selectedEnvironment: string | null;
  selectedScope: KvmScope;
  selectedProxyName: string | null;
  selectedKvmName: string | null;

  // Data
  environments: string[];
  proxies: string[];
  envKvmsByEnvironment: Record<string, string[]>;
  proxyKvmsByProxy: Record<string, string[]>;
  kvmToProxyMapping: Record<string, Record<string, string>>; // env -> kvm -> proxy
  currentKvm: Kvm | null;
  originalKvm: Kvm | null; // For tracking changes

  // UI state
  viewMode: 'json' | 'table';
  isLoading: boolean;
  isSaving: boolean;
  isConnecting: boolean;
  hasUnsavedChanges: boolean;

  // Sidebar expansion state
  expandedEnvironments: Set<string>;
  expandedProxies: Set<string>;

  // Console messages
  consoleMessages: KvmConsoleMessage[];

  // Actions - Connection
  setConnection: (conn: Partial<GcpConnection>) => void;
  connect: (organizationId: string, accessToken: string, tokenExpiry?: Date | null) => void;
  disconnect: () => void;
  setConnecting: (connecting: boolean) => void;
  setTokenExpiry: (expiry: Date | null) => void;

  // Actions - Navigation
  setSelectedEnvironment: (env: string | null) => void;
  setSelectedScope: (scope: KvmScope) => void;
  setSelectedProxyName: (proxy: string | null) => void;
  setSelectedKvm: (kvmName: string | null) => void;

  // Actions - Data
  setEnvironments: (envs: string[]) => void;
  setProxies: (proxies: string[]) => void;
  setEnvKvmsForEnvironment: (env: string, kvms: string[]) => void;
  setProxyKvmsForProxy: (proxy: string, kvms: string[]) => void;
  setKvmToProxyMapping: (env: string, mapping: Map<string, string>) => void;
  setCurrentKvm: (kvm: Kvm | null) => void;

  // Actions - UI
  setViewMode: (mode: 'json' | 'table') => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;

  // Actions - Sidebar
  toggleEnvironmentExpanded: (env: string) => void;
  toggleProxyExpanded: (proxy: string) => void;

  // Actions - KVM entry mutations
  updateEntry: (name: string, value: string) => void;
  addEntry: (name: string, value: string) => void;
  deleteEntry: (name: string) => void;
  updateEntriesFromJson: (entries: KvmEntry[]) => void;

  // Actions - Console
  addConsoleMessage: (message: Omit<KvmConsoleMessage, 'timestamp'>) => void;
  clearConsole: () => void;

  // Actions - Reset
  reset: () => void;
  resetData: () => void;
}

const initialConnection: GcpConnection = {
  organizationId: '',
  accessToken: '',
  tokenExpiry: null,
  isConnected: false,
};

const getTimestamp = (): string => {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const useKvmStore = create<KvmState>()(
  persist(
    (set, get) => ({
      // Initial state
      connection: initialConnection,

      selectedEnvironment: null,
      selectedScope: 'environment',
      selectedProxyName: null,
      selectedKvmName: null,

      environments: [],
      proxies: [],
      envKvmsByEnvironment: {},
      proxyKvmsByProxy: {},
      kvmToProxyMapping: {},
      currentKvm: null,
      originalKvm: null,

      viewMode: 'table',
      isLoading: false,
      isSaving: false,
      isConnecting: false,
      hasUnsavedChanges: false,

      expandedEnvironments: new Set<string>(),
      expandedProxies: new Set<string>(),

      consoleMessages: [],

      // Connection actions
      setConnection: (conn) =>
        set((state) => ({
          connection: { ...state.connection, ...conn },
        })),

      connect: (organizationId, accessToken, providedTokenExpiry) => {
        // Use provided expiry if available, otherwise try to parse from JWT
        let tokenExpiry: Date | null = providedTokenExpiry || null;

        if (!tokenExpiry) {
          // Try to parse token expiry from JWT
          try {
            const parts = accessToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.exp) {
                tokenExpiry = new Date(payload.exp * 1000);
              }
            }
          } catch {
            // Token might not be a valid JWT, that's okay
          }
        }

        // If we still don't have expiry, it will be fetched from Google tokeninfo endpoint
        // and updated via setTokenExpiry action

        set({
          connection: {
            organizationId,
            accessToken,
            tokenExpiry,
            isConnected: true,
          },
        });

        get().addConsoleMessage({
          type: 'success',
          message: `Connected to organization: ${organizationId}`,
        });
      },

      disconnect: () => {
        set({
          connection: initialConnection,
          environments: [],
          proxies: [],
          envKvmsByEnvironment: {},
          proxyKvmsByProxy: {},
          kvmToProxyMapping: {},
          currentKvm: null,
          originalKvm: null,
          selectedEnvironment: null,
          selectedProxyName: null,
          selectedKvmName: null,
          hasUnsavedChanges: false,
          expandedEnvironments: new Set<string>(),
          expandedProxies: new Set<string>(),
        });

        get().addConsoleMessage({
          type: 'info',
          message: 'Disconnected from Apigee',
        });
      },

      setConnecting: (connecting) => set({ isConnecting: connecting }),

      setTokenExpiry: (expiry) =>
        set((state) => ({
          connection: { ...state.connection, tokenExpiry: expiry },
        })),

      // Navigation actions
      setSelectedEnvironment: (env) =>
        set({
          selectedEnvironment: env,
          selectedProxyName: null,
          selectedKvmName: null,
          currentKvm: null,
          originalKvm: null,
          hasUnsavedChanges: false,
        }),

      setSelectedScope: (scope) =>
        set({
          selectedScope: scope,
          selectedKvmName: null,
          currentKvm: null,
          originalKvm: null,
          hasUnsavedChanges: false,
        }),

      setSelectedProxyName: (proxy) =>
        set({
          selectedProxyName: proxy,
          selectedKvmName: null,
          currentKvm: null,
          originalKvm: null,
          hasUnsavedChanges: false,
        }),

      setSelectedKvm: (kvmName) =>
        set({
          selectedKvmName: kvmName,
          currentKvm: null,
          originalKvm: null,
          hasUnsavedChanges: false,
        }),

      // Data actions
      setEnvironments: (envs) => set({ environments: envs }),

      setProxies: (proxies) => set({ proxies }),

      setEnvKvmsForEnvironment: (env, kvms) =>
        set((state) => ({
          envKvmsByEnvironment: {
            ...state.envKvmsByEnvironment,
            [env]: kvms,
          },
        })),

      setProxyKvmsForProxy: (proxy, kvms) =>
        set((state) => ({
          proxyKvmsByProxy: {
            ...state.proxyKvmsByProxy,
            [proxy]: kvms,
          },
        })),

      setKvmToProxyMapping: (env, mapping) =>
        set((state) => {
          // Convert Map to Record
          const record: Record<string, string> = {};
          mapping.forEach((proxyName, kvmName) => {
            record[kvmName] = proxyName;
          });
          return {
            kvmToProxyMapping: {
              ...state.kvmToProxyMapping,
              [env]: record,
            },
          };
        }),

      setCurrentKvm: (kvm) =>
        set({
          currentKvm: kvm,
          originalKvm: kvm ? JSON.parse(JSON.stringify(kvm)) : null,
          hasUnsavedChanges: false,
        }),

      // UI actions
      setViewMode: (mode) => set({ viewMode: mode }),
      setLoading: (loading) => set({ isLoading: loading }),
      setSaving: (saving) => set({ isSaving: saving }),
      setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

      // Sidebar actions
      toggleEnvironmentExpanded: (env) =>
        set((state) => {
          const newSet = new Set(state.expandedEnvironments);
          if (newSet.has(env)) {
            newSet.delete(env);
          } else {
            newSet.add(env);
          }
          return { expandedEnvironments: newSet };
        }),

      toggleProxyExpanded: (proxy) =>
        set((state) => {
          const newSet = new Set(state.expandedProxies);
          if (newSet.has(proxy)) {
            newSet.delete(proxy);
          } else {
            newSet.add(proxy);
          }
          return { expandedProxies: newSet };
        }),

      // KVM entry mutations
      updateEntry: (name, value) =>
        set((state) => {
          if (!state.currentKvm) return state;

          const entries = state.currentKvm.keyValueEntries || [];
          const updatedEntries = entries.map((entry) =>
            entry.name === name ? { ...entry, value } : entry
          );

          return {
            currentKvm: {
              ...state.currentKvm,
              keyValueEntries: updatedEntries,
            },
            hasUnsavedChanges: true,
          };
        }),

      addEntry: (name, value) =>
        set((state) => {
          if (!state.currentKvm) return state;

          const entries = state.currentKvm.keyValueEntries || [];
          const newEntries = [...entries, { name, value }];

          return {
            currentKvm: {
              ...state.currentKvm,
              keyValueEntries: newEntries,
            },
            hasUnsavedChanges: true,
          };
        }),

      deleteEntry: (name) =>
        set((state) => {
          if (!state.currentKvm) return state;

          const entries = state.currentKvm.keyValueEntries || [];
          const filteredEntries = entries.filter((entry) => entry.name !== name);

          return {
            currentKvm: {
              ...state.currentKvm,
              keyValueEntries: filteredEntries,
            },
            hasUnsavedChanges: true,
          };
        }),

      updateEntriesFromJson: (entries) =>
        set((state) => {
          if (!state.currentKvm) return state;

          return {
            currentKvm: {
              ...state.currentKvm,
              keyValueEntries: entries,
            },
            hasUnsavedChanges: true,
          };
        }),

      // Console actions
      addConsoleMessage: (message) =>
        set((state) => ({
          consoleMessages: [
            ...state.consoleMessages,
            {
              ...message,
              timestamp: getTimestamp(),
            },
          ],
        })),

      clearConsole: () => set({ consoleMessages: [] }),

      // Reset actions
      reset: () =>
        set({
          connection: initialConnection,
          selectedEnvironment: null,
          selectedScope: 'environment',
          selectedProxyName: null,
          selectedKvmName: null,
          environments: [],
          proxies: [],
          envKvmsByEnvironment: {},
          proxyKvmsByProxy: {},
          kvmToProxyMapping: {},
          currentKvm: null,
          originalKvm: null,
          isLoading: false,
          isSaving: false,
          isConnecting: false,
          hasUnsavedChanges: false,
          expandedEnvironments: new Set<string>(),
          expandedProxies: new Set<string>(),
          consoleMessages: [],
        }),

      resetData: () =>
        set({
          environments: [],
          proxies: [],
          envKvmsByEnvironment: {},
          proxyKvmsByProxy: {},
          kvmToProxyMapping: {},
          currentKvm: null,
          originalKvm: null,
          selectedEnvironment: null,
          selectedProxyName: null,
          selectedKvmName: null,
          hasUnsavedChanges: false,
          expandedEnvironments: new Set<string>(),
          expandedProxies: new Set<string>(),
        }),
    }),
    {
      name: 'kvm-manager-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist org ID and view mode (NOT token for security)
        connection: {
          organizationId: state.connection.organizationId,
        },
        viewMode: state.viewMode,
      }),
      // Custom merge to handle Set serialization
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<KvmState>;
        return {
          ...currentState,
          connection: {
            ...currentState.connection,
            organizationId: persisted.connection?.organizationId || '',
          },
          viewMode: persisted.viewMode || 'table',
        };
      },
    }
  )
);
