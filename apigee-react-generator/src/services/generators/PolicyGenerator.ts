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
    const kvmName = `${this.config.proxyName}-backend`;

    if (this.config.authSouthbound === 'Basic') {
      // KVM pour Basic Auth
      try {
        const template = await this.templateLoader.load('policies/KVM-GetBackendInfos-template.xml');
        const policy = template.replace(/{{kvmName}}/g, kvmName);
        policies.set('KVM-GetBackendInfos.xml', policy);
      } catch {
        policies.set('KVM-GetBackendInfos.xml', this.generateKVMPolicyBasic(kvmName));
      }
    } else if (this.config.authSouthbound === 'OAuth2-ClientCredentials') {
      // KVM pour OAuth2 Client Credentials
      try {
        const template = await this.templateLoader.load('policies/KVM-GetBackendInfosCC-template.xml');
        const policy = template.replace(/{{kvmName}}/g, kvmName);
        policies.set('KVM-GetBackendInfosCC.xml', policy);
      } catch {
        policies.set('KVM-GetBackendInfosCC.xml', this.generateKVMPolicyOAuth2(kvmName));
      }
    }
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

  private generateKVMPolicyBasic(kvmName: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<KeyValueMapOperations async="false" continueOnError="false" enabled="true" name="KVM-GetBackendInfos" mapIdentifier="${kvmName}">
    <DisplayName>KVM-GetBackendInfos</DisplayName>
    <Properties/>
    <ExclusiveCache>false</ExclusiveCache>
    <ExpiryTimeInSecs>300</ExpiryTimeInSecs>
    <Get assignTo="private.backend_id">
        <Key><Parameter>backend_id</Parameter></Key>
    </Get>
    <Get assignTo="private.backend_secret">
        <Key><Parameter>backend_secret</Parameter></Key>
    </Get>
    <Scope>environment</Scope>
</KeyValueMapOperations>`;
  }

  private generateKVMPolicyOAuth2(kvmName: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<KeyValueMapOperations async="false" continueOnError="false" enabled="true" name="KVM-GetBackendInfosCC" mapIdentifier="${kvmName}">
    <DisplayName>KVM-GetBackendInfosCC</DisplayName>
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
    </Get>
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
