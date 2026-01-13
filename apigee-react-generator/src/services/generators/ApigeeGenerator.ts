import type { ApiConfiguration } from '../../models/ApiConfiguration';
import type { GeneratedProject } from '../../models/GeneratedProject';
import type { AzureDevOpsConfig, PortalConfig } from '../../models/AzureDevOpsConfig';
import type { OpenAPIDocument } from '../../types/openapi';
import { TemplateLoader } from '../templates/TemplateLoader';
import { FlowGenerator } from './FlowGenerator';
import { PolicyGenerator } from './PolicyGenerator';
import { ConfigGenerator } from './ConfigGenerator';
import { DEFAULT_GROUP_ID, DEFAULT_VERSION, ENVIRONMENTS } from '../../utils/constants';
import { escapeXml } from '../../utils/xmlUtils';
import { logger } from '../../utils/logger';

const log = logger.scope('ApigeeGenerator');

export class ApigeeProjectGenerator {
  private config: ApiConfiguration;
  private openAPI: OpenAPIDocument;
  private templateLoader: TemplateLoader;
  private azureDevOpsConfig?: AzureDevOpsConfig;
  private portalConfig?: PortalConfig;

  constructor(
    config: ApiConfiguration,
    openAPI: OpenAPIDocument,
    azureDevOpsConfig?: AzureDevOpsConfig,
    portalConfig?: PortalConfig
  ) {
    this.config = config;
    this.openAPI = openAPI;
    this.templateLoader = new TemplateLoader();
    this.azureDevOpsConfig = azureDevOpsConfig;
    this.portalConfig = portalConfig;
  }

  async generate(): Promise<GeneratedProject> {
    const project: GeneratedProject = {
      rootDir: this.config.proxyName,
      files: new Map(),
    };

    // 1. Générer le POM racine
    await this.generateRootPom(project);

    // 2. Générer le proxy XML principal
    await this.generateProxyRoot(project);

    // 3. Générer les proxy endpoints (flows)
    await this.generateProxyEndpoints(project);

    // 4. Générer les target endpoints
    await this.generateTargetEndpoints(project);

    // 5. Générer les policies
    await this.generatePolicies(project);

    // 6. Générer les configurations environnements
    this.generateEnvironmentConfigs(project);

    // 7. Générer le POM gateway
    await this.generateGatewayPom(project);

    // 8. Copier les fichiers de linting
    await this.copyLintingFiles(project);

    // 9. Générer apigee-configuration.json
    this.generateApigeeConfiguration(project);

    // 10. Copier la spec OpenAPI
    this.copyOpenAPISpec(project);

    // 10b. Générer les swagger par environnement pour le portail
    this.generatePortalSwaggerFiles(project);

    // 11. Générer les fichiers Git et CI/CD
    this.generateGitFiles(project);

    // 12. Générer le README
    this.generateReadme(project);

    // 13. Générer les fichiers Maven wrapper
    this.generateMavenWrapper(project);

    return project;
  }

  private async generateRootPom(project: GeneratedProject): Promise<void> {
    try {
      const template = await this.templateLoader.load('root-pom-template.xml');

      const pom = template
        .replace(/{{groupId}}/g, DEFAULT_GROUP_ID)
        .replace(/{{artifactId}}/g, this.config.proxyName)
        .replace(/{{version}}/g, DEFAULT_VERSION)
        .replace(/{{projectName}}/g, this.config.proxyName);

      project.files.set('pom.xml', pom);
    } catch (error) {
      log.error('Error generating root POM', error);
      throw error;
    }
  }

  private async generateGatewayPom(project: GeneratedProject): Promise<void> {
    try {
      const template = await this.templateLoader.load('gateway-pom-template.xml');

      const pom = template
        .replace(/{{artifactId}}/g, this.config.proxyName)
        .replace(/{{name}}/g, this.config.proxyName);

      project.files.set('src/main/apigee/gateway/pom.xml', pom);
    } catch (error) {
      log.error('Error generating gateway POM', error);
      throw error;
    }
  }

