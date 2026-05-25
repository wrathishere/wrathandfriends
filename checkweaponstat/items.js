// ── CONFIG ────────────────────────────────────────────────────────────────────
// Paste your Google Sheets ID here (the long string in the sheet URL)
const SHEET_ID = "1hQNwJ-UDoQxhamy4IiLcb4ClHxIaquDGu6_LSM1ehZ0";

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

// ── CSV LINE PARSER (Handles quotes and commas) ───────────────────────────────
function parseCSVLine(line) {
  const vals = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++; // skip next quote
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      vals.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  vals.push(cur.trim());
  return vals;
}

// ── TRANSPOSE PARSER (Converts Weapon Columns to Rows with Lowercase Keys) ────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 1) return [];

  // Parse lines into a 2D grid
  const grid = lines.map(line => parseCSVLine(line));
  if (grid.length === 0 || grid[0].length < 2) return [];

  const weaponsCount = grid[0].length;
  const rows = [];

  // Column index 0 has key labels (e.g. "Name", "durability_base").
  // Columns 1 to N represent individual weapon columns.
  for (let colIdx = 1; colIdx < weaponsCount; colIdx++) {
    const obj = {};
    for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
      const key = grid[rowIdx][0];
      const val = grid[rowIdx][colIdx];
      if (key !== undefined && key !== "") {
        // Enforce lowercase keys to prevent matching casing bugs
        obj[key.trim().toLowerCase()] = val !== undefined ? val.trim() : "";
      }
    }
    // Check lowercase key
    if (obj["name"] && obj["name"].trim() !== "") {
      rows.push(obj);
    }
  }
  return rows;
}

// ── NORMALIZE ROW → WEAPON OBJECT ─────────────────────────────────────────────
function normalizeWeapon(row, weaponType) {
  const n = v => parseFloat(v) || 0;
  
  // Clean values from lowercase keys
  const nameVal = row["name"] ? row["name"].trim() : "Unknown Item";
  const thumbFilename = row["thumbnail"] ? row["thumbnail"].trim() : "";
  const levelsRaw = row["levels available"] || "";

  const weapon = {
    name:                nameVal,
    type:                weaponType,
    levels_available:    levelsRaw.split(",").map(s => s.trim()).filter(Boolean),
    // Fallback to local images folder or use remote GitHub folder
    image:               thumbFilename ? `images/${thumbFilename}` : "",
    stats:               {} 
  };

  // Automatically save all other spreadsheet rows as dynamic stats
  Object.keys(row).forEach(key => {
    if (["name", "thumbnail", "levels available"].includes(key)) return;
    const numVal = parseFloat(row[key]);
    weapon.stats[key] = !isNaN(numVal) ? numVal : row[key].trim();
  });

  return weapon;
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
