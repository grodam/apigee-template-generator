# Apigee Template Generator

A modern web application for generating professional Apigee API proxy bundles from OpenAPI specifications.

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss)

## Overview

**Apigee Template Generator** streamlines the creation of Apigee API proxy projects by providing a guided wizard interface. Simply configure your API settings, upload your OpenAPI specification, and generate a complete, deployment-ready Apigee bundle.

### Key Features

- **6-Step Wizard**: Intuitive step-by-step configuration process
- **OpenAPI Support**: Import JSON or YAML specifications (OpenAPI 2.0, 3.0.x, 3.1.x)
- **Multi-Environment**: Pre-configured for DEV, UAT, STAGING, and PROD environments
- **Azure DevOps Integration**: Direct push to Azure DevOps repositories
- **Template Customization**: Override default templates for custom policies
- **Internationalization**: English and French language support
- **Modern UI**: Clean, utility-first design inspired by Linear and GitHub

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/grodam/apigee-template-generator.git
cd apigee-template-generator/apigee-react-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### Step 1: API Configuration

Configure the fundamental parameters of your API proxy:

| Field | Description | Example |
|-------|-------------|---------|
| Entity | Internal (`elis`) or External (`ext`) | `elis` |
| Domain | Business domain | `finance` |
| Backend Apps | Backend systems (dash-separated) | `sap-salesforce` |
| Business Object | Main API resource | `invoice` |
| Version | API version | `v1` |
| Description | API description | `Invoice management API` |
| Proxy Basepath | Base URL path | `/invoice-api/v1` |
| Target Path | Backend path prefix | `/v1` |
| Southbound Auth | Backend authentication | `Basic`, `OAuth2`, `None` |
| Rate Limit | Global rate limiting | `500pm`, `100ps` |

**Generated Proxy Name**: `[entity].[domain].[backendApps].[businessObject].[version]`

Example: `elis.finance.sap-salesforce.invoice.v1`

### Step 2: OpenAPI Specification

- Upload a JSON or YAML file (drag & drop supported)
- Real-time validation with error reporting
- Supports OpenAPI 2.0, 3.0.x, and 3.1.x
- Integrated code editor for modifications

### Step 3: Environment Configuration

Configure for each environment (DEV1, UAT1, STAGING, PROD1):

#### Target Servers
| Field | Description | Auto-generated |
|-------|-------------|----------------|
| Name | Server identifier | Yes: `[entity].[backendApps].[version].backend` |
| Host | Backend hostname | No: `backend-[env].example.com` |
| Port | Backend port | No (default: 443) |

#### API Products
| Field | Description | Auto-generated |
|-------|-------------|----------------|
| Product Name | Unique identifier | Yes |
| Display Name | Human-readable name | Yes: `[businessObject]-[version]-[env]` |
| Description | Product description | Yes |

**Environment Suffix Rules**:
| Environment | Product Name | Display Name |
|-------------|--------------|--------------|
| dev1 | `.dev` | `-dev` |
| uat1 | `.uat` | `-uat` |
| staging | `.stg` | `-stg` |
| prod1 | (none) | (none) |

#### Key-Value Maps (KVM)
- Store credentials and configuration per environment
- Optional encryption for sensitive data
- Add custom key-value entries

### Step 4: Generation

Click "Generate Project" to create:
- Apigee proxy configuration (`apiproxy/`)
- Security and routing policies
- Environment-specific configurations (`config/env/`)
- Maven deployment files (`pom.xml`)
- Eclipse project files (`.project`, `.classpath`)

### Step 5: Azure DevOps (Optional)

Push your generated project directly to Azure DevOps:

1. **Configure Settings** (Settings > Azure DevOps):
   - Organization name
   - Project name
   - Personal Access Token (PAT)
   - Default branch

2. **Configure Repository**:
   - Enter repository name
   - Enable auto-create if needed

3. **Push**: Click "Push to Azure DevOps"

### Step 6: Export

Download your complete project as a ZIP file ready for deployment.

## Generated Project Structure

```
[proxyName]/
├── .project                          # Eclipse configuration
├── .classpath                        # Eclipse classpath
├── pom.xml                           # Maven POM
├── apigee-configuration.json         # Global configuration
├── apiproxy/
│   ├── [proxyName].xml              # Proxy descriptor
│   ├── proxies/
│   │   └── default.xml              # ProxyEndpoint
│   ├── targets/
│   │   └── default.xml              # TargetEndpoint
│   ├── policies/
│   │   ├── AM-SetTarget.xml         # Assign Message policies
│   │   ├── FC-Security.xml          # Flow Callout policies
│   │   └── ...                      # Other policies
│   └── resources/
│       └── oas/
│           └── openapi.json         # OpenAPI specification
└── config/
    └── env/
        ├── dev1/
        │   ├── edge-env.json        # Environment config
        │   └── edge-org.json        # Organization config
        ├── uat1/
        ├── staging/
        └── prod1/
```

## Configuration Files

### apigee-configuration.json

