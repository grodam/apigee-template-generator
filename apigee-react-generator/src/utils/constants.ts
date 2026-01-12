export const ENVIRONMENTS = ['dev1', 'uat1', 'staging', 'prod1'] as const;
export type Environment = typeof ENVIRONMENTS[number];

export const AUTH_TYPES = ['Basic', 'OAuth2-ClientCredentials', 'ApiKey', 'None'] as const;
export type AuthType = typeof AUTH_TYPES[number];

export const OAS_VERSIONS = ['2.0', '3.0.0', '3.0.1', '3.0.3', '3.1.0'] as const;
export type OASVersion = typeof OAS_VERSIONS[number];

export const TEMPLATE_BASE_PATH = '/templates/nb-jwt-sb-basic';

export const DEFAULT_PORT = 443;
export const DEFAULT_GROUP_ID = 'com.elis.apigee';
export const DEFAULT_VERSION = '0.1.0-SNAPSHOT';