  private async generateProxyRoot(project: GeneratedProject): Promise<void> {
    try {
      const template = await this.templateLoader.load('proxy-template.xml');

      // Sanitize values for safe XML injection
      const proxyXml = template
        .replace(/{{proxyName}}/g, escapeXml(this.config.proxyName))
        .replace(/{{displayName}}/g, escapeXml(`${this.config.apiname} - ${this.config.version}`))
        .replace(/{{description}}/g, escapeXml(this.config.description))
        .replace(/{{basepath}}/g, escapeXml(this.config.proxyBasepath));

      project.files.set(
        `src/main/apigee/gateway/apiproxy/${this.config.proxyName}.xml`,
        proxyXml
      );
    } catch (error) {
      log.error('Error generating proxy root', error);
      throw error;
    }
  }

  private async generateProxyEndpoints(project: GeneratedProject): Promise<void> {
    const flowGenerator = new FlowGenerator(this.config, this.openAPI);
    const flows = flowGenerator.generateFlows();

    try {
      const template = await this.templateLoader.load('proxies/default-template.xml');

      // Remplacer les placeholders
      let proxyEndpoint = template
        .replace(/{{basepath}}/g, this.config.proxyBasepath)
        .replace(/{{flows}}/g, flows);

      // Gérer les conditions Handlebars-like
      proxyEndpoint = this.processConditionals(proxyEndpoint);

      project.files.set(
        'src/main/apigee/gateway/apiproxy/proxies/default.xml',
        proxyEndpoint
      );
    } catch (error) {
      log.error('Error generating proxy endpoints', error);
      throw error;
    }
  }

  private async generateTargetEndpoints(project: GeneratedProject): Promise<void> {
    try {
      // Target principal
      const defaultTemplate = await this.templateLoader.load('targets/default-template.xml');
      // Target server name format: [entity].[backendApps].[version].backend
      const targetServerName = `${this.config.entity}.${this.config.backendApps.join('-')}.${this.config.version}.backend`;

      let defaultTarget = defaultTemplate
        .replace(/{{targetServerName}}/g, targetServerName)
        .replace(/{{targetPath}}/g, this.config.targetPath);

      // Process conditionals for southbound auth
      defaultTarget = this.processConditionals(defaultTarget);

      project.files.set(
        'src/main/apigee/gateway/apiproxy/targets/default.xml',
        defaultTarget
      );

      // Target mock (si URL mock définie)
      if (this.config.mockUrl) {
        const mockTemplate = await this.templateLoader.load('targets/mock-template.xml');
        const mockTarget = mockTemplate.replace(/{{mockUrl}}/g, this.config.mockUrl);

        project.files.set(
          'src/main/apigee/gateway/apiproxy/targets/mock.xml',
          mockTarget
        );
      }
    } catch (error) {
      log.error('Error generating target endpoints', error);
      throw error;
    }
  }

  private async generatePolicies(project: GeneratedProject): Promise<void> {
    const policyGen = new PolicyGenerator(this.config, this.openAPI);
    const policies = await policyGen.generateAllPolicies();

    for (const [filename, content] of policies) {
      project.files.set(
        `src/main/apigee/gateway/apiproxy/policies/${filename}`,
        content
      );
    }
  }

  private generateEnvironmentConfigs(project: GeneratedProject): void {
    const configGen = new ConfigGenerator(this.config, this.openAPI);

    for (const env of ENVIRONMENTS) {
      const envConfig = this.config.environments[env];

      // edge-env.json
      const edgeEnv = configGen.generateEdgeEnvJson(env, envConfig);
      const edgeEnvStr = JSON.stringify(edgeEnv, null, 2);

      project.files.set(
        `src/main/apigee/gateway/config/${env}/edge-env.json`,
        edgeEnvStr
      );
      project.files.set(
        `src/main/resources/api-config/config/${env}/edge-env.json`,
        edgeEnvStr
      );

      // edge-org.json
      const edgeOrg = configGen.generateEdgeOrgJson(env, envConfig);
      const edgeOrgStr = JSON.stringify(edgeOrg, null, 2);

      project.files.set(
        `src/main/apigee/gateway/config/${env}/edge-org.json`,
        edgeOrgStr
      );
      project.files.set(
        `src/main/resources/api-config/config/${env}/edge-org.json`,
        edgeOrgStr
      );
    }
  }

