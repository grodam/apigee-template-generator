# Apigee Template Generator - Example Usage

This guide provides a complete example of using the Apigee Template Generator.

## Example: Customer API

Let's create an Apigee proxy for a Customer API.

### Step 1: API Configuration

Fill in the following values:

- **Entity**: `elis`
- **API Name**: `customer`
- **Version**: `v1`
- **Description**: `Customer API for managing customer data and operations`
- **Proxy Basepath**: `customer-api/v1`
- **Target Path**: `/v1`
- **Southbound Authentication**: `Basic`
- **Global Rate Limit**: `500pm` (500 requests per minute)
- **Mock URL**: (leave empty or add your Stoplight mock URL)

The proxy name will be auto-calculated as: **elis.customer.v1**

### Step 2: OpenAPI Specification

Upload or paste the following sample OpenAPI spec:

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Customer API",
    "version": "1.0.0",
    "description": "API for managing customer data"
  },
  "security": [
    {
      "oauth2": ["customer:read", "customer:write"]
    }
  ],
  "paths": {
    "/customers": {
      "get": {
        "summary": "List all customers",
        "operationId": "listCustomers",
        "responses": {
          "200": {
            "description": "List of customers"
          }
        }
      },
      "post": {
        "summary": "Create a new customer",
        "operationId": "createCustomer",
        "responses": {
          "201": {
            "description": "Customer created"
          }
        }
      }
    },
    "/customers/{id}": {
      "get": {
        "summary": "Get customer by ID",
        "operationId": "getCustomer",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Customer details"
          }
        }
      },
      "put": {
        "summary": "Update customer",
        "operationId": "updateCustomer",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Customer updated"
          }
        }
      },
      "delete": {
        "summary": "Delete customer",
        "operationId": "deleteCustomer",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "security": [
          {
            "oauth2": ["customer:delete"]
          }
        ],
        "responses": {
          "204": {
            "description": "Customer deleted"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "oauth2": {
        "type": "oauth2",
        "flows": {
          "clientCredentials": {
            "tokenUrl": "https://auth.example.com/oauth/token",
            "scopes": {
              "customer:read": "Read customer data",
              "customer:write": "Write customer data",
              "customer:delete": "Delete customers"
            }
          }
        }
      }
    }
  }
}
```

After pasting, click **Validate**. You should see:
- ✅ Specification is valid!
- **OpenAPI Version**: 3.0.3
- **Endpoints Detected**: 5

### Step 3: Environment Configuration

Configure each environment. Example for **dev1**:

#### Target Server
- **Name**: `elis.customer.v1.backend` (auto-generated)
- **Host**: `backend-dev.elis.com`
- **Port**: `443`

#### API Product
- **Name**: `elis.customer.v1-product-dev1`
- **Display Name**: `Customer API v1 Product DEV1`
- **Description**: `Customer API product for development environment`

Repeat similar configuration for **uat1**, **staging**, and **prod1** environments, changing the host accordingly:
- **uat1**: `backend-uat.elis.com`
- **staging**: `backend-staging.elis.com`
- **prod1**: `backend-prod.elis.com`

### Step 4: Generate

Click **Generate Project**. You'll see:

```
✓ Initializing generation...
✓ Generating Eclipse files...
✓ Generating Maven POMs...
✓ Generating proxy configuration...
✓ Generating flows from OpenAPI...
✓ Generating policies...
✓ Generating target endpoints...
✓ Generating environment configurations...
✓ Finalizing project structure...
✓ Generation complete!
```

### Step 5: Export

1. Click **Download ZIP** to download `elis.customer.v1.zip`

2. Extract the ZIP file:
   ```bash
   unzip elis.customer.v1.zip
   cd elis.customer.v1
   ```

3. Initialize Git and push to Azure DevOps:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Customer API v1"
   git remote add origin https://dev.azure.com/yourorg/yourproject/_git/elis.customer.v1
   git push -u origin master
   ```

4. Deploy to Apigee (dev1 environment):
   ```bash
   cd src/main/apigee/gateway
   mvn install -Pgoogleapi -Denv=dev1 -Dorg=apigeex-nprd -Dtoken=YOUR_TOKEN
   ```

## Generated Project Structure

```
elis.customer.v1/
├── .classpath
├── .project
├── .settings/
├── pom.xml
└── src/
    ├── main/
    │   ├── apigee/
    │   │   ├── apigee-lint/
    │   │   │   └── EX-ODM002-NamingConventions.js
    │   │   ├── gateway/
    │   │   │   ├── apiproxy/
    │   │   │   │   ├── elis.customer.v1.xml
    │   │   │   │   ├── policies/
    │   │   │   │   │   ├── AM-NotFound.xml
    │   │   │   │   │   ├── BA-AddAuthHeader.xml
    │   │   │   │   │   ├── FC-ErrorHandling.xml
    │   │   │   │   │   ├── FC-SetCorsHeaders.xml
    │   │   │   │   │   ├── FC-VerifyApiKey.xml
    │   │   │   │   │   ├── FC-VerifyJWT.xml
    │   │   │   │   │   ├── KVM-GetBackendInfos.xml
    │   │   │   │   │   ├── SA-GlobalRate.xml
    │   │   │   │   │   ├── O2-VerifyAccessToken-customer.read.xml
    │   │   │   │   │   ├── O2-VerifyAccessToken-customer.write.xml
    │   │   │   │   │   └── O2-VerifyAccessToken-customer.delete.xml
    │   │   │   │   ├── proxies/
    │   │   │   │   │   └── default.xml (with 5 flows)
    │   │   │   │   └── targets/
    │   │   │   │       └── default.xml
    │   │   │   ├── config/
    │   │   │   │   ├── dev1/
    │   │   │   │   │   ├── edge-env.json
    │   │   │   │   │   └── edge-org.json
    │   │   │   │   ├── uat1/
    │   │   │   │   ├── staging/
    │   │   │   │   └── prod1/
    │   │   │   └── pom.xml
    │   │   └── spectral-lint/
    │   │       └── .spectral.yaml
    │   └── resources/
    │       └── api-config/
    │           ├── apigee-configuration.json
    │           ├── swagger.json
    │           └── config/ (copy of environment configs)
    └── test/
        └── java/
```

## Generated Flows Example

The generator will create 5 flows based on the OpenAPI spec:

1. **GET /customers**
2. **POST /customers**
3. **GET /customers/{id}**
4. **PUT /customers/{id}**
5. **DELETE /customers/{id}** (with customer:delete scope)

Each flow will have the appropriate OAuth2 scope verification policies attached.

## Testing the Deployed Proxy

After deployment, test your proxy:

```bash
# Get all customers
curl -X GET "https://apigeex-nprd.apigee.net/customer-api/v1/customers" \
  -H "x-apikey: YOUR_API_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a customer
curl -X POST "https://apigeex-nprd.apigee.net/customer-api/v1/customers" \
  -H "x-apikey: YOUR_API_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

## Next Steps

1. Configure KVM values for backend authentication in Apigee
2. Create API products and developer apps
3. Set up Azure Pipelines for CI/CD
4. Configure monitoring and analytics
5. Add additional policies as needed (caching, transformation, etc.)
