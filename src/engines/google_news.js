const cheerio = require('cheerio');
const { getRandomUserAgent } = require('../utils/userAgents');

async function scrapeGoogleNews(q, options = {}) {
  const hl = options.hl || 'en-US';
  const gl = options.gl ? options.gl.toUpperCase() : 'US';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0] || 'en'}`;
  const userAgent = getRandomUserAgent(options.device);

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8'
    }
  });

  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const news_results = [];
  $('item').each((i, el) => {
    const title = $(el).find('title').text().trim();
    const link = $(el).find('link').text().trim();
    const pubDate = $(el).find('pubDate').text().trim();
    const source = $(el).find('source').text().trim();
    const rawDesc = $(el).find('description').text();
    const snippet = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (title && link) {
      news_results.push({
        position: news_results.length + 1,
        title,
        link,
        snippet,
        source: {
          name: source || 'News Source',
          authors: []
        },
        date: pubDate,
        thumbnail: `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3`
      });
    }
  });

  const limit = parseInt(options.num || 10, 10);
  return {
    news_results: news_results.slice(0, limit),
    total_results: news_results.length
  };
}

module.exports = {
  scrapeGoogleNews
};
