// Test script to verify the generation services work correctly
import { ApigeeProjectGenerator } from './src/services/generators/ApigeeGenerator';
import { OpenAPIParserService } from './src/services/parsers/OpenAPIParser';
import { ZipExporter } from './src/services/exporters/ZipExporter';
import { ApiConfiguration } from './src/models/ApiConfiguration';
import * as fs from 'fs';

async function testGeneration() {
  console.log('🚀 Starting Apigee Template Generator Test...\n');

  // 1. Read test OpenAPI file
  console.log('📖 Reading test OpenAPI specification...');
  const openApiContent = fs.readFileSync('./test-openapi-sample.json', 'utf-8');
  console.log('✅ OpenAPI file loaded\n');

  // 2. Parse OpenAPI
  console.log('🔍 Parsing and validating OpenAPI...');
  const parser = new OpenAPIParserService();
  const parsedOpenAPI = await parser.parse(openApiContent, 'json');
  console.log(`✅ OpenAPI parsed successfully`);
  console.log(`   - Version: ${parsedOpenAPI.version}`);
  console.log(`   - Endpoints: ${parsedOpenAPI.paths.length}\n`);

  // 3. Create test configuration
  console.log('⚙️  Creating API configuration...');
  const config: ApiConfiguration = {
    entity: 'elis',
    apiname: 'customer',
    version: 'v1',
    description: 'Test Customer API for Apigee Generator',
    oasVersion: parsedOpenAPI.version,
    oasFormat: 'json',
    proxyBasepath: 'customer-api/v1',
    targetPath: '/v1',
    mockUrl: 'https://stoplight.io/mocks/test',
    globalRateLimit: '500pm',
    authSouthbound: 'Basic',
    proxyName: 'elis.customer.v1',
    environments: {
      dev1: {
        name: 'dev1',
        targetServers: [{
          name: 'elis.customer.v1.backend',
          host: 'backend-dev.elis.com',
          isEnabled: true,
          port: 443,
          sSLInfo: { enabled: true, clientAuthEnabled: false }
        }],
        apiProducts: [{
          name: 'customer-v1-product-dev1',
          displayName: 'Customer API v1 Product DEV1',
          approvalType: 'auto',
          environments: ['dev1']
        }],
        kvms: [{
          name: 'customer-backend',
          encrypted: true,
          entry: [
            { name: 'backend_id', value: 'test_id' },
            { name: 'backend_secret', value: 'test_secret' }
          ]
        }]
      },
      uat1: {
        name: 'uat1',
        targetServers: [{
          name: 'elis.customer.v1.backend',
          host: 'backend-uat.elis.com',
          isEnabled: true,
          port: 443,
          sSLInfo: { enabled: true, clientAuthEnabled: false }
        }],
        apiProducts: [{
          name: 'customer-v1-product-uat1',
          displayName: 'Customer API v1 Product UAT1',
          approvalType: 'auto',
          environments: ['uat1']
        }],
        kvms: []
      },
      staging: {
        name: 'staging',
        targetServers: [{
          name: 'elis.customer.v1.backend',
          host: 'backend-staging.elis.com',
          isEnabled: true,
          port: 443,
          sSLInfo: { enabled: true, clientAuthEnabled: false }
        }],
        apiProducts: [{
          name: 'customer-v1-product-staging',
          displayName: 'Customer API v1 Product STAGING',
          approvalType: 'auto',
          environments: ['staging']
        }],
        kvms: []
      },
      prod1: {
        name: 'prod1',
        targetServers: [{
          name: 'elis.customer.v1.backend',
          host: 'backend-prod.elis.com',
          isEnabled: true,
          port: 443,
          sSLInfo: { enabled: true, clientAuthEnabled: false }
        }],
        apiProducts: [{
          name: 'customer-v1-product-prod1',
          displayName: 'Customer API v1 Product PROD1',
          approvalType: 'manual',
          environments: ['prod1']
        }],
        kvms: []
      }
    }
  };
  console.log('✅ Configuration created\n');

  // 4. Generate project
  console.log('🏗️  Generating Apigee project...');
  const generator = new ApigeeProjectGenerator(config, parsedOpenAPI.rawSpec);
  const project = await generator.generate();
  console.log(`✅ Project generated successfully`);
  console.log(`   - Root directory: ${project.rootDir}`);
  console.log(`   - Files generated: ${project.files.size}\n`);

  // 5. List generated files
  console.log('📁 Generated files:');
  const files = Array.from(project.files.keys()).sort();
  files.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('');

  // 6. Export to ZIP
  console.log('📦 Creating ZIP file...');
  const exporter = new ZipExporter();
  const blob = await exporter.export(project);
  console.log(`✅ ZIP created successfully (${Math.round(blob.size / 1024)} KB)\n`);

  // 7. Save ZIP to disk
  const zipPath = `./test-output-${project.rootDir}.zip`;
  const buffer = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(zipPath, buffer);
  console.log(`💾 ZIP saved to: ${zipPath}\n`);

  console.log('✨ Test completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - OpenAPI endpoints: ${parsedOpenAPI.paths.length}`);
  console.log(`   - Generated files: ${project.files.size}`);
  console.log(`   - ZIP size: ${Math.round(blob.size / 1024)} KB`);
  console.log(`   - Proxy name: ${config.proxyName}`);
}

testGeneration().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
