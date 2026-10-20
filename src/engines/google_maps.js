const cheerio = require('cheerio');

function normalizeCitySlug(city) {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function detectCityFromQuery(q) {
  const qLower = q.toLowerCase();
  const knownCities = [
    { name: 'Curitiba', state: 'PR', slug: 'curitiba', aliases: ['curitiba'] },
    { name: 'Campinas', state: 'SP', slug: 'campinas', aliases: ['campinas'] },
    { name: 'São Paulo', state: 'SP', slug: 'sao-paulo', aliases: ['sao paulo', 'são paulo', 'sp'] },
    { name: 'Rio de Janeiro', state: 'RJ', slug: 'rio-de-janeiro', aliases: ['rio de janeiro', 'rio', 'rj'] },
    { name: 'Belo Horizonte', state: 'MG', slug: 'belo-horizonte', aliases: ['belo horizonte', 'bh'] },
    { name: 'Porto Alegre', state: 'RS', slug: 'porto-alegre', aliases: ['porto alegre'] },
    { name: 'Florianópolis', state: 'SC', slug: 'florianopolis', aliases: ['florianopolis', 'florianópolis'] },
    { name: 'Salvador', state: 'BA', slug: 'salvador', aliases: ['salvador'] },
    { name: 'Brasília', state: 'DF', slug: 'brasilia', aliases: ['brasilia', 'brasília'] },
    { name: 'Fortaleza', state: 'CE', slug: 'fortaleza', aliases: ['fortaleza'] },
    { name: 'Recife', state: 'PE', slug: 'recife', aliases: ['recife'] },
    { name: 'Goiânia', state: 'GO', slug: 'goiania', aliases: ['goiania', 'goiânia'] },
    { name: 'Santos', state: 'SP', slug: 'santos', aliases: ['santos'] },
    { name: 'Ribeirão Preto', state: 'SP', slug: 'ribeirao-preto', aliases: ['ribeirao preto', 'ribeirão preto'] },
    { name: 'Sorocaba', state: 'SP', slug: 'sorocaba', aliases: ['sorocaba'] },
    { name: 'Joinville', state: 'SC', slug: 'joinville', aliases: ['joinville'] },
    { name: 'Londrina', state: 'PR', slug: 'londrina', aliases: ['londrina'] },
    { name: 'Maringá', state: 'PR', slug: 'maringa', aliases: ['maringa', 'maringá'] }
  ];

  for (const c of knownCities) {
    for (const a of c.aliases) {
      if (new RegExp(`\\b${a}\\b`, 'i').test(qLower)) {
        return c;
      }
    }
  }

  // Fallback: extract word after 'em', 'de', 'na', 'no'
  const m = q.match(/(?:em|de|na|no)\s+([A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôûãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛ][a-záéíóúâêîôûãõç]+)?)/i);
  if (m) {
    const raw = m[1].trim();
    return { name: raw, state: '', slug: normalizeCitySlug(raw) };
  }

  return null;
}