  private async copyLintingFiles(project: GeneratedProject): Promise<void> {
    try {
      // EX-ODM002-NamingConventions.js - Full linting plugin for Apigee policy naming conventions
      const namingConventions = `const plugin = {
  ruleId: "EX-ODM002",
  name: "Policy Naming Conventions - Type Indication",
  message: "It is recommended that the policy name include an indicator of the policy type.",
  fatal: false,
  severity: 2, //error
  nodeType: "Policy",
  enabled: true
},
policyMetaData = {
  //Traffic Management
  Quota: { indications: ["QO-"] },
  SpikeArrest: { indications: ["SA-"] },
  ConcurrentRateLimit: { indications: ["CRL-"] },
  ResponseCache: { indications: ["RC-"] },
  LookupCache: { indications: ["LC-"] },
  PopulateCache: { indications: ["PC-"] },
  InvalidateCache: { indications: ["IC-"] },
  ResetQuota: { indications: ["RQ-"] },
  //Security
  BasicAuthentication: {indications: ["BA-"] },
  XMLThreatProtection: { indications: ["XTP-"] },
  JSONThreatProtection: { indications: ["JTP-"] },
  RegularExpressionProtection: { indications: ["REP-"] },
  OAuthV1: { indications: ["OA-"]},
  GetOAuthV1Info:{indications: ["OA1-"]},
  DeleteOAuthV1Info:{indications: ["O1-"]},
  OAuthV2: {indications: ["O2-"]},
  GetOAuthV2Info: {indications: ["O2-"]},
  SetOAuthV2Info: {indications: ["O2-"]},
  DeleteOAuthV2Info: {indications: ["O2-"]},
  VerifyAPIKey: { indications: ["VK-"] },
  AccessControl: { indications: ["AC-"] },
  Ldap: { indications: ["LD-"] },
  GenerateSAMLAssertion: { indications: ["GEN-"] },
  ValidateSAMLAssertion: { indications: ["SAML-"] },
  GenerateJWT: { indications: ["JW1-"] },
  VerifyJWT: { indications: ["JW1-"] },
  DecodeJWT: { indications: ["JWT-"] },
  GenerateJWS: { indications: ["JWS-"] },
  VerifyJWS: { indications: ["JWS-"] },
  DecodeJWS: { indications: ["JWS-"] },
  //Mediation
  JSONToXML: { indications: ["JX-"] },
  XMLToJSON: { indications: ["XTJ-"] },
  RaiseFault: { indications: ["RF-"] },
  XSL: { indications: ["XSL-"] },
  MessageValidation: { indications: ["MV-"] },
  AssignMessage: { indications: ["AM-"] },
  ExtractVariables: { indications: ["EV-"] },
  AccessEntity: { indications: ["AE-"] },
  KeyValueMapOperations: { indications: ["KVM-"] },
  //Extension
  JavaCallout: { indications: ["JC-"] },
  Javascript: { indications: ["JS-"] },
  Script: { indications: ["PY-"] },
  ServiceCallout: { indications: ["SC-"] },
  FlowCallout: { indications: ["FC-"] },
  StatisticsCollector: { indications: ["SC-"] },
  MessageLogging: { indications: ["ML-"] },
  "": { indications: [] }
};

const onPolicy = function(policy, cb) {
  let displayName = policy.getDisplayName(),
    policyType = policy.getType(),
    prefixes = policyMetaData[policyType],
    hadWarn = false;

  if (prefixes && prefixes.indications.length > 0) {
    if (
      !prefixes.indications.some(function(indication) {
        return displayName.startsWith(indication);
      })
    ) {
      hadWarn = true;
      policy.addMessage({
        plugin,
        message:
          "Non-standard name for policy (" +
          policy.getDisplayName() +
          "). Valid prefixes include: { " +
          prefixes.indications.join(", ") +
          " }"
      });
    }
  }
  if (typeof cb == "function") {
    cb(null, hadWarn);
  }
};

module.exports = {
  plugin,
  onPolicy
};`;
      project.files.set('src/main/apigee/apigee-lint/EX-ODM002-NamingConventions.js', namingConventions);

      // .spectral.yaml - OpenAPI linting with OWASP security rules
      const spectral = `formats:
  - oas3
extends:
  - 'https://cdn.jsdelivr.net/npm/@stoplight/spectral-owasp-ruleset@1.4.3/dist/ruleset.min.js'`;
      project.files.set('src/main/apigee/spectral-lint/.spectral.yaml', spectral);
    } catch (error) {
      log.error('Error copying linting files', error);
    }
  }

  private generateApigeeConfiguration(project: GeneratedProject): void {
    const configGen = new ConfigGenerator(this.config, this.openAPI);
    const config = configGen.generateApigeConfiguration();

    project.files.set(
      'src/main/resources/api-config/apigee-configuration.json',
      JSON.stringify(config, null, 2)
    );
  }

