# Testing Guide - Apigee Template Generator

This guide will help you test the application manually.

## Prerequisites

The application should be running on `http://localhost:5173/`

If not, run:
```bash
npm run dev
```

## Manual Testing Steps

### Test 1: Complete Flow with Sample Data

#### Step 1: API Configuration
1. Open `http://localhost:5173/` in your browser
2. Fill in the form with the following values:
   - **Entity**: `elis`
   - **API Name**: `customer`
   - **Version**: `v1`
   - **Description**: `Test Customer API for managing customer data and operations`
   - **Proxy Basepath**: `customer-api/v1`
   - **Target Path**: `/v1`
   - **Southbound Authentication**: Select `Basic`
   - **Global Rate Limit**: `500pm`
   - **Mock URL**: Leave empty or enter `https://stoplight.io/mocks/test`
3. Verify that "Proxy Name" shows: **elis.customer.v1**
4. Click **Next**

**Expected Result**: You should see "Proxy Name: elis.customer.v1" in an info alert and be able to proceed to step 2.

---

#### Step 2: OpenAPI Specification
1. Copy the content from `test-openapi-sample.json` file
2. Paste it into the Monaco Editor
3. Click **Validate** button

**Expected Results**:
- ✅ "Specification is valid!" message appears
- OpenAPI Version shows: `3.0.3`
- Endpoints Detected shows: `5`
- You should see 5 endpoints listed:
  - GET /customers
  - POST /customers
  - GET /customers/{id}
  - PUT /customers/{id}
  - DELETE /customers/{id}

4. Click **Next**

---

#### Step 3: Environment Configuration
1. You should see tabs for: DEV1, UAT1, STAGING, PROD1
2. Click on **DEV1** tab
3. Verify the Target Server section shows:
   - Name: `elis.customer.v1.backend` (disabled/read-only)
   - Host: `backend-dev1.elis.com`
   - Port: `443`
4. Modify the host to: `backend-dev.elis.com`
5. Verify the API Product section shows:
   - Product Name: `elis.customer.v1-product-dev1`
   - Display Name: contains "dev1"
6. Click on **UAT1** tab and verify similar fields appear
7. Click **Next**

**Expected Result**: All environment configurations should be pre-filled with sensible defaults based on your API configuration.

---

#### Step 4: Generate
1. You should see "Ready to generate your Apigee proxy" message
2. Click **Generate Project** button

**Expected Results**:
- Progress indicator appears
- You should see steps appearing one by one:
  - ✓ Initializing generation...
  - ✓ Generating Eclipse files...
  - ✓ Generating Maven POMs...
  - ✓ Generating proxy configuration...
  - ✓ Generating flows from OpenAPI...
  - ✓ Generating policies...
  - ✓ Generating target endpoints...
  - ✓ Generating environment configurations...
  - ✓ Finalizing project structure...
  - ✓ Generation complete!
- Green success message: "Project generated successfully!"
- **Next** button becomes enabled

3. Click **Next**

---

#### Step 5: Export
1. You should see the export page with:
   - Project name: `elis.customer.v1`
   - Files generated count
   - **Download ZIP** button
2. Click **Download ZIP** button

**Expected Results**:
- A file named `elis.customer.v1.zip` should be downloaded to your Downloads folder
- Success message appears: "Project exported successfully!"

3. Expand the **Azure DevOps Integration Guide** accordion
   - Verify instructions are displayed with git commands
   - Click the **Copy** button to copy the instructions

4. Expand the **Generated Files Structure** accordion
   - Verify you can see a list of all generated files
   - Files should include:
     - `.classpath`
     - `.project`
     - `pom.xml`
     - `src/main/apigee/gateway/apiproxy/elis.customer.v1.xml`
     - `src/main/apigee/gateway/apiproxy/policies/*.xml`
     - `src/main/apigee/gateway/config/dev1/edge-env.json`
     - etc.

---

### Test 2: Verify Generated ZIP Content

1. Extract the downloaded `elis.customer.v1.zip` file
2. Verify the structure matches:

