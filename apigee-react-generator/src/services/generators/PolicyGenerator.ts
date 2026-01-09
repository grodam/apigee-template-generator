import type { ApiConfiguration } from '../../models/ApiConfiguration';
import { TemplateLoader } from '../templates/TemplateLoader';
import { scopeToPolicyName } from '../../utils/stringUtils';

export class PolicyGenerator {
  private config: ApiConfiguration;
  private openAPI: any;
  private templateLoader: TemplateLoader;

  constructor(config: ApiConfiguration, openAPI: any) {
    this.config = config;
    this.openAPI = openAPI;
    this.templateLoader = new TemplateLoader();
  }

  async generateAllPolicies(): Promise<Map<string, string>> {
    const policies = new Map<string, string>();

    // Policies statiques (toujours copiées)
    await this.copyStaticPolicies(policies);

    // Policies templatées conditionnelles
    await this.generateKVMPolicy(policies);
    await this.generateSpikeArrestPolicy(policies);
    await this.generateOAuth2Policies(policies);

    return policies;
  }

  private async copyStaticPolicies(policies: Map<string, string>): Promise<void> {
    const staticPolicies = [
      'policies/AM-NotFound.xml',
      'policies/FC-ErrorHandling.xml',
      'policies/FC-SetCorsHeaders.xml',
      'policies/FC-VerifyApiKey.xml',
      'policies/FC-VerifyJWT.xml',
    ];

    // Si auth southbound est Basic, ajouter BA-AddAuthHeader
    if (this.config.authSouthbound === 'Basic') {
      staticPolicies.push('policies/BA-AddAuthHeader.xml');
    }

    // Si auth southbound est OAuth2, ajouter les policies OAuth2
    if (this.config.authSouthbound === 'OAuth2-ClientCredentials') {
      staticPolicies.push(
        'policies/AM-SetToken.xml',
        'policies/EV-ExtractToken.xml',
        'policies/LC-LookupToken.xml',
        'policies/PC-PopulateToken.xml'
      );
    }

    for (const policyPath of staticPolicies) {
      try {
        const content = await this.templateLoader.load(policyPath);
        const filename = policyPath.split('/').pop()!;
        policies.set(filename, content);
      } catch (error) {
        // Si le template n'existe pas, on génère une policy par défaut
        const filename = policyPath.split('/').pop()!;
        policies.set(filename, this.generateDefaultPolicy(filename));
      }
    }
  }

  private async generateKVMPolicy(policies: Map<string, string>): Promise<void> {
    // Generate one KVM policy per backend app
    // KVM name format: [backendapp].[version].backend
    const backendApps = this.config.backendApps || [];
    const version = this.config.version || 'v1';

    if (backendApps.length === 0) return;

    // Get KVM entries from dev1 environment as reference (entries should be consistent across envs)
    const referenceEnv = this.config.environments?.dev1;
    const kvmConfigs = referenceEnv?.kvms || [];

    for (const backendApp of backendApps) {
      const kvmName = `${backendApp}.${version}.backend`;
      const policyNameSuffix = backendApps.length > 1 ? `-${backendApp}` : '';

      // Find the KVM config for this backend app to get custom entries
      const kvmConfig = kvmConfigs.find(kvm => kvm.name === kvmName);
      const customEntries = kvmConfig?.entries || [];

      // Default entries that are already in the policy templates
      const basicDefaultEntries = ['backend_id', 'backend_secret'];
      const oauth2DefaultEntries = ['backend_id', 'backend_secret', 'host_auth', 'path_auth'];

      if (this.config.authSouthbound === 'Basic') {
        // KVM pour Basic Auth
        const policyName = `KVM-GetBackendInfos${policyNameSuffix}.xml`;
        try {
          const template = await this.templateLoader.load('policies/KVM-GetBackendInfos-template.xml');
          let policy = template
            .replace(/{{kvmName}}/g, kvmName)
            .replace(/name="KVM-GetBackendInfos"/g, `name="KVM-GetBackendInfos${policyNameSuffix}"`)
            .replace(/>KVM-GetBackendInfos</g, `>KVM-GetBackendInfos${policyNameSuffix}<`);

          // Add custom entries before </KeyValueMapOperations> (excluding defaults)
          if (customEntries.length > 0) {
            const customGetElements = this.generateKVMGetElements(customEntries, basicDefaultEntries);
            if (customGetElements) {
              policy = policy.replace('</KeyValueMapOperations>', `${customGetElements}\n</KeyValueMapOperations>`);
            }
          }

          policies.set(policyName, policy);
        } catch {
          policies.set(policyName, this.generateKVMPolicyBasic(kvmName, policyNameSuffix, customEntries));
        }
      } else if (this.config.authSouthbound === 'OAuth2-ClientCredentials') {
        // KVM pour OAuth2 Client Credentials
        const policyName = `KVM-GetBackendInfosCC${policyNameSuffix}.xml`;
        try {
          const template = await this.templateLoader.load('policies/KVM-GetBackendInfosCC-template.xml');
          let policy = template
            .replace(/{{kvmName}}/g, kvmName)
            .replace(/name="KVM-GetBackendInfosCC"/g, `name="KVM-GetBackendInfosCC${policyNameSuffix}"`)
            .replace(/>KVM-GetBackendInfosCC</g, `>KVM-GetBackendInfosCC${policyNameSuffix}<`);

          // Add custom entries before </KeyValueMapOperations> (excluding defaults)
          if (customEntries.length > 0) {
            const customGetElements = this.generateKVMGetElements(customEntries, oauth2DefaultEntries);
            if (customGetElements) {
              policy = policy.replace('</KeyValueMapOperations>', `${customGetElements}\n</KeyValueMapOperations>`);
            }
          }

          policies.set(policyName, policy);
        } catch {
          policies.set(policyName, this.generateKVMPolicyOAuth2(kvmName, policyNameSuffix, customEntries));
        }
      }
    }
  }

