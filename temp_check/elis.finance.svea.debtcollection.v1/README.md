# elis.finance.svea.debtcollection.v1

Debt Collection API

## Overview

This is an Apigee API Proxy generated automatically.

- **API Name**: debtcollection
- **Version**: v1
- **Base Path**: /debtcollection/v1

## Project Structure

```
.
├── pom.xml                           # Root Maven POM
├── src/
│   └── main/
│       ├── apigee/
│       │   ├── gateway/
│       │   │   ├── apiproxy/         # Apigee proxy bundle
│       │   │   │   ├── elis.finance.svea.debtcollection.v1.xml
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
```

## Prerequisites

- Java 11 or higher
- Maven 3.x
- Apigee Edge account
- Azure DevOps (for CI/CD)

## Local Development

### Build the proxy

```bash
mvn clean install
```

### Deploy to Apigee

```bash
mvn apigee-enterprise:deploy \
  -Dapigee.org=YOUR_ORG \
  -Dapigee.env=YOUR_ENV \
  -Dapigee.username=YOUR_USERNAME \
  -Dapigee.password=YOUR_PASSWORD
```

## CI/CD Pipeline

This project uses Azure Pipelines for continuous integration and deployment with Apigee X on Google Cloud Platform.

### Pipeline Configuration

The pipeline uses a shared template from the `Common.template` repository:
- **Template**: `pipelines/prep-env-deployment-v2.yml@templates`
- **Trigger**: Automatically runs on commits to `main` branch
- **Pool**: Uses `ubuntu-latest` VM image

### Environments

The pipeline deploys to 4 environments with the following configurations:

| Environment | Apigee Org | GCP Service Account | API Version |
|-------------|------------|---------------------|-------------|
| dev1 | apigeex-nprd | apigeex-config-nprd.json | googleapi |
| uat1 | apigeex-nprd | apigeex-config-nprd.json | googleapi |
| staging | apigeex-nprd | apigeex-config-nprd.json | googleapi |
| prod1 | apigeex-prd | apigeex-config-prd.json | googleapi |

### Required Configuration

1. **Repository Access**: Ensure your Azure DevOps project has access to the `Common.template` repository
2. **GCP Service Accounts**: Configure the following service account files in Azure DevOps Library:
   - `apigeex-config-nprd.json` (for non-production environments)
   - `apigeex-config-prd.json` (for production environment)
3. **Variable**: Set `workingDirectory` variable in Azure Pipelines if needed

## API Documentation

See [swagger.json](src/main/resources/api-config/swagger.json) for the OpenAPI specification.

## Configuration

Environment-specific configurations are located in:
- `src/main/apigee/gateway/config/{env}/`
- `src/main/resources/api-config/config/{env}/`

### Supported Environments

- dev1
- uat1
- staging
- prod1

## License

Copyright © 2026

## Generated

This project was generated using the Apigee React Generator tool.