  private copyOpenAPISpec(project: GeneratedProject): void {
    // backend.json - spec backend (spec originale telle quelle)
    const backendContent = JSON.stringify(this.openAPI, null, 2);
    project.files.set('src/main/resources/api-config/backend.json', backendContent);

    // swagger.json - spec publique Apigee avec URLs Apigee (pas backend)
    const publicSpec = JSON.parse(JSON.stringify(this.openAPI)); // Deep copy

    // Supprimer les rubriques servers et security vides ou en doublon de l'original
    if (publicSpec.servers && (Array.isArray(publicSpec.servers) && publicSpec.servers.length === 0)) {
      delete publicSpec.servers;
    }
    if (publicSpec.security && (Array.isArray(publicSpec.security) && publicSpec.security.length === 0)) {
      delete publicSpec.security;
    }

    // Nettoyer les security vides au niveau des opérations dans paths
    if (publicSpec.paths) {
      for (const pathKey of Object.keys(publicSpec.paths)) {
        const pathItem = publicSpec.paths[pathKey];
        for (const method of Object.keys(pathItem)) {
          const operation = pathItem[method];
          if (operation && typeof operation === 'object') {
            // Supprimer security vide au niveau opération
            if (operation.security && Array.isArray(operation.security) && operation.security.length === 0) {
              delete operation.security;
            }
            // Supprimer servers vide au niveau opération
            if (operation.servers && Array.isArray(operation.servers) && operation.servers.length === 0) {
              delete operation.servers;
            }
          }
        }
      }
    }

    // Remplacer les servers par les URLs Apigee avec le basepath en suffixe
    const basePath = this.config.proxyBasepath.startsWith('/')
      ? this.config.proxyBasepath
      : '/' + this.config.proxyBasepath;

    // Use portal config URLs if available, otherwise use defaults
    const devUrl = this.portalConfig?.portalUrls.dev1 || 'https://dev-api.elis.com';
    const uatUrl = this.portalConfig?.portalUrls.uat1 || 'https://uat-api.elis.com';
    const prodUrl = this.portalConfig?.portalUrls.prod1 || 'https://api.elis.com';
    const oktaNonProdUrl = this.portalConfig?.oktaNonProdUrl || 'https://elis-employees.oktapreview.com/oauth2/aus4i6p4rkZwGMAJC0x7/v1/token';

    publicSpec.servers = [
      { url: devUrl + basePath, description: 'DEV Env' },
      { url: uatUrl + basePath, description: 'UAT Env' },
      { url: prodUrl + basePath, description: 'PROD Env' }
    ];

    // Mettre à jour le info avec le titre et description Apigee
    if (publicSpec.info) {
      publicSpec.info.title = this.config.apiname + ' API';
      publicSpec.info.description = this.config.description;
      publicSpec.info.version = this.config.version;
      publicSpec.info.contact = { name: this.config.entity, url: '', email: '' };
    }

    // Remplacer les securitySchemes par OAuth2 avec URL Apigee
    if (!publicSpec.components) {
      publicSpec.components = {};
    }
    publicSpec.components.securitySchemes = {
      oauth2: {
        type: 'oauth2',
        description: `For direct access token use the following URL = ${oktaNonProdUrl}`,
        flows: {
          clientCredentials: {
            tokenUrl: devUrl + '/oauth2',
            scopes: {}
          }
        }
      }
    };

    // Remplacer la section security par OAuth2
    publicSpec.security = [{ oauth2: [] }];

    // Les paths restent inchangés car le basepath est maintenant dans les URLs servers

    // Réordonner les clés: openapi, info, servers, components, security, paths, puis le reste
    const orderedSpec: Record<string, unknown> = {};

    // Clés prioritaires dans l'ordre souhaité
    if (publicSpec.openapi) orderedSpec.openapi = publicSpec.openapi;
    if (publicSpec.info) orderedSpec.info = publicSpec.info;
    if (publicSpec.servers) orderedSpec.servers = publicSpec.servers;
    if (publicSpec.components) orderedSpec.components = publicSpec.components;
    if (publicSpec.security) orderedSpec.security = publicSpec.security;
    if (publicSpec.paths) orderedSpec.paths = publicSpec.paths;

    // Ajouter les autres clés restantes (tags, externalDocs, etc.)
    for (const key of Object.keys(publicSpec)) {
      if (!orderedSpec[key]) {
        orderedSpec[key] = publicSpec[key];
      }
    }

    project.files.set('src/main/resources/api-config/swagger.json', JSON.stringify(orderedSpec, null, 2));
  }

