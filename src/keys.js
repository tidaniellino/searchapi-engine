const { generateApiKey } = require('./utils/idGenerator');

// Store API keys in-memory with optional persistence
class KeyManager {
  constructor() {
    this.keys = new Map();
    // Default demo/master key for immediate testing
    this.defaultKey = 'sk_live_demo1234567890abcdef';
    this.keys.set(this.defaultKey, {
      key: this.defaultKey,
      name: 'Default Playground Key',
      plan: 'Developer (10,000 req/mo)',
      requestsUsed: 142,
      requestsLimit: 10000,
      createdAt: new Date().toISOString()
    });
  }

  isValid(apiKey) {
    if (!apiKey) return false;
    return this.keys.has(apiKey);
  }

  getKey(apiKey) {
    return this.keys.get(apiKey);
  }

  incrementUsage(apiKey) {
    const record = this.keys.get(apiKey);
    if (record) {
      record.requestsUsed++;
    }
  }

  createKey(name = 'New API Key', plan = 'Developer') {
    const key = generateApiKey();
    const keyData = {
      key,
      name,
      plan: `${plan} (10,000 req/mo)`,
      requestsUsed: 0,
      requestsLimit: 10000,
      createdAt: new Date().toISOString()
    };
    this.keys.set(key, keyData);
    return keyData;
  }

  getAllKeys() {
    return Array.from(this.keys.values());
  }
}

const keyManager = new KeyManager();

module.exports = keyManager;
