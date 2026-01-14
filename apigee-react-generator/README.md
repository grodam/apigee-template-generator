# Apigee Template Generator

A modern React application for generating Google Apigee API proxy bundles from OpenAPI specifications.

![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss)

## Overview

**Apigee Template Generator** streamlines the creation of Apigee API proxy projects through a modern Canvas-based interface. Configure your API settings, upload your OpenAPI specification, and generate a complete, deployment-ready Apigee bundle.

### Key Features

- **Canvas UI**: Modern card-based interface with Swiss Design aesthetics
- **OpenAPI Support**: Import JSON or YAML specifications (OpenAPI 2.0, 3.0.x, 3.1.x)
- **Auto-Detection**: Automatically extracts API configuration from OpenAPI spec
- **Multi-Environment**: Pre-configured for DEV, UAT, STAGING, and PROD environments
- **Azure DevOps Integration**: Direct push to Azure DevOps repositories
- **Template Customization**: Override default templates for custom policies
- **Template Sync**: Synchronize templates from Azure DevOps repositories
- **Portal Generation**: Generate portal-ready Swagger files
- **Internationalization**: English and French language support
- **Dark Mode**: Toggle between light and dark themes

---

## Quick Start

### 1. Start the Application

```bash
# Clone and install
git clone https://github.com/grodam/apigee-template-generator.git
cd apigee-template-generator/apigee-react-generator
npm install

# Start the application with proxy server
npm run dev:full
```

Or start separately:

```bash
# Terminal 1: Start React app
npm run dev

# Terminal 2: Start proxy server (required for Azure DevOps)
npm run proxy
```

Open http://localhost:5173 in your browser.

### 2. Generate Your Proxy

1. **OpenAPI Card**: Upload or paste your OpenAPI specification
2. **Proxy Config Card**: Configure entity, domain, backend apps, version, authentication
3. **API Products Card**: Review auto-generated API products per environment
4. **Target Servers Card**: Configure backend hosts for each environment
5. **Export Panel**: Generate, download ZIP, or push to Azure DevOps

---

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

# Start development server with proxy
npm run dev:full
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

---

## User Interface

The application uses a Canvas-based UI with expandable cards:

### 1. OpenAPI Card

- Upload JSON/YAML files via drag & drop or file picker
- Paste specification directly into Monaco editor
- Real-time validation with error reporting
- Auto-detection of API configuration (title, version, basePath, security)
- Displays detected endpoints and security schemes

### 2. Proxy Configuration Card

Configure the fundamental parameters of your API proxy:

| Field | Description | Example |
|-------|-------------|---------|
| Entity | Internal (`elis`) or External (`ext`) | `elis` |
| Domain | Business domain | `finance` |
| Backend Apps | Backend systems (dash-separated) | `sap-salesforce` |
| Business Object | Main API resource | `invoice` |
| Version | API version | `v1` |
| Proxy Basepath | Base URL path (auto-generated) | `/invoice/v1` |
| Southbound Auth | Backend authentication | `Basic`, `OAuth2`, `ApiKey`, `None` |
| Rate Limit | Global rate limiting | `500pm`, `100ps` |

**Generated Proxy Name**: `{entity}.{domain}.{backendApps}.{businessObject}.{version}`

Example: `elis.finance.sap-salesforce.invoice.v1`

### 3. API Products Card

- Auto-generated API products for each environment
- Configure product name, display name, description
- Environment-specific suffixes (dev, uat, stg, prod)
- Authorized paths configuration

### 4. Target Servers Card

Configure for each environment (DEV1, UAT1, STAGING, PROD1):

| Field | Description |
|-------|-------------|
| Server Name | Auto-generated identifier |
| Host | Backend hostname |
| Port | Backend port (default: 443) |
| SSL Enabled | TLS configuration |

### 5. Export & Console Panel

- **Generate API**: Creates the Apigee project structure
- **Download ZIP**: Downloads the generated project as ZIP
- **Push to Azure DevOps**: Pushes to configured repository
- **Console**: Real-time generation logs and status

---

## Settings

Access settings via the gear icon in the header:

