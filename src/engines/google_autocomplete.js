async function scrapeGoogleAutocomplete(q, options = {}) {
  const hl = options.hl || 'en';
  const gl = options.gl || 'us';
  const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}`;

  const suggestions = [];

  try {
    const res = await fetch(url);
    const data = await res.json();
    const list = data[1] || [];

    list.forEach((val, idx) => {
      suggestions.push({
        value: val,
        relevance: 1000 - idx * 25
      });
    });
  } catch(e) {}

  return {
    suggestions
  };
}

module.exports = {
  scrapeGoogleAutocomplete
};
