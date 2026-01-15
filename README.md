# Apigee Template Generator

Generate Google Apigee API proxies from OpenAPI specifications with a modern desktop application.

## Features

- Import OpenAPI 3.x / Swagger 2.x specifications (YAML/JSON)
- Visual configuration of proxy settings
- Multi-environment support (dev, uat, staging, prod)
- Southbound authentication: None, Basic, OAuth2, API Key
- Customizable XML policy templates
- Direct push to Azure DevOps repositories
- Export as ZIP for manual deployment
- Dark/Light theme
- English/French localization

## Installation

### Desktop App (Recommended)

Download the latest installer from [Releases](../../releases):
- **Windows**: `.msi` or `.exe` installer (no admin rights required)

### Development Setup

**Prerequisites:**
- Node.js 18+
- Rust (via [rustup](https://rustup.rs/))
- VS Build Tools 2022 (Windows)

```bash
cd apigee-react-generator
npm install

# Run desktop app
npm run tauri:dev

# Or run in browser (requires proxy for Azure DevOps)
npm run dev:full
```

## Usage

1. **Import** an OpenAPI specification file
2. **Configure** proxy settings (name, environments, authentication)
3. **Customize** XML templates if needed
4. **Generate** and export as ZIP or push to Azure DevOps

## Proxy Naming Convention

```
{entity}.{domain}.{backendApps}.{businessObject}.{version}
```
Example: `elis.finance.sap-salesforce.invoice.v1`

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Desktop**: Tauri 2 (Rust)
- **State**: Zustand
- **UI**: Radix UI, Lucide Icons, Monaco Editor

## Azure DevOps Integration

Configure your Azure DevOps connection in Settings:
- Organization name
- Project name
- Personal Access Token (PAT)
- Default branch

The desktop app connects directly to Azure DevOps. Browser mode requires the included proxy server.

## License

MIT