  /**
   * Generate environment-specific swagger files for the API Portal.
   * Each file contains only the portal URL for that environment and the corresponding Okta OAuth URL.
   * Files are placed in swagger-portal/ subfolder: swagger-dev1.json, swagger-uat1.json, etc.
   */
  private generatePortalSwaggerFiles(project: GeneratedProject): void {
    if (!this.portalConfig) {
      log.debug('No portal config provided, skipping portal swagger generation');
      return;
    }

    const basePath = this.config.proxyBasepath.startsWith('/')
      ? this.config.proxyBasepath
      : '/' + this.config.proxyBasepath;

    // Map environment to portal URL and Okta URL
    const envConfigs: Array<{
      env: string;
      portalUrl: string;
      oktaUrl: string;
      description: string;
    }> = [
      {
        env: 'dev1',
        portalUrl: this.portalConfig.portalUrls.dev1,
        oktaUrl: this.portalConfig.oktaNonProdUrl,
        description: 'DEV Environment'
      },
      {
        env: 'uat1',
        portalUrl: this.portalConfig.portalUrls.uat1,
        oktaUrl: this.portalConfig.oktaNonProdUrl,
        description: 'UAT Environment'
      },
      {
        env: 'staging',
        portalUrl: this.portalConfig.portalUrls.staging,
        oktaUrl: this.portalConfig.oktaNonProdUrl,
        description: 'Staging Environment'
      },
      {
        env: 'prod1',
        portalUrl: this.portalConfig.portalUrls.prod1,
        oktaUrl: this.portalConfig.oktaProdUrl,
        description: 'Production Environment'
      }
    ];

    for (const envConfig of envConfigs) {
      const portalSpec = JSON.parse(JSON.stringify(this.openAPI)); // Deep copy

      // Remove backend-related servers and security completely
      // These will be replaced with portal-specific values
      delete portalSpec.servers;
      delete portalSpec.security;

      // Remove backend securitySchemes from components (will be replaced with OAuth2)
      if (portalSpec.components?.securitySchemes) {
        delete portalSpec.components.securitySchemes;
      }

      // Clean servers and security at operation level (backend-specific, not relevant for portal)
      if (portalSpec.paths) {
        for (const pathKey of Object.keys(portalSpec.paths)) {
          const pathItem = portalSpec.paths[pathKey];
          for (const method of Object.keys(pathItem)) {
            const operation = pathItem[method];
            if (operation && typeof operation === 'object') {
              // Remove operation-level security (backend auth requirements)
              delete operation.security;
              // Remove operation-level servers (backend URLs)
              delete operation.servers;
            }
          }
        }
      }

      // Set single server URL for this environment
      portalSpec.servers = [
        { url: envConfig.portalUrl + basePath, description: envConfig.description }
      ];

      // Update info
      if (portalSpec.info) {
        portalSpec.info.title = this.config.apiname + ' API';
        portalSpec.info.description = this.config.description;
        portalSpec.info.version = this.config.version;
        portalSpec.info.contact = { name: this.config.entity, url: '', email: '' };
      }

      // Build components with OAuth2 security scheme FIRST, then schemas
      const portalComponents: Record<string, any> = {};

      // Add OAuth2 security scheme for portal FIRST (before schemas)
      portalComponents.securitySchemes = {
        oauth2: {
          type: 'oauth2',
          description: `For direct access token use the following URL = ${envConfig.oktaUrl}`,
          flows: {
            clientCredentials: {
              tokenUrl: envConfig.portalUrl + '/oauth2',
              scopes: {}
            }
          }
        }
      };

      // Keep existing schemas if present (after securitySchemes)
      if (portalSpec.components?.schemas) {
        portalComponents.schemas = portalSpec.components.schemas;
      }

      // Reorder keys for consistent output (no top-level security array)
      const orderedSpec: Record<string, any> = {};
      if (portalSpec.openapi) orderedSpec.openapi = portalSpec.openapi;
      if (portalSpec.info) orderedSpec.info = portalSpec.info;
      if (portalSpec.servers) orderedSpec.servers = portalSpec.servers;
      orderedSpec.components = portalComponents;
      if (portalSpec.paths) orderedSpec.paths = portalSpec.paths;

      // Add remaining keys
      for (const key of Object.keys(portalSpec)) {
        if (!orderedSpec[key]) {
          orderedSpec[key] = portalSpec[key];
        }
      }

      // Save to swagger-portal/swagger-{env}.json
      project.files.set(
        `src/main/resources/api-config/swagger-portal/swagger-${envConfig.env}.json`,
        JSON.stringify(orderedSpec, null, 2)
      );
    }

    log.debug('Generated portal swagger files for all environments');
  }

