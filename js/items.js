// ============================================================
//  items.js — Loads shop items from GitHub API
// ============================================================

let ITEMS = [];

async function loadItemsFromSheet() {
  try {
    const apiUrl = "https://api.github.com/repos/wrathishere/rpg-shop/contents/_data/items";
    const res    = await fetch(apiUrl);
    const files  = await res.json();

    if (!Array.isArray(files)) throw new Error("Could not read items");

    const jsonFiles = files.filter(f =>
      f.name.endsWith(".json") && f.name !== "manifest.json"
    );

    const results = await Promise.all(
      jsonFiles.map(f => fetch(f.download_url).then(r => r.json()))
    );

    ITEMS = results.map((item, index) => ({
      id:           index + 1,
      name:         item.name         || "Unnamed Item",
      price:        item.price        || 0,
      category:     (item.category    || "other").toLowerCase(),
      level:        item.level        || 1,
      image:        item.image        || null,
      description:  item.description  || "",
      emoji:        categoryEmoji(item.category),
      // ── Sale fields ──
      onSale:       item.onSale       || false,
      salePrice:    item.salePrice    ?? null,
      globalSaleOn: item.globalSaleOn || false,
      salePricePct: item.salePricePct ?? null,
      discountPct:  item.discountPct  || 0,
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