  private generateKVMGetElements(entries: Array<{ name: string; value: string }>, excludeNames: string[] = []): string {
    // Filter out entries that already exist in the default policy
    const filteredEntries = entries.filter(entry => !excludeNames.includes(entry.name));

    if (filteredEntries.length === 0) return '';

    return filteredEntries.map(entry => {
      return `    <Get assignTo="private.${entry.name}">
        <Key><Parameter>${entry.name}</Parameter></Key>
    </Get>`;
    }).join('\n');
  }

  private async generateSpikeArrestPolicy(policies: Map<string, string>): Promise<void> {
    if (this.config.globalRateLimit) {
      try {
        const template = await this.templateLoader.load('policies/SA-GlobalRate-template.xml');
        const policy = template.replace(/{{rate}}/g, this.config.globalRateLimit);
        policies.set('SA-GlobalRate.xml', policy);
      } catch {
        policies.set('SA-GlobalRate.xml', this.generateSpikeArrest(this.config.globalRateLimit));
      }
    }
  }

  private async generateOAuth2Policies(policies: Map<string, string>): Promise<void> {
    if (this.config.authSouthbound === 'OAuth2-ClientCredentials') {
      try {
        const template = await this.templateLoader.load('policies/SC-GetTokenCC-template.xml');
        policies.set('SC-GetTokenCC.xml', template);
      } catch {
        policies.set('SC-GetTokenCC.xml', this.generateServiceCalloutOAuth2());
      }
    }

    // Générer les policies OAuth2 pour les scopes
    const scopes = this.extractAllScopes();
    for (const scope of scopes) {
      const policyName = scopeToPolicyName(scope);
      const filename = `${policyName}.xml`;
      const policy = this.generateOAuth2VerifyPolicy(scope);
      policies.set(filename, policy);
    }
  }

  private generateOAuth2VerifyPolicy(scope: string): string {
    const policyName = scopeToPolicyName(scope);

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OAuthV2 async="false" continueOnError="false" enabled="true" name="${policyName}">
    <DisplayName>${policyName}</DisplayName>
    <Operation>VerifyAccessToken</Operation>
    <Scope>${scope}</Scope>
</OAuthV2>`;
  }

  private extractAllScopes(): string[] {
    const scopes = new Set<string>();

    // Scopes globaux
    const globalSecurity = this.openAPI.security || [];
    for (const secReq of globalSecurity) {
      for (const [, reqScopes] of Object.entries(secReq)) {
        for (const scope of reqScopes as string[]) {
          scopes.add(scope);
        }
      }
    }

    // Scopes par opération
    for (const pathItem of Object.values(this.openAPI.paths || {})) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (operation?.security) {
          for (const secReq of operation.security) {
            for (const [, reqScopes] of Object.entries(secReq)) {
              for (const scope of reqScopes as string[]) {
                scopes.add(scope);
              }
            }
          }
        }
      }
    }

    return Array.from(scopes);
  }

  // Default policy generators
  private generateDefaultPolicy(filename: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Policy name="${filename.replace('.xml', '')}">
    <DisplayName>${filename.replace('.xml', '')}</DisplayName>
    <!-- Generated policy -->
</Policy>`;
  }

