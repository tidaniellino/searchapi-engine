require('dotenv').config();

// Private Master Key Configuration for Owner
class PrivateKeyManager {
  constructor() {
    // Master key configured via environment variable, or default private key
    this.masterKey = process.env.API_KEY || process.env.API_SECRET_KEY || 'sk_private_master_daniel_2026';
    this.requestsUsed = 0;
  }

  getMasterKey() {
    return this.masterKey;
  }

  isValid(apiKey) {
    if (!apiKey) return false;
    // Strict comparison: only the owner's master key is allowed
    return apiKey === this.masterKey;
  }

  incrementUsage() {
    this.requestsUsed++;
  }

  getAccountInfo() {
    return {
      status: 'Private Self-Hosted Instance',
      owner: 'tidaniellino',
      plan: 'Personal Private Use (Unlimited)',
      plan_searches_limit: 'Unlimited',
      searches_used: this.requestsUsed,
      searches_left: 'Unlimited',
      auth_mode: 'Master Key Protection',
      master_key_configured: Boolean(process.env.API_KEY || process.env.API_SECRET_KEY)
    };
  }
}

const keyManager = new PrivateKeyManager();

module.exports = keyManager;
