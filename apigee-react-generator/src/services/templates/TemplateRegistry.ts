import type { TemplateFile, TemplateTreeNode, TemplateCategory, TemplateExport } from '../../models/Template';
import { TemplateLoader, type TemplateSource } from './TemplateLoader';
import { templatesCacheService, type SyncInfo } from './TemplatesCacheService';
import JSZip from 'jszip';

// Template definitions - combining file-based and inline templates
interface TemplateDefinition {
  id: string;
  name: string;
  path: string;
  category: TemplateCategory;
  source: 'file' | 'inline';
  description?: string;
  defaultContent?: string;
}

// All template definitions
const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  // Policies (file-based)
  { id: 'policy-am-notfound', name: 'AM-NotFound.xml', path: 'policies/AM-NotFound.xml', category: 'policies', source: 'file', description: 'AssignMessage - Not Found response' },
  { id: 'policy-am-settoken', name: 'AM-SetToken.xml', path: 'policies/AM-SetToken.xml', category: 'policies', source: 'file', description: 'AssignMessage - Set Token' },
  { id: 'policy-ba-addauthheader', name: 'BA-AddAuthHeader.xml', path: 'policies/BA-AddAuthHeader.xml', category: 'policies', source: 'file', description: 'BasicAuthentication - Add Auth Header' },
  { id: 'policy-ev-extracttoken', name: 'EV-ExtractToken.xml', path: 'policies/EV-ExtractToken.xml', category: 'policies', source: 'file', description: 'ExtractVariables - Extract Token' },
  { id: 'policy-fc-errorhandling', name: 'FC-ErrorHandling.xml', path: 'policies/FC-ErrorHandling.xml', category: 'policies', source: 'file', description: 'FlowCallout - Error Handling' },
  { id: 'policy-fc-setcorsheaders', name: 'FC-SetCorsHeaders.xml', path: 'policies/FC-SetCorsHeaders.xml', category: 'policies', source: 'file', description: 'FlowCallout - Set CORS Headers' },
  { id: 'policy-fc-verifyapikey', name: 'FC-VerifyApiKey.xml', path: 'policies/FC-VerifyApiKey.xml', category: 'policies', source: 'file', description: 'FlowCallout - Verify API Key' },
  { id: 'policy-fc-verifyjwt', name: 'FC-VerifyJWT.xml', path: 'policies/FC-VerifyJWT.xml', category: 'policies', source: 'file', description: 'FlowCallout - Verify JWT' },
  { id: 'policy-lc-lookuptoken', name: 'LC-LookupToken.xml', path: 'policies/LC-LookupToken.xml', category: 'policies', source: 'file', description: 'LookupCache - Lookup Token' },
  { id: 'policy-pc-populatetoken', name: 'PC-PopulateToken.xml', path: 'policies/PC-PopulateToken.xml', category: 'policies', source: 'file', description: 'PopulateCache - Populate Token' },

  // POM Files (file-based)
  { id: 'pom-root', name: 'root-pom-template.xml', path: 'root-pom-template.xml', category: 'pom', source: 'file', description: 'Root Maven POM template' },
  { id: 'pom-gateway', name: 'gateway-pom-template.xml', path: 'gateway-pom-template.xml', category: 'pom', source: 'file', description: 'Gateway Maven POM template' },

  // Proxy Configuration (file-based)
  { id: 'proxy-root', name: 'proxy-template.xml', path: 'proxy-template.xml', category: 'proxy', source: 'file', description: 'Main proxy XML template' },
  { id: 'proxy-default', name: 'proxies/default-template.xml', path: 'proxies/default-template.xml', category: 'proxy', source: 'file', description: 'Default proxy endpoint template' },
  { id: 'target-default', name: 'targets/default-template.xml', path: 'targets/default-template.xml', category: 'proxy', source: 'file', description: 'Default target endpoint template' },
  { id: 'target-mock', name: 'targets/mock-template.xml', path: 'targets/mock-template.xml', category: 'proxy', source: 'file', description: 'Mock target endpoint template' },

  // Linting (inline)
  { id: 'lint-naming', name: 'EX-ODM002-NamingConventions.js', path: 'linting/EX-ODM002-NamingConventions.js', category: 'linting', source: 'inline', description: 'Apigee policy naming conventions linter' },
  { id: 'lint-spectral', name: '.spectral.yaml', path: 'linting/.spectral.yaml', category: 'linting', source: 'inline', description: 'Spectral OpenAPI linting config' },

  // CI/CD (inline)
  { id: 'cicd-pipeline', name: 'azure-pipelines.yml', path: 'cicd/azure-pipelines.yml', category: 'cicd', source: 'inline', description: 'Azure DevOps pipeline configuration' },
  { id: 'cicd-gitignore', name: '.gitignore', path: 'cicd/.gitignore', category: 'cicd', source: 'inline', description: 'Git ignore file' },

  // Other (inline)
  { id: 'other-readme', name: 'README.md', path: 'other/README.md', category: 'other', source: 'inline', description: 'Project README template' },
  { id: 'other-mvn-settings', name: '.mvn/settings.xml', path: 'other/.mvn/settings.xml', category: 'other', source: 'inline', description: 'Maven settings with Azure DevOps credentials' },
];

