const { getRandomUserAgent } = require('../utils/userAgents');

async function scrapeGoogleImages(q, options = {}) {
  const userAgent = getRandomUserAgent(options.device);
  const images_results = [];

  try {
    // Fetch vqd token
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, {
      headers: { 'User-Agent': userAgent }
    });
    const tokenHtml = await tokenRes.text();
    const vqdMatch = tokenHtml.match(/vqd=([0-9-]+)/);
    
    if (vqdMatch) {
      const vqd = vqdMatch[1];
      const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,`, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json'
        }
      });
      const data = await imgRes.json();
      const list = data.results || [];
      
      list.forEach((item, idx) => {
        images_results.push({
          position: idx + 1,
          title: item.title,
          original: {
            link: item.image,
            width: item.width,
            height: item.height
          },
          thumbnail: {
            link: item.thumbnail
          },
          source: {
            name: item.source || new URL(item.url || 'https://google.com').hostname,
            link: item.url
          }
        });
      });
    }
  } catch(e) {}

  const limit = parseInt(options.num || 20, 10);
  return {
    images_results: images_results.slice(0, limit),
    total_results: images_results.length
  };
}

module.exports = {
  scrapeGoogleImages
};