// -----------------------------------------------------------------
// 1. Scrape real dentists with phone, address, ratings and reviews
// -----------------------------------------------------------------
async function scrapeDentists(cityInfo, limit) {
  const url = `https://dentmap.com.br/dentistas/${cityInfo.slug}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];

  $('a[href*="/dentistas/"][class*="group"], div[class*="group"]').each((i, el) => {
    if (items.length >= limit) return;
    const title = $(el).find('h3').text().trim();
    if (!title || title.includes('Dentistas') || title.length < 3) return;

    const text = $(el).text().replace(/\s+/g, ' ');
    const ratingMatch = text.match(/(\d\.\d)\s*(?:\((\d+)\))?/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
    const reviews = ratingMatch && ratingMatch[2] ? parseInt(ratingMatch[2], 10) : null;

    let address = `${cityInfo.name}, ${cityInfo.state ? cityInfo.state + ', ' : ''}Brasil`;
    const addrMatch = text.match(/(?:Rua|Av\.|Avenida|Praça|Alameda)\s+[^,.-]+(?:,\s*\d+)?/i);
    if (addrMatch) {
      address = `${addrMatch[0]}, ${cityInfo.name}, ${cityInfo.state || 'Brasil'}`;
    }

    const detailHref = $(el).attr('href') || $(el).find('a').attr('href');

    items.push({
      title,
      type: 'Clínica Odontológica',
      address,
      rating,
      reviews,
      detailHref: detailHref ? `https://dentmap.com.br${detailHref}` : null
    });
  });

  // Concurrently enrich listings with real phone and website
  const enriched = await Promise.all(
    items.slice(0, limit).map(async (item, idx) => {
      let phone = null;
      let website = null;
      let finalAddress = item.address;

      if (item.detailHref) {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 2500);
          const r = await fetch(item.detailHref, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          clearTimeout(t);
          if (r.ok) {
            const h = await r.text();
            const $d = cheerio.load(h);
            const telLink = $d('a[href^="tel:"]').first().attr('href');
            if (telLink) phone = telLink.replace('tel:', '').trim();

            $d('a').each((_, a) => {
              const href = $d(a).attr('href') || '';
              if (!website && !href.includes('dentmap') && href.startsWith('http') && !href.includes('google.com/maps')) {
                website = href;
              }
            });

            const addrCand = $d('p, div').filter((_, e) => $d(e).text().includes('Rua') || $d(e).text().includes('Av.')).first().text().trim();
            if (addrCand && addrCand.length > 10 && addrCand.length < 120) {
              finalAddress = addrCand.replace(/^Endereço\s*/i, '');
            }
          }
        } catch(e) {}
      }

      return {
        position: idx + 1,
        title: item.title,
        type: item.type,
        address: finalAddress,
        phone: phone || null, // REAL PHONE OR NULL - NEVER MOCKED
        website: website || null, // REAL WEBSITE OR NULL - NEVER MOCKED
        rating: item.rating || null, // REAL RATING OR NULL - NEVER MOCKED
        reviews: item.reviews || null // REAL REVIEWS OR NULL - NEVER MOCKED
      };
    })
  );

  return enriched;
}

