# Apigee Template Generator - React Application

A modern React application that generates Google Apigee API proxy bundles from OpenAPI/Swagger specifications, compatible with Azure DevOps deployment pipelines.

## Features

- **OpenAPI 2.0 & 3.x Support**: Parse and validate OpenAPI/Swagger specifications
- **Wizard-Based Interface**: Step-by-step configuration process
- **Automatic Flow Generation**: Generate Apigee flows from OpenAPI paths and operations
- **Multi-Environment Support**: Configure dev1, uat1, staging, and prod1 environments
- **Security Options**: Support for Basic Auth, OAuth2 Client Credentials, and API Key
- **Rate Limiting**: Optional global rate limiting configuration
- **Mock Support**: Optional mock target endpoint configuration
- **ZIP Export**: Download complete project as a ZIP file
- **Azure DevOps Ready**: Generated structure is compatible with Azure DevOps pipelines

## Tech Stack

- **React 18** with TypeScript
- **Material-UI (MUI) v5** for UI components
- **Zustand** for state management
- **Monaco Editor** for code editing
- **@apidevtools/swagger-parser** for OpenAPI parsing
- **JSZip** for ZIP file generation
- **react-hook-form + zod** for form validation
- **Vite** for build tooling

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

## Usage

### Step 1: API Configuration

Configure your API proxy basic information including entity, API name, version, authentication, and rate limiting.

### Step 2: OpenAPI Specification

Upload or paste your OpenAPI/Swagger specification. The editor validates your specification in real-time.

### Step 3: Environment Configuration

Configure target servers and API products for each environment (dev1, uat1, staging, prod1).

### Step 4: Generate

Generate the complete Apigee proxy bundle with all policies, configurations, and Maven POMs.

### Step 5: Export

Download the generated project as a ZIP file and follow the Azure DevOps integration guide.

## Deployment to Apigee

```bash
cd {proxyName}/src/main/apigee/gateway
mvn install -Pgoogleapi -Denv=dev1 -Dorg=your-org -Dtoken=your-token
```

## Build for Production

```bash
npm run build
```
