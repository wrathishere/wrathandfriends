// ============================================================
//  items.js — Loads shop items from _data/items/*.json
//  Each JSON file is one item, managed via Decap CMS admin
// ============================================================

let ITEMS = [];

async function loadItemsFromSheet() {
  try {
    // Use relative path that works on GitHub Pages subdirectory
    const base = window.location.pathname.replace(/\/[^/]*$/, '');
    const manifestUrl = `${base}/_data/items/manifest.json`;

    const res      = await fetch(manifestUrl);
    const manifest = await res.json();

    const results = await Promise.all(
      manifest.map(filename =>
        fetch(`${base}/_data/items/${filename}`).then(r => r.json())
      )
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
