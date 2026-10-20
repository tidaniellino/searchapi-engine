require('dotenv').config();
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

// Middleware: Strict Private API Key Authentication
function requireApiKey(req, res, next) {
  const apiKey = extractApiKey(req);
  if (!apiKey || !keyManager.isValid(apiKey)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Acesso restrito. Esta é uma instância de API privada. Forneça sua chave mestra através do parâmetro `api_key` ou cabeçalho `Authorization: Bearer <sua_chave>`.'
    });
  }
  req.apiKey = apiKey;
  next();
}

// ----------------------------------------------------
// 1. Auth Verification Endpoint: POST /api/v1/auth/verify
// ----------------------------------------------------
app.post('/api/v1/auth/verify', (req, res) => {
  const key = extractApiKey(req) || req.body?.api_key;
  if (key && keyManager.isValid(key)) {
    return res.json({
      success: true,
      message: 'Chave mestra autenticada com sucesso.',
      account: keyManager.getAccountInfo()
    });
  }
  return res.status(401).json({
    success: false,
    message: 'Chave mestra inválida. Acesso negado.'
  });
});

// ----------------------------------------------------
// 2. SearchApi Core Endpoint: GET /api/v1/search
// ----------------------------------------------------
app.get('/api/v1/search', requireApiKey, async (req, res) => {
  const { engine = 'google', q, hl, gl, device, num, page, location } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Parâmetro `q` (termo de busca) é obrigatório.'
    });
  }

  const options = { hl, gl, device, num, page, location };
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    // 1. Check cache
    const cached = searchCache.get(engine, q, options);
    if (cached) {
      keyManager.incrementUsage();
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
    keyManager.incrementUsage();

    return res.json(result);
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Ocorreu um erro durante a execução da busca.'
    });
  }
});

// ----------------------------------------------------
// 3. Retrieve Search by ID: GET /api/v1/searches/:id
// ----------------------------------------------------
app.get('/api/v1/searches/:id', requireApiKey, (req, res) => {
  const search = searchCache.getById(req.params.id);
  if (!search) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Busca com id "${req.params.id}" não encontrada ou expirada.`
    });
  }
  res.json(search);
});

// HTML view of cached search
app.get('/api/v1/searches/:id.html', requireApiKey, (req, res) => {
  const search = searchCache.getById(req.params.id);
  if (!search) {
    return res.status(404).send('<h2>Busca não encontrada ou expirada</h2>');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Busca ${search.search_metadata.id}</title>
        <style>
          body { font-family: monospace; background: #0f172a; color: #f8fafc; padding: 20px; }
          pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>ID da Busca: ${search.search_metadata.id}</h1>
        <p>Motor: <strong>${search.search_parameters.engine}</strong> | Termo: <strong>${search.search_parameters.q}</strong></p>
        <pre>${JSON.stringify(search, null, 2)}</pre>
      </body>
    </html>
  `);
});

// ----------------------------------------------------
// 4. Account Endpoint: GET /api/v1/account
// ----------------------------------------------------
app.get('/api/v1/account', requireApiKey, (req, res) => {
  res.json(keyManager.getAccountInfo());
});

// ----------------------------------------------------
// 5. Locations Endpoint: GET /api/v1/locations
// ----------------------------------------------------
app.get('/api/v1/locations', requireApiKey, async (req, res) => {
  const query = req.query.q || '';
  const locations = await searchLocations(query);
  res.json(locations);
});

// ----------------------------------------------------
// 6. Engines Endpoint: GET /api/v1/engines
// ----------------------------------------------------
app.get('/api/v1/engines', (req, res) => {
  res.json({
    engines: listEngines()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🔒 SearchApi Privado (Acesso Exclusivo do Proprietário)`);
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`📡 Endpoint SERP: http://localhost:${PORT}/api/v1/search`);
  console.log(`🔑 Chave Mestra Configurada: ${keyManager.getMasterKey().slice(0, 12)}...`);
  console.log(`====================================================`);
});
