const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 3001;

// Enable CORS for the React app
app.use(cors({
  origin: true, // Accept all localhost origins
  credentials: true
}));

// Increase payload limit for large file pushes
app.use(express.json({ limit: '50mb' }));

/**
 * Proxy endpoint for Azure DevOps API calls
 * This avoids CORS issues when calling Azure DevOps from the browser
 */
app.post('/api/azure-devops-proxy', (req, res) => {
  const { url, method, headers, body } = req.body;

  // Parse the URL
  const urlObj = new URL(url);

  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: method || 'GET',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';

    proxyRes.on('data', (chunk) => {
      data += chunk;
    });

    proxyRes.on('end', () => {
      // Log errors from Azure DevOps
      if (proxyRes.statusCode >= 400) {
        console.error(`Azure DevOps API Error: ${proxyRes.statusCode}`);
        console.error('URL:', url);
        console.error('Response:', data);
      }

      // Try to parse as JSON, fallback to raw data
      let parsedData = null;
      if (data) {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // Response is not JSON (might be XML or plain text for file downloads)
          parsedData = data;
        }
      }

      res.status(proxyRes.statusCode).json({
        statusCode: proxyRes.statusCode,
        data: parsedData,
        headers: proxyRes.headers
      });
    });
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy request error:', error);
    console.error('Request URL:', url);
    console.error('Request method:', method);
    console.error('Request headers:', headers);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message
    });
  });

  if (body) {
    proxyReq.write(JSON.stringify(body));
  }

  proxyReq.end();
});

app.listen(PORT, () => {
  console.log(`Azure DevOps proxy server running on http://localhost:${PORT}`);
  console.log(`Accepting requests from all localhost origins`);
});
