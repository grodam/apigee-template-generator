/**
 * Apigee Management API Types
 */

// KVM Entry
export interface ApigeeKvmEntry {
  name: string;
  value: string;
}

// KVM (Key-Value Map)
export interface ApigeeKvm {
  name: string;
  encrypted: boolean;
  keyValueEntries?: ApigeeKvmEntry[];
}

// List KVMs response (environment or proxy scoped)
export interface ApigeeKvmListResponse {
  keyValueMap?: ApigeeKvm[];
}

// Organization info
export interface ApigeeOrganization {
  name: string;
  displayName?: string;
  description?: string;
  environments?: string[];
  properties?: {
    property?: Array<{
      name: string;
      value: string;
    }>;
  };
}

// Environment info
export interface ApigeeEnvironment {
  name: string;
  displayName?: string;
  description?: string;
}

// List environments response
export interface ApigeeEnvironmentsResponse {
  environment?: ApigeeEnvironment[];
}

// API Proxy info
export interface ApigeeApiProxy {
  name: string;
  revision?: string[];
  latestRevisionId?: string;
}

// List API Proxies response
export interface ApigeeApiProxiesResponse {
  proxies?: ApigeeApiProxy[];
}

// Apigee API error response
export interface ApigeeErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details?: unknown[];
  };
}

// Create KVM request
export interface CreateKvmRequest {
  name: string;
  encrypted: boolean;
}

// Create/Update KVM entry request
export interface UpsertKvmEntryRequest {
  name: string;
  value: string;
}
