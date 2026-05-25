// ── CONFIG ────────────────────────────────────────────────────────────────────
// Paste your Google Sheets ID here
const SHEET_ID = "1KZriY6MFzCVBtXZkcVRi36VW6nhtNb0uKmZGXJN8XIM";

// GitHub base path for weapon images (fallback only)
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

// ── STANDARD DATABASE PARSER (1 Row = 1 Weapon, Columns = Stats) ─────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/); // Safely handle Windows line endings
  if (lines.length < 2) return [];

  // Parse lines into a 2D grid
  const grid = lines.map(line => parseCSVLine(line));
  if (grid.length === 0 || grid[0].length === 0) return [];

  // The first row represents the column headers
  const headers = grid[0].map(header => header.trim().toLowerCase());
  const rows = [];

  // Rows 1 to N represent individual weapon records
  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const vals = grid[rowIdx];
    // Skip empty lines
    if (vals.length === 0 || (vals.length === 1 && vals[0] === "")) continue;

    const obj = {};
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const key = headers[colIdx];
      const val = vals[colIdx];
      if (key !== undefined && key !== "") {
        obj[key] = val !== undefined ? val.trim() : "";
      }
    }

    // Only process rows that have a valid name
    if (obj["name"] && obj["name"].trim() !== "") {
      rows.push(obj);
    }
  }
  return rows;
}

// ── NORMALIZE ROW → WEAPON OBJECT ─────────────────────────────────────────────
function normalizeWeapon(row) {
  // Clean surrounding quotes and whitespaces helper
  const cleanVal = (val) => {
    if (val === undefined || val === null) return "";
    return val.toString().replace(/^"|"$/g, "").trim(); // Strips double quotes from start/end
  };

  // Find keys in a highly robust, space/underscore/case-insensitive manner
  const getRowVal = (keysToTry) => {
    for (const key of keysToTry) {
      const normalizedTarget = key.toLowerCase().replace(/[\s_-]+/g, '');
      for (const rowKey of Object.keys(row)) {
        const normalizedRowKey = rowKey.toLowerCase().replace(/[\s_-]+/g, '');
        if (normalizedRowKey === normalizedTarget) {
          return row[rowKey];
        }
      }
    }
    return "";
  };

  const nameVal = cleanVal(getRowVal(["name"])) || "Unknown Item";
  const thumbFilename = cleanVal(getRowVal(["thumbnail", "image", "thumb"]));
  const levelsRaw = cleanVal(getRowVal(["levels available", "levels", "levelsavailable"])).replace(/"/g, "");
  
  // Fetch category info directly from the spreadsheet (handles "Category", "Type", "Weapon Type", etc.)
  const rawType = cleanVal(getRowVal(["category", "type", "weapontype", "weapon type"]));
  const weaponType = rawType ? (rawType.charAt(0).toUpperCase() + rawType.slice(1)) : "Swords";

  // Parse custom levels, splitting on commas, semicolons, spaces, and decimal dots (resolves locale issues)
  let parsedLevels = levelsRaw
  .split(/[|,;]+/)
  .map(lvl => lvl.trim())
  .filter(Boolean);
  // Parse quantity_available as a clean number
  const qtyRaw = cleanVal(getRowVal(["quantity_available", "quantity available", "quantity"]));
  const qtyVal = parseInt(qtyRaw, 10);

  const weapon = {
    name:                nameVal,
    type:                weaponType,
    levels_available:    parsedLevels,
    image:               thumbFilename ? `images/${thumbFilename}` : "",
    quantity_available:  isNaN(qtyVal) ? 0 : qtyVal,
    stats:               {} 
  };

  // Excluded columns to prevent duplicating or showing structural stats in the details block
  const excludedKeysNormalized = [
    "name", "thumbnail", "image", "thumb", 
    "levels available", "levels", "levelsavailable", 
    "type", "category", "weapontype", "weapon type",
    "quantityavailable", "quantity", "quantity_available"
  ].map(k => k.toLowerCase().replace(/[\s_-]+/g, ''));

  // Automatically save all other spreadsheet columns as stats
  Object.keys(row).forEach(key => {
    const normKey = key.toLowerCase().replace(/[\s_-]+/g, '');
    if (excludedKeysNormalized.includes(normKey)) return;

    const rawValue = cleanVal(row[key]);
    
    // Check if the value is a pure number to prevent stripping multiplier extensions (like "2x")
    const isPureNumber = /^-?\d+(\.\d+)?$/.test(rawValue);
    const numVal = parseFloat(rawValue);
    weapon.stats[key] = isPureNumber && !isNaN(numVal) ? numVal : rawValue;
  });

  return weapon;
}

// ── LOAD WEAPONS FROM THE UNIFIED "final" TAB ──────────────────────────────────
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
