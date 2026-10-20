const POPULAR_LOCATIONS = [
  { name: 'Austin, Texas, United States', country: 'United States', country_code: 'us', latitude: 30.2649, longitude: -97.7474 },
  { name: 'New York, New York, United States', country: 'United States', country_code: 'us', latitude: 40.7128, longitude: -74.0060 },
  { name: 'San Francisco, California, United States', country: 'United States', country_code: 'us', latitude: 37.7749, longitude: -122.4194 },
  { name: 'Los Angeles, California, United States', country: 'United States', country_code: 'us', latitude: 34.0522, longitude: -118.2437 },
  { name: 'London, Greater London, United Kingdom', country: 'United Kingdom', country_code: 'gb', latitude: 51.5074, longitude: -0.1278 },
  { name: 'São Paulo, State of São Paulo, Brazil', country: 'Brazil', country_code: 'br', latitude: -23.5505, longitude: -46.6333 },
  { name: 'Berlin, Germany', country: 'Germany', country_code: 'de', latitude: 52.5200, longitude: 13.4050 },
  { name: 'Tokyo, Japan', country: 'Japan', country_code: 'jp', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Paris, Île-de-France, France', country: 'France', country_code: 'fr', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Toronto, Ontario, Canada', country: 'Canada', country_code: 'ca', latitude: 43.6532, longitude: -79.3832 },
  { name: 'Sydney, New South Wales, Australia', country: 'Australia', country_code: 'au', latitude: -33.8688, longitude: 151.2093 }
];

async function searchLocations(query) {
  if (!query || query.trim().length === 0) {
    return POPULAR_LOCATIONS.slice(0, 5);
  }
  const qLower = query.toLowerCase().trim();
  const localMatches = POPULAR_LOCATIONS.filter(l => l.name.toLowerCase().includes(qLower));
  if (localMatches.length > 0) {
    return localMatches;
  }

  // Fallback to OpenStreetMap geocoding
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`, {
      headers: { 'User-Agent': 'SearchApiClone/1.0' }
    });
    const data = await res.json();
    return data.map(item => ({
      name: item.display_name,
      country: item.address?.country || 'Unknown',
      country_code: item.address?.country_code || 'us',
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }));
  } catch(e) {
    return [];
  }
}

module.exports = {
  POPULAR_LOCATIONS,
  searchLocations
};
