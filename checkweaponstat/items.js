// ── CONFIG ────────────────────────────────────────────────────────────────────
// Paste your Google Sheets ID here (the long string in the sheet URL)
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";

// Map: display label → exact tab name in your spreadsheet
// Add more weapon categories by adding entries here
const SHEET_TABS = {
  "Swords": "Swords",
  // "Axes": "Axes",
  // "Bows": "Bows",
};

// GitHub base path for weapon images (transparent PNGs)
const IMG_BASE = "https://raw.githubusercontent.com/wrathishere/wrathandfriends/main/checkweaponstat/images";

// ── FETCH SHEET AS CSV ────────────────────────────────────────────────────────
async function fetchSheetCSV(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch sheet "${tabName}" (HTTP ${res.status})`);
  return res.text();
}

// ── PARSE CSV ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  }).filter(r => r["Name"] && r["Name"].trim() !== "");
}

// ── NORMALIZE ROW → WEAPON OBJECT ─────────────────────────────────────────────
function normalizeWeapon(row, weaponType) {
  const n = v => parseFloat(v) || 0;
  return {
    name:                row["Name"].trim(),
    type:                weaponType,
    slash_base:          n(row["slash_base"]),
    slash_increase:      n(row["slash_increase"]),
    spirit_base:         n(row["spirit_base"]),
    spirit_increase:     n(row["spirit_increase"]),
    frost_base:          n(row["frost_base"]),
    frost_increase:      n(row["frost_increase"]),
    fire_base:           n(row["fire_base"]),
    fire_increase:       n(row["fire_increase"]),
    lightning_base:      n(row["lightning_base"]),
    lightning_increase:  n(row["lightning_increase"]),
    durability_base:     n(row["durability_base"]),
    durability_increase: n(row["durability_increase"]),
    stamina:             n(row["Stamina"]),
    eitr:                n(row["eitr"]),
    quantity:            n(row["Quantity Available"]),
    levels_available:    (row["levels available"] || "").split(",").map(s => s.trim()).filter(Boolean),
    image:               `${IMG_BASE}/${row["Name"].trim().replace(/\s+/g, "_")}.png`,
  };
}

// ── LOAD ALL WEAPONS FROM ALL TABS ────────────────────────────────────────────
async function loadWeaponShowcase() {
  const results = await Promise.all(
    Object.entries(SHEET_TABS).map(async ([displayType, tabName]) => {
      const csv  = await fetchSheetCSV(tabName);
      const rows = parseCSV(csv);
      return rows.map(r => normalizeWeapon(r, displayType));
    })
  );
  return results.flat();
}
