// ============================================================
//  items.js — Loads shop items from _data/items/*.json
//  No manifest needed — reads list directly from GitHub API
// ============================================================

let ITEMS = [];

async function loadItemsFromSheet() {
  try {
    // Use GitHub API to list all JSON files in _data/items/
    // This always reflects the latest files without needing a manifest
    const apiUrl = "https://api.github.com/repos/wrathishere/rpg-shop/contents/_data/items";
    const res    = await fetch(apiUrl);
    const files  = await res.json();

    // Filter to only .json files, exclude manifest.json
    const jsonFiles = files.filter(f =>
      f.name.endsWith(".json") && f.name !== "manifest.json"
    );

    // Fetch each item file
    const results = await Promise.all(
      jsonFiles.map(f => fetch(f.download_url).then(r => r.json()))
    );

    ITEMS = results.map((item, index) => ({
      id:          index + 1,
      name:        item.name        || "Unnamed Item",
      price:       item.price       || 0,
      category:    (item.category   || "other").toLowerCase(),
      level:       item.level       || 1,
      sale:        item.sale        || false,
      image:       item.image       || null,
      description: item.description || "",
      emoji:       categoryEmoji(item.category),
    }));

  } catch (err) {
    console.error("Could not load items:", err);
    ITEMS = [];
  }
}

function categoryEmoji(cat) {
  const map = {
    weapon:    "⚔️",
    armor:     "🛡️",
    potion:    "🧪",
    accessory: "💍",
    scroll:    "📜",
    other:     "🎁",
  };
  return map[(cat || "").toLowerCase()] || "🎁";
}