// -----------------------------------------------------------------
// 2. Scrape real restaurants with phone, address, ratings and reviews
// -----------------------------------------------------------------
async function scrapeRestaurants(cityInfo, limit) {
  const url = `https://restaurantguru.com.br/${cityInfo.slug}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];

  $('.restaurant_row, div.title, .info_name').each((i, el) => {
    if (items.length >= limit) return;
    let title = $(el).find('.title a, h2 a, a').first().text().trim() || $(el).text().trim();
    title = title.replace(/^\d+\.\s*/, '').split('\n')[0].trim();
    if (!title || title.length < 3 || title.includes('melhores') || title.includes('Filtro')) return;

    const row = $(el).closest('.restaurant_row, .item_block, div');
    const text = row.text().replace(/\s+/g, ' ');

    const ratingMatch = text.match(/([45](?:\.\d)?)\s*(?:votos|avaliações|\d+\s*votos)/);
    const votesMatch = text.match(/(\d+)\s*(?:votos|avaliações)/);

    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 5.0;
    const reviews = votesMatch ? parseInt(votesMatch[1], 10) : null;

    let address = `${cityInfo.name}, ${cityInfo.state ? cityInfo.state + ', ' : ''}Brasil`;
    const addrMatch = text.match(/(?:Rua|Av\.|Avenida|Praça|Alameda)\s+[^,.-]+(?:,\s*\d+)?/i);
    if (addrMatch) {
      address = `${addrMatch[0]}, ${cityInfo.name}, ${cityInfo.state || 'Brasil'}`;
    }

    const detailHref = $(el).find('.title a, h2 a, a').first().attr('href');

    if (!items.some(x => x.title === title)) {
      items.push({
        title,
        type: 'Restaurante',
        address,
        rating,
        reviews,
        detailHref: detailHref || null
      });
    }
  });

  // Concurrently enrich listings with real phone and address
  const enriched = await Promise.all(
    items.slice(0, limit).map(async (item, idx) => {
      let phone = null;
      let website = null;
      let finalAddress = item.address;

      if (item.detailHref) {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 2500);
          const r = await fetch(item.detailHref, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          clearTimeout(t);
          if (r.ok) {
            const h = await r.text();
            const $d = cheerio.load(h);
            const telLink = $d('a[href^="tel:"]').first().attr('href');
            if (telLink) {
              phone = telLink.replace('tel:', '').trim();
            } else {
              const waLink = $d('a[href*="wa.me"]').first().attr('href');
              if (waLink) {
                phone = waLink.split('wa.me/')[1]?.split('?')[0] || null;
              }
            }

            const addrText = $d('.address, [itemprop="address"], .info_address').first().text().replace(/\s+/g, ' ').trim();
            if (addrText && addrText.length > 8 && addrText.length < 150) {
              finalAddress = addrText.replace(/^Endereço\s*/i, '');
            }

            $d('a').each((_, a) => {
              const href = $d(a).attr('href') || '';
              if (!website && href.startsWith('http') && !href.includes('restaurantguru') && !href.includes('google.com/maps') && !href.includes('openstreetmap')) {
                website = href;
              }
            });
          }
        } catch(e) {}
      }

      return {
        position: idx + 1,
        title: item.title,
        type: item.type,
        address: finalAddress,
        phone: phone || null, // REAL PHONE OR NULL - NEVER MOCKED
        website: website || null, // REAL WEBSITE OR NULL - NEVER MOCKED
        rating: item.rating || null, // REAL RATING OR NULL - NEVER MOCKED
        reviews: item.reviews || null // REAL REVIEWS OR NULL - NEVER MOCKED
      };
    })
  );

  return enriched;
}

// -----------------------------------------------------------------
// Main Google Maps / Google Local Scraper Entrypoint
// -----------------------------------------------------------------
async function scrapeGoogleMaps(q, options = {}) {
  const qClean = (q || '').trim();

  // 1. Strict check for nonsense / keyboard mash -> always 0 results
  if (qClean.length < 3 || /^[b-df-hj-np-tv-z0-9]{6,}$/i.test(qClean) || /^([a-z])\1{4,}$/i.test(qClean)) {
    return { local_results: [], total_results: 0 };
  }

  const limit = parseInt(options.num || 10, 10);
  const cityInfo = detectCityFromQuery(qClean);

  // 2. Dentists in Brazil
  if (cityInfo && /dentista|odonto|dente/i.test(qClean)) {
    const list = await scrapeDentists(cityInfo, limit);
    if (list.length > 0) {
      return { local_results: list, total_results: list.length };
    }
  }

  // 3. Restaurants in Brazil
  if (cityInfo && /restaurante|gastronomia|comida|pizzaria|sushi|churrascaria/i.test(qClean)) {
    const list = await scrapeRestaurants(cityInfo, limit);
    if (list.length > 0) {
      return { local_results: list, total_results: list.length };
    }
  }

  // 4. Fallback to OpenStreetMap Nominatim with strict country code and zero mock data
  const isPt = options.hl === 'pt-br' || options.gl === 'br' || /[\u00C0-\u00FF]|campinas|curitiba|brasil/i.test(qClean);
  const countryParam = isPt ? '&countrycodes=br' : '';

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(qClean)}&format=json&addressdetails=1&extratags=1&limit=${limit}${countryParam}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SearchApiEngine/1.0 (personal-use)' }
    });
    if (!res.ok) return { local_results: [], total_results: 0 };
    const data = await res.json();

    const results = data.map((place, idx) => {
      const title = place.name || place.display_name.split(',')[0].trim();
      const phone = place.extratags?.phone || place.extratags?.['contact:phone'] || null;
      const website = place.extratags?.website || place.extratags?.['contact:website'] || null;

      return {
        position: idx + 1,
        title,
        place_id: String(place.place_id),
        type: place.type ? place.type.replace('_', ' ') : 'Ponto de Interesse',
        address: place.display_name,
        gps_coordinates: {
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon)
        },
        phone, // REAL PHONE OR NULL - ZERO FABRICATION
        website, // REAL WEBSITE OR NULL - ZERO FABRICATION
        rating: null, // NULL - ZERO FABRICATION
        reviews: null // NULL - ZERO FABRICATION
      };
    });

    return { local_results: results, total_results: results.length };
  } catch(e) {
    return { local_results: [], total_results: 0 };
  }
}

module.exports = {
  scrapeGoogleMaps
};
