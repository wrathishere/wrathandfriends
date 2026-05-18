// ============================================================
//  items.js — Dynamic data loader
//  Fetches item JSON from GitHub RAW with cache busting
//  Auto-refreshes every 60 seconds to catch new commits fast
// ============================================================

const REPO_RAW   = "https://raw.githubusercontent.com/wrathishere/rpg-shop/main";
const CACHE_TIME = 60000; // auto-refresh interval in ms (60s)

let ITEMS        = [];
let _lastFetched = 0;

// ── Main loader ───────────────────────────────────────────
// Called by shop.js on init and on auto-refresh
async function loadItemsFromSheet(force = false) {
  const now = Date.now();

  // Skip if fetched recently and not forced
  if (!force && ITEMS.length > 0 && (now - _lastFetched) < CACHE_TIME) return;

  try {
    // Cache-bust with timestamp so GitHub CDN doesn't serve stale content
    const bust     = `?t=${now}`;
    const manifest = await fetchJSON(`${REPO_RAW}/_data/items/manifest.json${bust}`);

    const validFiles = manifest.filter(f =>
      f && f.endsWith(".json") && f !== "manifest.json"
    );

    const results = await Promise.all(
      validFiles.map(f => fetchJSON(`${REPO_RAW}/_data/items/${f}${bust}`))
    );

    ITEMS = results
      .map((item, index) => normalizeItem(item, index))
      .filter(item => item !== null);

    _lastFetched = now;

  } catch (err) {
    console.error("[Shop] Failed to load items:", err);
    // Keep existing ITEMS if we have them — don't blank the shop on a refresh failure
    if (ITEMS.length === 0) ITEMS = [];
  }
}

// ── Normalize raw JSON into a consistent item shape ───────
function normalizeItem(raw, index) {
  if (!raw || !raw.name) return null;

  const category = (raw.category || "other").toLowerCase().trim();

  return {
    id:           index + 1,
    // Core fields
    name:         raw.name         || "Unnamed Item",
    description:  raw.description  || "",
    price:        parseFloat(raw.price) || 0,
    category:     category,
    level:        parseInt(raw.level)   || 1,
    // Image — use full raw URL so it loads without GitHub Pages rebuild
    image:        raw.image ? `${REPO_RAW}/${raw.image}?t=${_lastFetched}` : null,
    // Tags — array, supports both string "a,b,c" and array ["a","b"]
    tags:         normalizeTags(raw.tags),
    tagGroups:    normalizeTagGroups(raw),
    // Availability — true by default
    available:    raw.availability !== false && raw.available !== false,
    // Sale fields
    onSale:       raw.onSale       || false,
    salePrice:    raw.salePrice    ?? null,
    globalSaleOn: raw.globalSaleOn || false,
    salePricePct: raw.salePricePct ?? null,
    // Fallback emoji if no image
    emoji:        categoryEmoji(category),
  };
}

// ── Helpers ───────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map(t => t.trim()).filter(Boolean);
  return [];
}

function categoryEmoji(cat) {
  const map = {
    weapon:    "⚔️",
    armor:     "🛡️",
    potion:    "🧪",
    accessory: "💍",
    scroll:    "📜",
    food:      "🍖",
    other:     "🎁",
  };
  return map[cat] || "🎁";
}


function normalizeTagGroups(raw) {
  if (raw.tagGroups && typeof raw.tagGroups === "object") {
    const out = {};
    Object.entries(raw.tagGroups).forEach(([k, v]) => { out[k] = normalizeTags(v); });
    return out;
  }
  if (raw.tagsByCategory && typeof raw.tagsByCategory === "object") {
    const out = {};
    Object.entries(raw.tagsByCategory).forEach(([k, v]) => { out[k] = normalizeTags(v); });
    return out;
  }
  return { Tags: normalizeTags(raw.tags) };
}
