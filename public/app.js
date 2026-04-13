const listEl = document.getElementById("newsList");
const sourceBarEl = document.getElementById("sourceBar");
const metaEl = document.getElementById("meta");
const refreshBtn = document.getElementById("refreshBtn");

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function relativeTime(timestamp) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncate(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function renderSourceBar(items) {
  const counts = items.reduce((acc, item) => {
    const key = item.source || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pills = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([source, count]) => `<span class="source-pill">${source} (${count})</span>`)
    .join("");

  sourceBarEl.innerHTML = pills || "";
}

function renderItems(items) {
  if (!items.length) {
    sourceBarEl.innerHTML = "";
    listEl.innerHTML = '<div class="empty">No world news stories were found in the last 24 hours.</div>';
    return;
  }

  renderSourceBar(items);

  listEl.innerHTML = items
    .map((item) => {
      const safeDesc = (item.description || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `
        <article class="news-item">
          <div class="news-head">
            <span class="source">${item.source}</span>
            <span class="time" title="${formatDate(item.publishedAt)}">${relativeTime(item.publishedAt)}</span>
          </div>
          <h2><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h2>
          <p class="item-desc">${truncate(safeDesc || "No description available.", 220)}</p>
        </article>
      `;
    })
    .join("");
}

async function loadNews() {
  metaEl.textContent = "Updating...";
  try {
    const response = await fetch("/api/news?limit=100");
    if (!response.ok) throw new Error("Request failed");
    const data = await response.json();

    renderItems(data.items || []);
    metaEl.textContent = `Last updated: ${new Date(data.updatedAt).toLocaleString()} | ${data.total} stories from the last ${data.windowHours} hours`;
  } catch (err) {
    metaEl.textContent = "Could not load news right now.";
    sourceBarEl.innerHTML = "";
    listEl.innerHTML = '<div class="empty">Please try again in a moment.</div>';
  }
}

refreshBtn.addEventListener("click", loadNews);

loadNews();
setInterval(loadNews, 5 * 60 * 1000);
