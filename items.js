// ============================================================
//  items.js — Loads shop items from Google Sheets
//  Sheet ID: 1LYE8aTssm-Zvp5UAoezqhP74DwpHn5nBXJpK1KjHDVU
//  Columns: name, price, category, level, image
// ============================================================

const SHEET_ID  = "1LYE8aTssm-Zvp5UAoezqhP74DwpHn5nBXJpK1KjHDVU";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

let ITEMS = [];

async function loadItemsFromSheet() {
  try {
    const response = await fetch(SHEET_URL);
    const text     = await response.text();

    const json = JSON.parse(text.substring(47, text.length - 2));
    const rows = json.table.rows;

    ITEMS = rows
      .filter(row => row.c[0] && row.c[0].v)
      .map((row, index) => {
        const get = (i) =>
          row.c[i] && row.c[i].v !== null ? String(row.c[i].v).trim() : "";

        const category = get(2).toLowerCase() || "misc";
        const imageVal = get(4);

        const categoryEmojis = {
          weapon:    "⚔️",
          armor:     "🛡️",
          potion:    "🧪",
          accessory: "💍",
          scroll:    "📜",
        };

        return {
          id:       index + 1,
          name:     get(0),
          price:    parseFloat(get(1)) || 0,
          category,
          level:    get(3) || "1",
          emoji:    categoryEmojis[category] || "🎁",
          image:    imageVal ? `images/${imageVal}` : null,
        };
      });

  } catch (err) {
    console.error("Could not load items from Google Sheet:", err);
    ITEMS = [];
  }
}