  private generateKVMPolicyBasic(kvmName: string, policyNameSuffix: string = '', customEntries: Array<{ name: string; value: string }> = []): string {
    const policyName = `KVM-GetBackendInfos${policyNameSuffix}`;
    const basicDefaultEntries = ['backend_id', 'backend_secret'];
    const customGetElements = this.generateKVMGetElements(customEntries, basicDefaultEntries);
    const customGetElementsStr = customGetElements ? '\n' + customGetElements : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<KeyValueMapOperations async="false" continueOnError="false" enabled="true" name="${policyName}" mapIdentifier="${kvmName}">
    <DisplayName>${policyName}</DisplayName>
    <Properties/>
    <ExclusiveCache>false</ExclusiveCache>
    <ExpiryTimeInSecs>300</ExpiryTimeInSecs>
    <Get assignTo="private.backend_id">
        <Key><Parameter>backend_id</Parameter></Key>
    </Get>
    <Get assignTo="private.backend_secret">
        <Key><Parameter>backend_secret</Parameter></Key>
    </Get>${customGetElementsStr}
    <Scope>environment</Scope>
</KeyValueMapOperations>`;
  }

  private generateKVMPolicyOAuth2(kvmName: string, policyNameSuffix: string = '', customEntries: Array<{ name: string; value: string }> = []): string {
    const policyName = `KVM-GetBackendInfosCC${policyNameSuffix}`;
    const oauth2DefaultEntries = ['backend_id', 'backend_secret', 'host_auth', 'path_auth'];
    const customGetElements = this.generateKVMGetElements(customEntries, oauth2DefaultEntries);
    const customGetElementsStr = customGetElements ? '\n' + customGetElements : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<KeyValueMapOperations async="false" continueOnError="false" enabled="true" name="${policyName}" mapIdentifier="${kvmName}">
    <DisplayName>${policyName}</DisplayName>
    <Properties/>
    <ExclusiveCache>false</ExclusiveCache>
    <ExpiryTimeInSecs>300</ExpiryTimeInSecs>
    <Get assignTo="private.backend_id">
        <Key><Parameter>backend_id</Parameter></Key>
    </Get>
    <Get assignTo="private.backend_secret">
        <Key><Parameter>backend_secret</Parameter></Key>
    </Get>
    <Get assignTo="private.backend.host_auth">
        <Key><Parameter>host_auth</Parameter></Key>
    </Get>
    <Get assignTo="private.backend.path_auth">
        <Key><Parameter>path_auth</Parameter></Key>
    </Get>${customGetElementsStr}
    <Scope>environment</Scope>
</KeyValueMapOperations>`;
  }

  private generateSpikeArrest(rate: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest async="false" continueOnError="false" enabled="true" name="SA-GlobalRate">
    <DisplayName>SA-GlobalRate</DisplayName>
    <Properties/>
    <Rate>${rate}</Rate>
    <UseEffectiveCount>true</UseEffectiveCount>
</SpikeArrest>`;
  }

  private generateServiceCalloutOAuth2(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ServiceCallout async="false" continueOnError="false" enabled="true" name="SC-GetTokenCC">
    <DisplayName>SC-GetTokenCC</DisplayName>
    <Request>
        <Set>
            <Headers>
                <Header name="Content-Type">application/x-www-form-urlencoded</Header>
            </Headers>
            <Payload contentType="application/x-www-form-urlencoded">
                grant_type=client_credentials&amp;client_id={private.backend_id}&amp;client_secret={private.backend_secret}
            </Payload>
            <Verb>POST</Verb>
        </Set>
    </Request>
    <Response>token.response</Response>
    <HTTPTargetConnection>
        <URL>{private.backend.host_auth}{private.backend.path_auth}</URL>
    </HTTPTargetConnection>
</ServiceCallout>`;
  }
}
