class SearchCache {
  constructor(ttlMs = 1000 * 60 * 60) { // default 1 hour TTL
    this.ttlMs = ttlMs;
    this.queryMap = new Map();
    this.idMap = new Map();
  }

  get(engine, query, options = {}) {
    const key = `${engine}::${query}::${options.hl || ''}::${options.gl || ''}::${options.page || 1}`;
    const cached = this.queryMap.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.queryMap.delete(key);
      this.idMap.delete(cached.data.search_metadata?.id);
      return null;
    }
    return cached.data;
  }

  getById(searchId) {
    const cached = this.idMap.get(searchId);
    if (!cached) return null;
    return cached;
  }

  set(engine, query, options = {}, data) {
    const key = `${engine}::${query}::${options.hl || ''}::${options.gl || ''}::${options.page || 1}`;
    const item = { timestamp: Date.now(), data };
    this.queryMap.set(key, item);
    if (data.search_metadata?.id) {
      this.idMap.set(data.search_metadata.id, data);
    }
    // Limit memory size
    if (this.queryMap.size > 2000) {
      const oldestKey = this.queryMap.keys().next().value;
      const oldestData = this.queryMap.get(oldestKey);
      if (oldestData?.data?.search_metadata?.id) {
        this.idMap.delete(oldestData.data.search_metadata.id);
      }
      this.queryMap.delete(oldestKey);
    }
  }
}

const searchCache = new SearchCache();

module.exports = searchCache;
