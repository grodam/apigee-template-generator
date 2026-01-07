# Quick Start Guide - Apigee Template Generator

## 🚀 5-Minute Quick Start

### Step 1: Start the Application (Already Running!)

The application is currently running at:
```
http://localhost:5173/
```

If you need to restart it:
```bash
cd apigee-react-generator
npm run dev
```

### Step 2: Open in Browser

Open your web browser and navigate to:
```
http://localhost:5173/
```

### Step 3: Complete the Wizard

#### Screen 1: API Configuration
Fill in these values:
```
Entity: elis
API Name: customer
Version: v1
Description: Customer API for managing customer data
Proxy Basepath: customer-api/v1
Target Path: /v1
Southbound Authentication: Basic
Global Rate Limit: 500pm
Mock URL: (leave empty)
```

Click **Next** ➡️

#### Screen 2: OpenAPI Specification
1. Click on the file selector or paste this sample OpenAPI:

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Customer API",
    "version": "1.0.0"
  },
  "paths": {
    "/customers": {
      "get": {
        "summary": "List customers",
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    }
  }
}
```

2. Click **Validate**
3. Wait for ✅ "Specification is valid!"
4. Click **Next** ➡️

#### Screen 3: Environment Configuration
1. Review the auto-configured environments
2. Optionally modify host names
3. Click **Next** ➡️

#### Screen 4: Generate
1. Click **Generate Project** button
2. Wait 2-5 seconds for generation to complete
3. Click **Next** ➡️

#### Screen 5: Export
1. Click **Download ZIP** button
2. Save the file `elis.customer.v1.zip`

### Step 4: Verify the ZIP

Extract the ZIP file and verify the structure:
```bash
unzip elis.customer.v1.zip
cd elis.customer.v1
ls -la
```

You should see:
```
.classpath
.project
.settings/
pom.xml
src/
  main/
    apigee/
    resources/
  test/
```

## 🎯 What You Just Created

You've generated a **complete Apigee API Proxy project** with:

- ✅ Maven build configuration
- ✅ Apigee proxy and target endpoints
- ✅ Security policies (API Key, JWT, Basic Auth)
- ✅ CORS and error handling
- ✅ Configuration for 4 environments
- ✅ Eclipse IDE support
- ✅ Ready for Azure DevOps deployment

## 📦 Next Steps

### Option 1: Import to Azure DevOps
```bash
cd elis.customer.v1
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-azure-devops-repo-url>
git push -u origin master
```

### Option 2: Deploy to Apigee
```bash
cd elis.customer.v1/src/main/apigee/gateway
mvn install -Pgoogleapi -Denv=dev1 -Dorg=your-org -Dtoken=your-token
```

### Option 3: Open in Eclipse
1. Open Eclipse
2. File → Import → Existing Maven Project
3. Select the `elis.customer.v1` folder
4. Click Finish

## 📚 Learn More

- **Full Documentation**: See `README.md`
- **Detailed Example**: See `USAGE_EXAMPLE.md`
- **Testing Guide**: See `TESTING_GUIDE.md`
- **Project Summary**: See `PROJECT_SUMMARY.md`

## 🆘 Troubleshooting

### Application won't start
```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### OpenAPI validation fails
- Ensure your spec is valid JSON
- Try the sample OpenAPI provided in this guide
- Check browser console for errors

### ZIP file is empty
- Ensure generation step completed successfully
- Check browser console for errors
- Try using a simpler OpenAPI spec first

## 🎉 Success!

You've successfully used the Apigee Template Generator to create a production-ready API proxy project in less than 5 minutes!

---

**Need Help?** Check the detailed guides in:
- `README.md`
- `TESTING_GUIDE.md`
- `USAGE_EXAMPLE.md`