// Inline template contents (default values)
const INLINE_TEMPLATES: Record<string, string> = {
  'lint-naming': `const plugin = {
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
};`,

  'lint-spectral': `formats:
  - oas3
extends:
  - 'https://cdn.jsdelivr.net/npm/@stoplight/spectral-owasp-ruleset@1.4.3/dist/ruleset.min.js'`,

  'cicd-pipeline': `resources:
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
    workingDirectory: $(workingDirectory)
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
      API_VERSION: googleapi`,

  'cicd-gitignore': `# Maven
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
edge.json`,

  'other-readme': `# {{proxyName}}

{{description}}

## Overview

This is an Apigee API Proxy generated automatically.

- **API Name**: {{apiname}}
- **Version**: {{version}}
- **Base Path**: {{proxyBasepath}}

## Project Structure

\`\`\`
.
├── pom.xml                           # Root Maven POM
├── src/
│   └── main/
│       ├── apigee/
│       │   ├── gateway/
│       │   │   ├── apiproxy/         # Apigee proxy bundle
│       │   │   │   ├── {{proxyName}}.xml
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

## API Documentation

See swagger.json for the OpenAPI specification.

## Generated

This project was generated using the Apigee React Generator tool.`,

  'other-mvn-settings': `<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 http://maven.apache.org/xsd/settings-1.0.0.xsd">
  <servers>
    <server>
      <id>elisdevops</id>
      <username>elisdevops</username>
      <password>4Mb169x74AOTSF9uYUAhc0hePYT8qVYSv91reJunqsf1MKVar1G1QO19gHDACAMAA9yhFAAM5A2U00c00m</password>
    </server>
  </servers>
</settings>`,
};

class TemplateRegistry {
  private static instance: TemplateRegistry;
  private templates: Map<string, TemplateFile> = new Map();
  private templateLoader: TemplateLoader;
  private initialized: boolean = false;
  private overrides: Map<string, string> = new Map();
  private usingRemoteTemplates: boolean = false;
  private templateSources: Map<string, TemplateSource> = new Map();

  private constructor() {
    this.templateLoader = new TemplateLoader();
  }

  static getInstance(): TemplateRegistry {
    if (!TemplateRegistry.instance) {
      TemplateRegistry.instance = new TemplateRegistry();
    }
    return TemplateRegistry.instance;
  }

  /**
   * Enable loading templates from remote cache (synced from Azure DevOps)
   */
  async enableRemoteTemplates(enabled: boolean): Promise<void> {
    this.usingRemoteTemplates = enabled;
    this.templateLoader.setUseRemoteCache(enabled);

    // Re-initialize if already initialized
    if (this.initialized) {
      this.initialized = false;
      this.templates.clear();
      this.templateSources.clear();
      await this.initialize(this.overrides);
    }
  }

  /**
   * Check if remote templates are available in cache
   */
  async hasRemoteTemplates(): Promise<boolean> {
    return this.templateLoader.isRemoteCacheAvailable();
  }

  /**
   * Get sync info from cache
   */
  async getSyncInfo(): Promise<SyncInfo | null> {
    return templatesCacheService.getSyncInfo();
  }

  /**
   * Check if using remote templates
   */
  isUsingRemoteTemplates(): boolean {
    return this.usingRemoteTemplates;
  }

  /**
   * Get template source for a specific template
   */
  getTemplateSourceType(id: string): TemplateSource | undefined {
    return this.templateSources.get(id);
  }

  /**
   * Initialize the registry by loading all templates
   */
  async initialize(overrides?: Map<string, string>): Promise<void> {
    if (overrides) {
      this.overrides = overrides;
    }

    for (const def of TEMPLATE_DEFINITIONS) {
      let content = '';
      let sourceType: TemplateSource = 'local';

      if (def.source === 'file') {
        try {
          const result = await this.templateLoader.loadWithSource(def.path);
          content = result.content;
          sourceType = result.source;
        } catch (error) {
          console.warn(`Failed to load template ${def.path}:`, error);
          continue;
        }
      } else {
        content = INLINE_TEMPLATES[def.id] || '';
        sourceType = 'local'; // Inline templates are always local
      }

      // Track the source
      this.templateSources.set(def.id, sourceType);

      // Apply override if exists
      const finalContent = this.overrides.get(def.id) || content;

      this.templates.set(def.id, {
        id: def.id,
        name: def.name,
        path: def.path,
        content: finalContent,
        category: def.category,
        isModified: this.overrides.has(def.id),
        source: def.source,
        description: def.description,
      });
    }

    this.initialized = true;
  }

  /**
   * Get all templates organized by category
   */
  getTemplatesByCategory(): Map<TemplateCategory, TemplateFile[]> {
    const byCategory = new Map<TemplateCategory, TemplateFile[]>();

    for (const template of this.templates.values()) {
      const categoryTemplates = byCategory.get(template.category) || [];
      categoryTemplates.push(template);
      byCategory.set(template.category, categoryTemplates);
    }

    return byCategory;
  }