```json
{
  "entity": "elis",
  "description": "API for invoice management",
  "version": "v1",
  "apiname": "invoice",
  "oas.version": "3.0.0",
  "oas.format": "json",
  "proxy.basepath": "/invoice-api/v1",
  "target.path": "/v1",
  "global-rate-limit": "500pm",
  "auth-southbound": "basic",
  "mock.url": ""
}
```

### edge-env.json

```json
{
  "version": "1.0",
  "envConfig": {
    "dev1": {
      "targetServers": [
        {
          "name": "elis.sap.v1.backend",
          "host": "backend-dev1.example.com",
          "isEnabled": true,
          "port": 443,
          "sSLInfo": {
            "enabled": true,
            "clientAuthEnabled": false
          }
        }
      ],
      "kvms": [
        {
          "name": "sap.v1.backend",
          "encrypted": true
        }
      ],
      "virtualHosts": [],
      "references": [],
      "caches": [],
      "resourcefiles": [],
      "flowhooks": [],
      "extensions": [],
      "keystores": [],
      "aliases": []
    }
  }
}
```

### edge-org.json

```json
{
  "version": "1.0",
  "orgConfig": {
    "specs": [],
    "apiProducts": [
      {
        "name": "elis.finance.sap.invoice.v1.dev",
        "displayName": "invoice-v1-dev",
        "description": "API Product for invoice (v1) - Environment: DEV. Backend: SAP. Type: internal.",
        "approvalType": "auto",
        "attributes": [
          { "name": "access", "value": "private" }
        ],
        "environments": ["dev1"],
        "operationGroup": {
          "operationConfigs": [
            {
              "apiSource": "elis.finance.sap.invoice.v1",
              "operations": [
                { "resource": "/invoices" },
                { "resource": "/invoices/**" }
              ],
              "quota": {}
            }
          ],
          "operationConfigType": "proxy"
        }
      }
    ],
    "userroles": [],
    "reports": [],
    "developers": [],
    "developerApps": {},
    "importKeys": {}
  }
}
```

## Deployment to Apigee

### Using Maven

```bash
cd [proxyName]

# Deploy to dev1
mvn install -Pgoogleapi -Denv=dev1 -Dorg=your-org -Dtoken=your-token

# Deploy to production
mvn install -Pgoogleapi -Denv=prod1 -Dorg=your-org -Dtoken=your-token
```

### Using apigeecli

```bash
# Deploy proxy
apigeecli apis create bundle -f apiproxy -n [proxyName] --org your-org --token your-token

# Deploy environment config
apigeecli targetservers import -f config/env/dev1/edge-env.json --org your-org --env dev1 --token your-token
```

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | State management |
| **React Hook Form** | Form handling |
| **Zod** | Schema validation |
| **i18next** | Internationalization |
| **Radix UI** | Accessible components |
| **Monaco Editor** | Code editing |
| **JSZip** | ZIP file generation |
| **swagger-parser** | OpenAPI parsing |

## Project Structure

```
apigee-react-generator/
├── src/
│   ├── components/
│   │   ├── Steps/              # Wizard step components
│   │   │   ├── Step1_ApiConfiguration.tsx
│   │   │   ├── Step2_OpenAPIEditor.tsx
│   │   │   ├── Step3_EnvironmentConfig.tsx
│   │   │   ├── Step4_Generation.tsx
│   │   │   ├── Step5_AzureDevOps.tsx
│   │   │   └── Step6_Export.tsx
│   │   ├── Settings/           # Settings modal
│   │   ├── Wizard/             # Wizard container
│   │   └── ui/                 # Reusable UI components
│   ├── services/
│   │   ├── generators/         # Code generation logic
│   │   │   ├── ApigeeGenerator.ts
│   │   │   ├── ConfigGenerator.ts
│   │   │   └── PolicyGenerator.ts
│   │   └── azure-devops/       # Azure DevOps API
│   ├── store/
│   │   └── useProjectStore.ts  # Zustand store
│   ├── models/
│   │   └── ApiConfiguration.ts # TypeScript interfaces
│   ├── i18n/
│   │   └── locales/            # Language files
│   │       ├── en.ts
│   │       └── fr.ts
│   └── utils/                  # Utility functions
├── docs/
│   └── USER_GUIDE.md          # User documentation
├── public/                     # Static assets
└── index.html                  # Entry point
```

## Design System

The application uses a utility-first design system:

| Aspect | Implementation |
|--------|----------------|
| **Spacing** | 4px grid system |
| **Colors** | Slate neutrals + Indigo accent (#6366f1) |
| **Typography** | Inter (text), Monospace (data) |
| **Borders** | 4-8px radius, subtle borders |
| **Shadows** | Minimal, border-based depth |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Documentation

- [User Guide](docs/USER_GUIDE.md) - Complete user documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Acknowledgments

- [Google Apigee](https://cloud.google.com/apigee) - API Management Platform
- [OpenAPI Initiative](https://www.openapis.org/) - API Specification Standard
- [Radix UI](https://www.radix-ui.com/) - Accessible Component Primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-First CSS Framework

---

*Built with React, TypeScript, and Tailwind CSS*
