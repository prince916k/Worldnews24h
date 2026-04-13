const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "WorldNews24h/1.0",
  },
});

const FEEDS = [
  { name: "Reuters World", url: "https://feeds.reuters.com/Reuters/worldNews" },
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { name: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = {
  data: [],
  fetchedAt: 0,
};

function toTimestamp(item) {
  const rawDate = item.isoDate || item.pubDate || item.published || item.updated;
  const parsed = Date.parse(rawDate || "");
  return Number.isNaN(parsed) ? null : parsed;
}

function stripHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchNews24h() {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;

  if (cache.fetchedAt && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items || []).map((item) => ({
        source: feed.name,
        title: item.title || "Untitled",
        link: item.link || "",
        publishedAt: toTimestamp(item),
        description: stripHtml(item.contentSnippet || item.content || item.summary || ""),
      }));
    })
  );

  const allItems = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((item) => item.link && item.publishedAt && item.publishedAt >= cutoff);

  const dedupedMap = new Map();
  for (const item of allItems) {
    const key = item.link || `${item.title}-${item.publishedAt}`;
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, item);
    }
  }

  const sorted = [...dedupedMap.values()].sort((a, b) => b.publishedAt - a.publishedAt);

  cache = {
    data: sorted,
    fetchedAt: now,
  };

  return sorted;
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 100, 200));
    const items = await fetchNews24h();

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=180");
    res.status(200).json({
      updatedAt: new Date().toISOString(),
      windowHours: 24,
      total: items.length,
      items: items.slice(0, limit),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch news feeds.",
      details: error.message,
    });
  }
};
