const express = require('express');
const cors = require('cors');
const path = require('path');
const searchCache = require('./src/cache');
const keyManager = require('./src/keys');
const { searchLocations } = require('./src/utils/locationResolver');
const { listEngines, executeSearch } = require('./src/engines');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: extract API Key from query or Authorization header
function extractApiKey(req) {
  if (req.query.api_key) return req.query.api_key;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

// Middleware: API Key Authentication
function requireApiKey(req, res, next) {
  const apiKey = extractApiKey(req);
  // Allow playground requests without explicit key by defaulting to demo key
  if (!apiKey) {
    req.apiKey = keyManager.defaultKey;
    return next();
  }
  if (!keyManager.isValid(apiKey)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key provided. Please pass a valid `api_key` parameter or `Authorization: Bearer <key>`.'
    });
  }
  req.apiKey = apiKey;
  next();
}

// ----------------------------------------------------
// 1. SearchApi Core Endpoint: GET /api/v1/search
// ----------------------------------------------------
app.get('/api/v1/search', requireApiKey, async (req, res) => {
  const { engine = 'google', q, hl, gl, device, num, page, location } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Parameter `q` is required for search queries.'
    });
  }

  const options = { hl, gl, device, num, page, location };
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    // 1. Check cache
    const cached = searchCache.get(engine, q, options);
    if (cached) {
      keyManager.incrementUsage(req.apiKey);
      return res.json({
        ...cached,
        search_metadata: {
          ...cached.search_metadata,
          cached: true,
          total_time_taken: 0.01
        }
      });
    }

    // 2. Execute live search
    const result = await executeSearch(engine, q, options, baseUrl);

    // 3. Cache result & track usage
    searchCache.set(engine, q, options, result);
    keyManager.incrementUsage(req.apiKey);

    return res.json(result);
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An error occurred during search execution.'
    });
  }
});

// ----------------------------------------------------
// 2. Retrieve Search by ID: GET /api/v1/searches/:id
// ----------------------------------------------------
app.get('/api/v1/searches/:id', (req, res) => {
  const search = searchCache.getById(req.params.id);
  if (!search) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Search with id "${req.params.id}" not found or has expired.`
    });
  }
  res.json(search);
});

// HTML view of cached search
app.get('/api/v1/searches/:id.html', (req, res) => {
  const search = searchCache.getById(req.params.id);
  if (!search) {
    return res.status(404).send('<h2>Search not found or expired</h2>');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Search ${search.search_metadata.id}</title>
        <style>
          body { font-family: monospace; background: #0f172a; color: #f8fafc; padding: 20px; }
          pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>Search ID: ${search.search_metadata.id}</h1>
        <p>Engine: <strong>${search.search_parameters.engine}</strong> | Query: <strong>${search.search_parameters.q}</strong></p>
        <pre>${JSON.stringify(search, null, 2)}</pre>
      </body>
    </html>
  `);
});

// ----------------------------------------------------
// 3. Account Endpoint: GET /api/v1/account
// ----------------------------------------------------
app.get('/api/v1/account', requireApiKey, (req, res) => {
  const keyRecord = keyManager.getKey(req.apiKey) || keyManager.getKey(keyManager.defaultKey);
  res.json({
    email: 'developer@searchapi.local',
    plan: keyRecord.plan,
    plan_searches_limit: keyRecord.requestsLimit,
    searches_this_month: keyRecord.requestsUsed,
    searches_left: Math.max(0, keyRecord.requestsLimit - keyRecord.requestsUsed),
    api_key: keyRecord.key,
    created_at: keyRecord.createdAt
  });
});

// ----------------------------------------------------
// 4. Locations Endpoint: GET /api/v1/locations
// ----------------------------------------------------
app.get('/api/v1/locations', async (req, res) => {
  const query = req.query.q || '';
  const locations = await searchLocations(query);
  res.json(locations);
});

// ----------------------------------------------------
// 5. Engines Endpoint: GET /api/v1/engines
// ----------------------------------------------------
app.get('/api/v1/engines', (req, res) => {
  res.json({
    engines: listEngines()
  });
});

// ----------------------------------------------------
// 6. API Keys Endpoints: GET / POST /api/v1/api-keys
// ----------------------------------------------------
app.get('/api/v1/api-keys', (req, res) => {
  res.json(keyManager.getAllKeys());
});

app.post('/api/v1/api-keys', (req, res) => {
  const { name = 'My API Key', plan = 'Developer' } = req.body || {};
  const newKey = keyManager.createKey(name, plan);
  res.status(201).json(newKey);
});

// Start the server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SearchApi.io Clone Server running on http://localhost:${PORT}`);
  console.log(`📡 SERP API Endpoint: http://localhost:${PORT}/api/v1/search`);
  console.log(`💻 Developer Playground: http://localhost:${PORT}/`);
  console.log(`🔑 Master Demo API Key: ${keyManager.defaultKey}`);
  console.log(`====================================================`);
});
