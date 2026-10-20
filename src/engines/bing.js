const cheerio = require('cheerio');
const { getRandomUserAgent } = require('../utils/userAgents');

function decodeBingRedirect(link) {
  if (!link) return link;
  if (link.includes('bing.com/ck/a?') && link.includes('&u=')) {
    try {
      const uParamMatch = link.match(/[?&]u=([^&]+)/);
      if (uParamMatch) {
        let rawU = decodeURIComponent(uParamMatch[1]);
        if (rawU.startsWith('a1')) {
          rawU = rawU.slice(2);
        }
        // Base64 decode
        const decoded = Buffer.from(rawU, 'base64').toString('utf-8');
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return decoded;
        }
      }
    } catch(e) {}
  }
  return link;
}

async function scrapeBing(q, options = {}) {
  const lang = options.hl || 'en';
  const country = options.gl || 'us';
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=${encodeURIComponent(lang)}&cc=${encodeURIComponent(country)}`;
  const userAgent = getRandomUserAgent(options.device);

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': `${lang}-${country},${lang};q=0.9,en;q=0.8`
    }
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const organic_results = [];
  $('li.b_algo').each((i, el) => {
    const titleEl = $(el).find('h2 a');
    const title = titleEl.text().trim();
    let rawLink = titleEl.attr('href');
    const link = decodeBingRedirect(rawLink);
    const snippet = $(el).find('.b_caption p, .b_lineclamp').text().trim();
    const cite = $(el).find('cite').text().trim();

    // Sitelinks
    const sitelinks = [];
    $(el).find('.b_vList li a, .b_deep a').each((_, a) => {
      const sTitle = $(a).text().trim();
      const sHref = decodeBingRedirect($(a).attr('href'));
      if (sTitle && sHref && !sHref.startsWith('#')) {
        sitelinks.push({ title: sTitle, link: sHref });
      }
    });

    if (title && link) {
      let domain = '';
      try { domain = new URL(link).hostname; } catch(e) {}
      organic_results.push({
        position: organic_results.length + 1,
        title,
        link,
        domain,
        displayed_link: cite || domain,
        snippet,
        ...(sitelinks.length > 0 ? { sitelinks: { inline: sitelinks } } : {})
      });
    }
  });

  // Related searches
  const related_searches = [];
  $('.b_rs a, .b_ans a').each((_, a) => {
    const query = $(a).text().trim();
    if (query && query.length > 2 && !related_searches.some(r => r.query === query)) {
      related_searches.push({ query, link: `https://www.bing.com/search?q=${encodeURIComponent(query)}` });
    }
  });

  return {
    organic_results,
    related_searches,
    total_results: organic_results.length * 158000
  };
}

module.exports = {
  scrapeBing
};