  private processConditionals(template: string): string {
    // Traiter les conditions Handlebars-like simples
    let processed = template;

    // {{#if globalRateLimit}}...{{/if}}
    if (this.config.globalRateLimit) {
      processed = processed.replace(/{{#if globalRateLimit}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      processed = processed.replace(/{{#if globalRateLimit}}[\s\S]*?{{\/if}}/g, '');
    }

    // {{#if mockUrl}}...{{/if}}
    if (this.config.mockUrl) {
      processed = processed.replace(/{{#if mockUrl}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      processed = processed.replace(/{{#if mockUrl}}[\s\S]*?{{\/if}}/g, '');
    }

    // {{#if isBasicAuth}}...{{/if}}
    if (this.config.authSouthbound === 'Basic') {
      processed = processed.replace(/{{#if isBasicAuth}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      processed = processed.replace(/{{#if isBasicAuth}}[\s\S]*?{{\/if}}/g, '');
    }

    // {{#if isOAuth2}}...{{/if}}
    if (this.config.authSouthbound === 'OAuth2-ClientCredentials') {
      processed = processed.replace(/{{#if isOAuth2}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      processed = processed.replace(/{{#if isOAuth2}}[\s\S]*?{{\/if}}/g, '');
    }

    // {{#if isApiKey}}...{{/if}}
    if (this.config.authSouthbound === 'ApiKey') {
      processed = processed.replace(/{{#if isApiKey}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      processed = processed.replace(/{{#if isApiKey}}[\s\S]*?{{\/if}}/g, '');
    }

    // {{#if authSouthbound}}...{{/if}}
    if (this.config.authSouthbound && this.config.authSouthbound !== 'None') {
      processed = processed.replace(/{{#if authSouthbound}}([\s\S]*?){{\/if}}/g, '$1');
    } else {
      processed = processed.replace(/{{#if authSouthbound}}[\s\S]*?{{\/if}}/g, '');
    }

    return processed;
  }

  private generateGitFiles(project: GeneratedProject): void {
    // .gitignore
    const gitignore = `# Maven
target/
pom.xml.tag
pom.xml.releaseBackup
pom.xml.versionsBackup
pom.xml.next
release.properties
dependency-reduced-pom.xml
buildNumber.properties
.mvn/timing.properties

# IDE
.idea/
*.iml
.vscode/
.settings/
.classpath
.project

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Apigee
edge.json
`;
    project.files.set('.gitignore', gitignore);

    // azure-pipelines.yml
    const azurePipeline = `resources:
  repositories:
  - repository: templates
    type: git
    name: Common.template
    ref: main

trigger:
- main

pool:
  vmImage: ubuntu-latest

stages:
- template: pipelines/prep-env-deployment-v2.yml@templates
  parameters:
    workingDirectory: \$(workingDirectory)
    environments:
    - name: dev1
      GCP_SERVICE_ACCOUNT: apigeex-config-nprd.json
      APIGEE_ENV: dev1
      APIGEE_ORG: apigeex-nprd
      API_VERSION: googleapi
    - name: uat1
      GCP_SERVICE_ACCOUNT: apigeex-config-nprd.json
      APIGEE_ENV: uat1
      APIGEE_ORG: apigeex-nprd
      API_VERSION: googleapi
    - name: staging
      GCP_SERVICE_ACCOUNT: apigeex-config-nprd.json
      APIGEE_ENV: staging
      APIGEE_ORG: apigeex-nprd
      API_VERSION: googleapi
    - name: prod1
      GCP_SERVICE_ACCOUNT: apigeex-config-prd.json
      APIGEE_ENV: prod1
      APIGEE_ORG: apigeex-prd
      API_VERSION: googleapi
`;
    project.files.set('azure-pipelines.yml', azurePipeline);
  }

  private generateReadme(project: GeneratedProject): void {
    const readme = `# ${this.config.proxyName}

${this.config.description}

## Overview

This is an Apigee API Proxy generated automatically.

- **API Name**: ${this.config.apiname}
- **Version**: ${this.config.version}
- **Base Path**: ${this.config.proxyBasepath}

## Project Structure

\`\`\`
.
├── pom.xml                           # Root Maven POM
├── src/
│   └── main/
│       ├── apigee/
│       │   ├── gateway/
│       │   │   ├── apiproxy/         # Apigee proxy bundle
│       │   │   │   ├── ${this.config.proxyName}.xml
│       │   │   │   ├── proxies/      # Proxy endpoints
│       │   │   │   ├── targets/      # Target endpoints
│       │   │   │   └── policies/     # Policies
│       │   │   ├── config/           # Environment configurations
│       │   │   └── pom.xml           # Gateway Maven POM
│       │   ├── apigee-lint/          # Apigee linting rules
│       │   └── spectral-lint/        # OpenAPI linting
│       └── resources/
│           └── api-config/
│               ├── apigee-configuration.json
│               ├── swagger.json      # OpenAPI specification
│               └── config/           # Environment configs
└── azure-pipelines.yml               # CI/CD pipeline
\`\`\`

## Prerequisites

- Java 11 or higher
- Maven 3.x
- Apigee Edge account
- Azure DevOps (for CI/CD)

## Local Development

### Build the proxy

\`\`\`bash
mvn clean install
\`\`\`

### Deploy to Apigee

\`\`\`bash
mvn apigee-enterprise:deploy \\
  -Dapigee.org=YOUR_ORG \\
  -Dapigee.env=YOUR_ENV \\
  -Dapigee.username=YOUR_USERNAME \\
  -Dapigee.password=YOUR_PASSWORD
\`\`\`

## CI/CD Pipeline

This project uses Azure Pipelines for continuous integration and deployment with Apigee X on Google Cloud Platform.

### Pipeline Configuration

The pipeline uses a shared template from the \`Common.template\` repository:
- **Template**: \`pipelines/prep-env-deployment-v2.yml@templates\`
- **Trigger**: Automatically runs on commits to \`main\` branch
- **Pool**: Uses \`ubuntu-latest\` VM image

### Environments

The pipeline deploys to 4 environments with the following configurations:

| Environment | Apigee Org | GCP Service Account | API Version |
|-------------|------------|---------------------|-------------|
| dev1 | apigeex-nprd | apigeex-config-nprd.json | googleapi |
| uat1 | apigeex-nprd | apigeex-config-nprd.json | googleapi |
| staging | apigeex-nprd | apigeex-config-nprd.json | googleapi |
| prod1 | apigeex-prd | apigeex-config-prd.json | googleapi |

### Required Configuration

1. **Repository Access**: Ensure your Azure DevOps project has access to the \`Common.template\` repository
2. **GCP Service Accounts**: Configure the following service account files in Azure DevOps Library:
   - \`apigeex-config-nprd.json\` (for non-production environments)
   - \`apigeex-config-prd.json\` (for production environment)
3. **Variable**: Set \`workingDirectory\` variable in Azure Pipelines if needed

## API Documentation

See [swagger.json](src/main/resources/api-config/swagger.json) for the OpenAPI specification.

## Configuration

Environment-specific configurations are located in:
- \`src/main/apigee/gateway/config/{env}/\`
- \`src/main/resources/api-config/config/{env}/\`

### Supported Environments

${ENVIRONMENTS.map(env => `- ${env}`).join('\n')}

## License

Copyright © ${new Date().getFullYear()}

## Generated

This project was generated using the Apigee React Generator tool.
`;
    project.files.set('README.md', readme);
  }

  private generateMavenWrapper(project: GeneratedProject): void {
    // Maven settings.xml for Azure DevOps authentication
    const organization = this.azureDevOpsConfig?.organization || 'elisdevops';
    const pat = this.azureDevOpsConfig?.personalAccessToken || '';

    const settingsXml = `<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 http://maven.apache.org/xsd/settings-1.0.0.xsd">
  <servers>
    <server>
      <id>${organization}</id>
      <username>${organization}</username>
      <password>${pat}</password>
    </server>
  </servers>
</settings>
`;
    project.files.set('.mvn/settings.xml', settingsXml);
  }
}
