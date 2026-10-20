const cheerio = require('cheerio');
const { getRandomUserAgent } = require('../utils/userAgents');

async function scrapeDuckDuckGo(q, options = {}) {
  const url = 'https://html.duckduckgo.com/html/';
  const userAgent = getRandomUserAgent(options.device);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': options.hl ? `${options.hl},en;q=0.5` : 'en-US,en;q=0.9'
    },
    body: `q=${encodeURIComponent(q)}`
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const organic_results = [];
  $('.result').each((i, el) => {
    const titleEl = $(el).find('.result__title a');
    const title = titleEl.text().trim();
    let rawLink = titleEl.attr('href') || '';
    
    // Resolve clean link
    let link = rawLink;
    if (rawLink.includes('uddg=')) {
      try {
        const u = new URL('https://duckduckgo.com' + rawLink);
        link = decodeURIComponent(u.searchParams.get('uddg'));
      } catch(e) {}
    }
    
    const snippet = $(el).find('.result__snippet').text().trim();
    const displayed_link = $(el).find('.result__url').text().trim();

    if (title && link && !link.includes('duckduckgo.com')) {
      let domain = '';
      try { domain = new URL(link).hostname; } catch(e) {}
      organic_results.push({
        position: organic_results.length + 1,
        title,
        link,
        domain,
        displayed_link: displayed_link || domain,
        snippet
      });
    }
  });

  return {
    organic_results,
    total_results: organic_results.length
  };
}

module.exports = {
  scrapeDuckDuckGo
};