  /**
   * Get a single template by ID
   */
  getTemplate(id: string): TemplateFile | undefined {
    return this.templates.get(id);
  }

  /**
   * Get template content (respecting overrides)
   */
  getTemplateContent(id: string): string {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    return template.content;
  }

  /**
   * Update a template's content (creates an override)
   */
  updateTemplate(id: string, content: string): void {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    this.overrides.set(id, content);
    // Create a new object to ensure React detects the change
    this.templates.set(id, {
      ...template,
      content,
      isModified: true,
    });
  }

  /**
   * Reset a template to its default content
   */
  async resetTemplate(id: string): Promise<void> {
    const def = TEMPLATE_DEFINITIONS.find(d => d.id === id);
    if (!def) {
      throw new Error(`Template definition not found: ${id}`);
    }

    let defaultContent = '';
    if (def.source === 'file') {
      this.templateLoader.clearCache();
      defaultContent = await this.templateLoader.load(def.path);
    } else {
      defaultContent = INLINE_TEMPLATES[def.id] || '';
    }

    this.overrides.delete(id);

    const existingTemplate = this.templates.get(id);
    if (existingTemplate) {
      // Create a new object to ensure React detects the change
      this.templates.set(id, {
        ...existingTemplate,
        content: defaultContent,
        isModified: false,
      });
    }
  }

  /**
   * Get the hierarchical tree structure
   */
  getTemplateTree(): TemplateTreeNode[] {
    const categories: TemplateCategory[] = ['policies', 'pom', 'proxy', 'linting', 'cicd', 'other'];

    return categories.map(category => {
      const templates = Array.from(this.templates.values())
        .filter(t => t.category === category);

      return {
        id: `category-${category}`,
        name: this.getCategoryLabel(category),
        type: 'folder' as const,
        category,
        children: templates.map(t => ({
          id: t.id,
          name: t.name,
          type: 'file' as const,
          template: t,
        })),
      };
    });
  }

  private getCategoryLabel(category: TemplateCategory): string {
    const labels: Record<TemplateCategory, string> = {
      policies: 'Policies',
      pom: 'POM Files',
      proxy: 'Proxy Configuration',
      linting: 'Linting',
      cicd: 'CI/CD',
      other: 'Other',
    };
    return labels[category];
  }

  /**
   * Export all templates as a ZIP file
   */
  async exportAllAsZip(): Promise<Blob> {
    const zip = new JSZip();

    for (const template of this.templates.values()) {
      const folderPath = template.category;
      zip.file(`${folderPath}/${template.name}`, template.content);
    }

    // Add metadata
    const metadata: TemplateExport = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      templates: Array.from(this.templates.values()),
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    return zip.generateAsync({ type: 'blob' });
  }

  /**
   * Import templates from a ZIP file
   */
  async importFromZip(file: File): Promise<{ imported: number; errors: string[] }> {
    const zip = await JSZip.loadAsync(file);
    const errors: string[] = [];
    let imported = 0;

    // Try to read metadata
    const metadataFile = zip.file('metadata.json');
    if (metadataFile) {
      try {
        const metadataContent = await metadataFile.async('string');
        const metadata: TemplateExport = JSON.parse(metadataContent);

        for (const templateData of metadata.templates) {
          const existingTemplate = this.templates.get(templateData.id);
          if (existingTemplate) {
            this.updateTemplate(templateData.id, templateData.content);
            imported++;
          }
        }
      } catch (error) {
        errors.push('Failed to parse metadata.json');
      }
    } else {
      // Fallback: try to match files by name
      for (const [path, file] of Object.entries(zip.files)) {
        if (file.dir) continue;

        const fileName = path.split('/').pop() || '';
        const matchingTemplate = Array.from(this.templates.values())
          .find(t => t.name === fileName);

        if (matchingTemplate) {
          try {
            const content = await file.async('string');
            this.updateTemplate(matchingTemplate.id, content);
            imported++;
          } catch (error) {
            errors.push(`Failed to import ${fileName}`);
          }
        }
      }
    }

    return { imported, errors };
  }

  /**
   * Export a single template
   */
  exportTemplate(id: string): { filename: string; content: string } {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return {
      filename: template.name,
      content: template.content,
    };
  }

  /**
   * Get all overrides (for persistence)
   */
  getOverrides(): Map<string, string> {
    return new Map(this.overrides);
  }

  /**
   * Set overrides (from persistence)
   */
  setOverrides(overrides: Map<string, string>): void {
    this.overrides = new Map(overrides);
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all template definitions (for UI)
   */
  static getDefinitions(): TemplateDefinition[] {
    return [...TEMPLATE_DEFINITIONS];
  }
}

export const templateRegistry = TemplateRegistry.getInstance();
export { TemplateRegistry, TEMPLATE_DEFINITIONS };
