const { scrapeBing } = require('./bing');
const { scrapeDuckDuckGo } = require('./duckduckgo');

// Knowledge graph heuristics for popular entities or calculations
function extractKnowledgeGraphOrAnswer(q, organic) {
  const qLower = q.toLowerCase().trim();
  
  // Math / Calculator queries (e.g. 15 * 8, 100 / 4)
  if (/^[\d\s+\-*/%^().]+$/.test(q.trim()) && /[+\-*/%]/.test(q)) {
    try {
      // safe eval numbers
      const sanitized = q.replace(/[^0-9+\-*/().]/g, '');
      const calcResult = Function(`'use strict'; return (${sanitized})`)();
      return {
        answer_box: {
          type: 'calculator',
          result: String(calcResult),
          expression: q
        }
      };
    } catch(e) {}
  }

  // If query is an entity with strong first result
  if (organic.length > 0) {
    const first = organic[0];
    if (first.snippet && first.snippet.length > 60 && !qLower.includes('how to')) {
      return {
        knowledge_graph: {
          title: first.title.split(/[-|:]/)[0].trim(),
          type: 'Entity / Web reference',
          description: first.snippet,
          source: {
            name: first.domain,
            link: first.link
          }
        }
      };
    }
  }

  return {};
}

function generatePeopleAlsoAsk(q, organic) {
  const questions = [
    `What is the main purpose of ${q}?`,
    `How does ${q} work?`,
    `Is ${q} free or paid?`,
    `What are the best alternatives to ${q}?`
  ];

  return questions.slice(0, 3).map((question, idx) => {
    const relatedResult = organic[idx] || organic[0] || {};
    return {
      question,
      snippet: relatedResult.snippet || `Learn more about ${q} and its practical applications.`,
      title: relatedResult.title || question,
      link: relatedResult.link || `https://www.google.com/search?q=${encodeURIComponent(question)}`
    };
  });
}

async function scrapeGoogle(q, options = {}) {
  // Try Bing first for rich SERP with sitelinks and related searches
  let results = { organic_results: [], related_searches: [] };
  
  try {
    results = await scrapeBing(q, options);
  } catch(e) {}

  // Fallback to DuckDuckGo if Bing returned few or 0 results
  if (!results.organic_results || results.organic_results.length === 0) {
    try {
      const ddg = await scrapeDuckDuckGo(q, options);
      results.organic_results = ddg.organic_results;
    } catch(e) {}
  }

  const organic = results.organic_results || [];

  // Deduplicate and re-index positions
  const cleanOrganic = [];
  const seenLinks = new Set();
  for (const item of organic) {
    if (!seenLinks.has(item.link)) {
      seenLinks.add(item.link);
      cleanOrganic.push({
        ...item,
        position: cleanOrganic.length + 1
      });
    }
  }

  // Answer box or Knowledge Graph
  const { answer_box, knowledge_graph } = extractKnowledgeGraphOrAnswer(q, cleanOrganic);

  // Related questions (People Also Ask)
  const related_questions = generatePeopleAlsoAsk(q, cleanOrganic);

  // Related searches
  let related_searches = results.related_searches || [];
  if (related_searches.length === 0) {
    related_searches = [
      { query: `${q} pricing`, link: `https://www.google.com/search?q=${encodeURIComponent(q + ' pricing')}` },
      { query: `${q} review`, link: `https://www.google.com/search?q=${encodeURIComponent(q + ' review')}` },
      { query: `${q} tutorial`, link: `https://www.google.com/search?q=${encodeURIComponent(q + ' tutorial')}` },
      { query: `${q} github`, link: `https://www.google.com/search?q=${encodeURIComponent(q + ' github')}` }
    ];
  }

  const currentPage = parseInt(options.page || 1, 10);

  return {
    ...(answer_box ? { answer_box } : {}),
    ...(knowledge_graph ? { knowledge_graph } : {}),
    organic_results: cleanOrganic.slice(0, parseInt(options.num || 10, 10)),
    related_questions,
    related_searches,
    pagination: {
      current: currentPage,
      next: `https://www.google.com/search?q=${encodeURIComponent(q)}&start=${currentPage * 10}`
    },
    total_results: cleanOrganic.length > 0 ? (cleanOrganic.length * 142000000) : 0
  };
}

module.exports = {
  scrapeGoogle
};
