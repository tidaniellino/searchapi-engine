const { generateSearchId } = require('../utils/idGenerator');
const { scrapeGoogle } = require('./google');
const { scrapeBing } = require('./bing');
const { scrapeDuckDuckGo } = require('./duckduckgo');
const { scrapeGoogleNews } = require('./google_news');
const { scrapeGoogleImages } = require('./google_images');
const { scrapeGoogleScholar } = require('./google_scholar');
const { scrapeGoogleMaps } = require('./google_maps');
const { scrapeGoogleAutocomplete } = require('./google_autocomplete');
const { scrapeYouTube } = require('./youtube');
const { scrapeAmazon } = require('./amazon');

const ENGINES = {
  google: { name: 'Google Search', handler: scrapeGoogle },
  google_news: { name: 'Google News', handler: scrapeGoogleNews },
  google_images: { name: 'Google Images', handler: scrapeGoogleImages },
  google_scholar: { name: 'Google Scholar', handler: scrapeGoogleScholar },
  google_maps: { name: 'Google Maps', handler: scrapeGoogleMaps },
  google_local: { name: 'Google Local', handler: scrapeGoogleMaps },
  google_autocomplete: { name: 'Google Autocomplete', handler: scrapeGoogleAutocomplete },
  bing: { name: 'Bing Search', handler: scrapeBing },
  duckduckgo: { name: 'DuckDuckGo', handler: scrapeDuckDuckGo },
  youtube: { name: 'YouTube Search', handler: scrapeYouTube },
  amazon: { name: 'Amazon Search', handler: scrapeAmazon }
};

function listEngines() {
  return Object.entries(ENGINES).map(([key, val]) => ({
    engine: key,
    name: val.name,
    parameters: [
      { name: 'q', type: 'string', required: true, description: 'Search query' },
      { name: 'engine', type: 'string', required: false, default: 'google' },
      { name: 'device', type: 'string', required: false, options: ['desktop', 'mobile'] },
      { name: 'hl', type: 'string', required: false, default: 'en' },
      { name: 'gl', type: 'string', required: false, default: 'us' },
      { name: 'num', type: 'integer', required: false, default: 10 },
      { name: 'page', type: 'integer', required: false, default: 1 },
      { name: 'location', type: 'string', required: false }
    ]
  }));
}

async function executeSearch(engineKey = 'google', query, options = {}, baseUrl = 'http://localhost:3000') {
  const normalizedEngine = (engineKey || 'google').toLowerCase();
  const engineConfig = ENGINES[normalizedEngine] || ENGINES.google;
  
  const startTime = Date.now();
  const searchId = generateSearchId();
  
  // Execute scraping handler
  const data = await engineConfig.handler(query, options);
  
  const endTime = Date.now();
  const totalSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));
  const requestTime = parseFloat((totalSeconds * 0.9).toFixed(2));
  const parsingTime = parseFloat((totalSeconds - requestTime).toFixed(2));

  // Build SearchApi.io standard response
  const response = {
    search_metadata: {
      id: searchId,
      status: 'Success',
      created_at: new Date().toISOString(),
      request_time_taken: requestTime,
      parsing_time_taken: parsingTime,
      total_time_taken: totalSeconds,
      request_url: `${baseUrl}/api/v1/search?engine=${normalizedEngine}&q=${encodeURIComponent(query)}`,
      html_url: `${baseUrl}/api/v1/searches/${searchId}.html`,
      json_url: `${baseUrl}/api/v1/searches/${searchId}`
    },
    search_parameters: {
      engine: normalizedEngine,
      q: query,
      device: options.device || 'desktop',
      hl: options.hl || 'en',
      gl: options.gl || 'us',
      ...(options.location ? { location: options.location } : {}),
      ...(options.num ? { num: parseInt(options.num, 10) } : {}),
      ...(options.page ? { page: parseInt(options.page, 10) } : {})
    },
    search_information: {
      query_displayed: query,
      total_results: data.total_results || 1000000,
      time_taken_displayed: parseFloat((Math.random() * 0.4 + 0.2).toFixed(2)),
      detected_location: options.location || (options.gl === 'br' ? 'Brazil' : 'United States')
    },
    ...data
  };

  return response;
}

module.exports = {
  ENGINES,
  listEngines,
  executeSearch
};
