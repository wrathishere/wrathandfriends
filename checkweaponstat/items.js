// ── CONFIG ────────────────────────────────────────────────────────────────────
const SHEET_ID = "1KZriY6MFzCVBtXZkcVRi36VW6nhtNb0uKmZGXJN8XIM";
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
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      vals.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  vals.push(cur.trim());
  return vals;
}

// ── CSV PARSER (1 Row = 1 Weapon) ────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const grid = lines.map(line => parseCSVLine(line));
  if (grid.length === 0 || grid[0].length === 0) return [];

  const headers = grid[0].map(header => header.trim().toLowerCase());
  const rows = [];

  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const vals = grid[rowIdx];
    if (vals.length === 0 || (vals.length === 1 && vals[0] === "")) continue;

    const obj = {};
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const key = headers[colIdx];
      const val = vals[colIdx];
      if (key !== undefined && key !== "") {
        obj[key] = val !== undefined ? val.trim() : "";
      }
    }

    if (obj["name"] && obj["name"].trim() !== "") {
      rows.push(obj);
    }
  }
  return rows;
}

// ── NORMALIZE ROW → WEAPON OBJECT ─────────────────────────────────────────────
function normalizeWeapon(row) {
  const cleanVal = (val) => {
    if (val === undefined || val === null) return "";
    return val.toString().replace(/^"|"$/g, "").trim();
  };

  const getRowVal = (keysToTry) => {
    for (const key of keysToTry) {
      const normalizedTarget = key.toLowerCase().replace(/[\s_-]+/g, '');
      for (const rowKey of Object.keys(row)) {
        const normalizedRowKey = rowKey.toLowerCase().replace(/[\s_-]+/g, '');
        if (normalizedRowKey === normalizedTarget) return row[rowKey];
      }
    }
    return "";
  };

  const nameVal = cleanVal(getRowVal(["name"])) || "Unknown Item";
  const thumbFilename = cleanVal(getRowVal(["thumbnail", "image", "thumb"]));
  const rawType = cleanVal(getRowVal(["category", "type", "weapontype", "weapon type"]));
  const weaponType = rawType ? (rawType.charAt(0).toUpperCase() + rawType.slice(1)) : "Swords";

  // Read 5 individual level columns — only show buttons for non-empty values
  const parsedLevels = ["lvl_avl_1", "lvl_avl_2", "lvl_avl_3", "lvl_avl_4", "lvl_avl_5"]
    .map(key => cleanVal(getRowVal([key])))
    .filter(v => v !== "" && !isNaN(parseFloat(v)))
    .map(v => String(parseFloat(v)));

  const qtyRaw = cleanVal(getRowVal(["quantity_available", "quantity available", "quantity"]));
  const qtyVal = parseInt(qtyRaw, 10);

  const description = cleanVal(getRowVal(["description"]));

  const weapon = {
    name:               nameVal,
    type:               weaponType,
    levels_available:   parsedLevels,
    image:              thumbFilename ? `images/${thumbFilename}` : "",
    quantity_available: isNaN(qtyVal) ? 0 : qtyVal,
    description:        description,
    stats:              {}
  };

  // Excluded keys — not shown as stats
  const excludedKeysNormalized = [
    "name", "thumbnail", "image", "thumb",
    "type", "category", "weapontype", "weapon type",
    "quantityavailable", "quantity", "quantityavailable",
    "lvlavl1", "lvlavl2", "lvlavl3", "lvlavl4", "lvlavl5",
    "description"
  ].map(k => k.toLowerCase().replace(/[\s_-]+/g, ''));

  Object.keys(row).forEach(key => {
    const normKey = key.toLowerCase().replace(/[\s_-]+/g, '');
    if (excludedKeysNormalized.includes(normKey)) return;

    const rawValue = cleanVal(row[key]);
    const isPureNumber = /^-?\d+(\.\d+)?$/.test(rawValue);
    const numVal = parseFloat(rawValue);
    weapon.stats[key] = isPureNumber && !isNaN(numVal) ? numVal : rawValue;
  });

  return weapon;
}

// ── LOAD WEAPONS ──────────────────────────────────────────────────────────────
async function loadWeaponShowcase() {
  try {
    const csv = await fetchSheetCSV("final");
    const rows = parseCSV(csv);
    return rows.map(r => normalizeWeapon(r));
  } catch (err) {
    console.error("Error loading weapon database:", err);
    throw err;
  }
}
