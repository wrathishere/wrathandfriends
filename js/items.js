// ============================================================
//  items.js — Loads shop items from manifest + raw GitHub URLs
// ============================================================

let ITEMS = [];

const RAW_BASE = "https://raw.githubusercontent.com/wrathishere/rpg-shop/main";

async function loadItemsFromSheet() {
  try {
    // Use raw URL for manifest — avoids GitHub API entirely
    const manifestRes = await fetch(`${RAW_BASE}/_data/items/manifest.json`);
    const manifest    = await manifestRes.json();

    const results = await Promise.all(
      manifest
        .filter(f => f !== "manifest.json")
        .map(f => fetch(`${RAW_BASE}/_data/items/${f}`).then(r => r.json()))
    );

    ITEMS = results.map((item, index) => ({
      id:           index + 1,
      name:         item.name         || "Unnamed Item",
      price:        item.price        || 0,
      category:     (item.category    || "other").toLowerCase(),
      level:        item.level        || 1,
      image:        item.image        ? `${RAW_BASE}/${item.image}` : null,
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
