const crypto = require('crypto');

function generateSearchId() {
  const randomChars = crypto.randomBytes(16).toString('base64url');
  return `search_${randomChars}`;
}

function generateApiKey() {
  const randomChars = crypto.randomBytes(24).toString('base64url');
  return `sk_live_${randomChars}`;
}

module.exports = {
  generateSearchId,
  generateApiKey
};