```
elis.customer.v1/
├── .classpath
├── .project
├── .settings/
│   ├── org.eclipse.jdt.core.prefs
│   └── org.eclipse.m2e.core.prefs
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
    │   │   │   │   ├── proxies/
    │   │   │   │   │   └── default.xml
    │   │   │   │   └── targets/
    │   │   │   │       └── default.xml
    │   │   │   ├── config/
    │   │   │   │   ├── dev1/
    │   │   │   │   ├── uat1/
    │   │   │   │   ├── staging/
    │   │   │   │   └── prod1/
    │   │   │   └── pom.xml
    │   │   └── spectral-lint/
    │   └── resources/
    │       └── api-config/
    │           ├── apigee-configuration.json
    │           ├── swagger.json
    │           └── config/
    └── test/
```

3. Open and verify key files:
   - `pom.xml` - Should contain groupId, artifactId = elis.customer.v1
   - `src/main/apigee/gateway/apiproxy/elis.customer.v1.xml` - Should contain proxy definition
   - `src/main/apigee/gateway/apiproxy/proxies/default.xml` - Should contain 5 flows
   - `src/main/resources/api-config/swagger.json` - Should contain your OpenAPI spec

---

### Test 3: Validation Testing

#### Test Invalid API Name
1. Go back to Step 1 (refresh the page)
2. Enter API Name: `123-invalid` (starts with number)
3. Try to click **Next**

**Expected Result**: Error message appears: "Invalid API name (use letters, numbers, and hyphens)" and you cannot proceed.

#### Test Invalid Version
1. Enter Version: `1` (missing 'v' prefix)
2. Try to click **Next**

**Expected Result**: Error message: "Version must be in format v1, v2, etc."

#### Test Invalid OpenAPI
1. Proceed to Step 2
2. Paste invalid JSON:
```json
{
  "invalid": "spec"
}
```
3. Click **Validate**

**Expected Result**: Error message appears indicating the specification is invalid.

---

### Test 4: Navigation Testing

1. Complete Step 1 and go to Step 2
2. Click **Back** button
3. Verify you're back at Step 1 with your data preserved
4. Click **Next** to go back to Step 2
5. Complete all steps to Step 5
6. Click **Back** from Step 5
7. Verify you can navigate back and your generated project is still available

---

### Test 5: Different Auth Types

#### Test OAuth2 Client Credentials
1. Start a new session (refresh page)
2. In Step 1, select **Southbound Authentication**: `OAuth2-ClientCredentials`
3. Complete the flow
4. After generation, check the ZIP file
5. Verify policies include:
   - `SC-GetTokenCC.xml`
   - `AM-SetToken.xml`
   - `EV-ExtractToken.xml`
   - `LC-LookupToken.xml`
   - `PC-PopulateToken.xml`
   - `KVM-GetBackendInfosCC.xml`

#### Test No Authentication
1. Start a new session
2. In Step 1, select **Southbound Authentication**: `None`
3. Complete the flow
4. Verify that Basic Auth and OAuth2 policies are NOT included in the generated ZIP

---

## Expected Browser Compatibility

The application should work in:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

---

## Performance Expectations

- Step 1-3: Form should be responsive, no lag
- Step 4 Generation: Should complete in 2-5 seconds
- Step 5 ZIP Export: Should generate and download in < 2 seconds

---

## Known Limitations

1. The application runs entirely in the browser (no backend)
2. Templates are loaded from the `/public/templates` folder
3. Generated files are created in-memory before ZIP export
4. No persistence - refreshing the page will lose your progress

---

## Troubleshooting

### ZIP file is empty or corrupted
- Check browser console for errors
- Ensure all templates are loaded correctly
- Verify the generation step completed successfully

### OpenAPI validation fails
- Ensure the spec is valid JSON or YAML
- Check that it's a valid OpenAPI 2.0 or 3.x specification
- Try using the sample from `test-openapi-sample.json`

### Application not loading
- Clear browser cache
- Check browser console for errors
- Ensure `npm run dev` is running without errors

---

## Reporting Issues

If you find any issues during testing:
1. Note the exact steps to reproduce
2. Check the browser console for errors
3. Save any error messages
4. Document the expected vs actual behavior