### Azure DevOps Settings

- Organization name
- Project name
- Personal Access Token (PAT)
- Repository name
- Default branch
- Auto-create repository option

### Portal Settings

- Enable portal Swagger generation
- Configure portal-specific options

### Template Sync Settings

- Enable remote template synchronization
- Configure Azure DevOps repository for templates
- Auto-sync on startup

### Template Manager

- View and edit XML policy templates
- Override default templates
- Reset to defaults

---

## Generated Project Structure

```
{proxyName}/
├── .project                          # Eclipse configuration
├── .classpath                        # Eclipse classpath
├── pom.xml                           # Maven POM
├── apigee-configuration.json         # Global configuration
├── apiproxy/
│   ├── {proxyName}.xml              # Proxy descriptor
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

---

## Deployment to Apigee

### Using Maven

```bash
cd {proxyName}

# Deploy to dev1
mvn install -Pgoogleapi -Denv=dev1 -Dorg=your-org -Dtoken=your-token

# Deploy to production
mvn install -Pgoogleapi -Denv=prod1 -Dorg=your-org -Dtoken=your-token
```

### Using apigeecli

```bash
# Deploy proxy
apigeecli apis create bundle -f apiproxy -n {proxyName} --org your-org --token your-token

# Deploy environment config
apigeecli targetservers import -f config/env/dev1/edge-env.json --org your-org --env dev1 --token your-token
```

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript 5** | Type safety |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **Zustand** | State management |
| **React Hook Form** | Form handling |
| **Zod** | Schema validation |
| **i18next** | Internationalization |
| **Radix UI** | Accessible components |
| **Monaco Editor** | Code editing |
| **JSZip** | ZIP file generation |
| **swagger-parser** | OpenAPI parsing |
| **Lucide React** | Icons |

---

## Project Structure

```
apigee-react-generator/
├── server/
│   └── proxy.js                    # Azure DevOps proxy server
├── src/
│   ├── components/
│   │   ├── Canvas/                 # Main canvas UI
│   │   │   ├── CanvasContainer.tsx
│   │   │   ├── ProgressHeader.tsx
│   │   │   ├── ConsolePanel.tsx
│   │   │   └── AzurePushModal.tsx
│   │   ├── Cards/                  # Configuration cards
│   │   │   ├── OpenAPICard.tsx
│   │   │   ├── ProxyConfigCard.tsx
│   │   │   ├── ApiProductCard.tsx
│   │   │   ├── TargetServersCard.tsx
│   │   │   └── SwissCard.tsx
│   │   ├── Settings/               # Settings modal
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── AzureDevOpsSettings/
│   │   │   ├── PortalSettings/
│   │   │   ├── TemplateSyncSettings/
│   │   │   └── TemplateManager/
│   │   ├── Help/                   # Help panels
│   │   └── ui/                     # Radix UI components
│   ├── services/
│   │   ├── generators/             # Code generation
│   │   │   ├── ApigeeGenerator.ts
│   │   │   ├── ConfigGenerator.ts
│   │   │   ├── FlowGenerator.ts
│   │   │   └── PolicyGenerator.ts
│   │   ├── parsers/
│   │   │   └── OpenAPIParser.ts
│   │   ├── exporters/
│   │   │   └── ZipExporter.ts
│   │   ├── templates/              # Template management
│   │   └── azure-devops/
│   │       └── AzureDevOpsService.ts
│   ├── store/
│   │   └── useProjectStore.ts      # Zustand store
│   ├── models/                     # TypeScript interfaces
│   ├── hooks/                      # Custom hooks
│   ├── i18n/                       # Translations
│   └── utils/                      # Utility functions
├── public/
│   └── templates/                  # XML policy templates
└── package.json
```

---

## Scripts

```bash
npm run dev          # Start development server
npm run dev:full     # Start dev server + proxy
npm run proxy        # Start proxy server only
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Documentation

- [Azure DevOps Setup](AZURE_DEVOPS_SETUP.md) - Azure DevOps integration guide

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

*Built with React, TypeScript, and Tailwind CSS*
