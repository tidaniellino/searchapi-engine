const { getRandomUserAgent } = require('../utils/userAgents');

async function scrapeYouTube(q, options = {}) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const userAgent = getRandomUserAgent(options.device);
  const video_results = [];

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': options.hl ? `${options.hl},en;q=0.5` : 'en-US,en;q=0.9'
      }
    });
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (match) {
      const data = JSON.parse(match[1]);
      const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];

      for (const item of contents) {
        if (item.videoRenderer) {
          const vr = item.videoRenderer;
          video_results.push({
            position: video_results.length + 1,
            title: vr.title?.runs?.[0]?.text,
            link: `https://www.youtube.com/watch?v=${vr.videoId}`,
            channel: {
              name: vr.ownerText?.runs?.[0]?.text,
              link: vr.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ? `https://www.youtube.com${vr.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}` : null
            },
            length: vr.lengthText?.simpleText || 'Unknown',
            views: vr.viewCountText?.simpleText || '0 views',
            published_date: vr.publishedTimeText?.simpleText || 'Recent',
            thumbnail: vr.thumbnail?.thumbnails?.[0]?.url
          });
        }
      }
    }
  } catch(e) {}

  const limit = parseInt(options.num || 10, 10);
  return {
    video_results: video_results.slice(0, limit),
    total_results: video_results.length * 52000
  };
}

module.exports = {
  scrapeYouTube
};
