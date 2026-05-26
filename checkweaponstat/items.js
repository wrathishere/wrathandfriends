// ── CONFIG ────────────────────────────────────────────────────────────────────
const SHEET_ID = "1KZriY6MFzCVBtXZkcVRi36VW6nhtNb0uKmZGXJN8XIM";
// ── FETCH SHEET AS CSV ────────────────────────────────────────────────────────
async function fetchSheetCSV(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch sheet "${tabName}" (HTTP ${res.status})`);
  return res.text();
}

// ── CSV PARSER (RFC4180-style: handles quotes, commas, and multiline fields) ─
function parseCSV(text) {
  if (!text || !text.trim()) return [];

  const grid = [];
  let row = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQ && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }

    if (ch === ',' && !inQ) {
      row.push(cur.trim());
      cur = "";
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur.trim());
      grid.push(row);
      row = [];
      cur = "";
      continue;
    }

    cur += ch;
  }

  row.push(cur.trim());
  if (row.length > 1 || row[0] !== "") {
    grid.push(row);
  }

  if (grid.length < 2 || grid[0].length === 0) return [];

  const headers = grid[0].map(header => header.trim().toLowerCase());
  const rows = [];
  let mismatchedColumnRows = 0;

  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const vals = grid[rowIdx];
    if (vals.length === 0 || (vals.length === 1 && vals[0] === "")) continue;

    if (vals.length !== headers.length) mismatchedColumnRows++;

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
  if (mismatchedColumnRows > 0) {
    console.warn(`[weapon-data] ${mismatchedColumnRows} CSV row(s) had a column count different from headers (${headers.length}).`);
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
  const weaponType = rawType
    ? rawType.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    : "Swords";

  // Read 5 individual level columns — only show buttons for non-empty values
  const parsedLevels = [...new Set(["lvl_avl_1", "lvl_avl_2", "lvl_avl_3", "lvl_avl_4", "lvl_avl_5"]
    .map(key => cleanVal(getRowVal([key])))
    .filter(v => v !== "" && !isNaN(parseFloat(v)))
    .map(v => parseFloat(v)))].sort((a, b) => a - b).map(v => String(v));

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


function validateWeapon(weapon, idx) {
  const issues = [];

  if (!weapon.name || typeof weapon.name !== "string") issues.push("missing name");
  if (!weapon.type || typeof weapon.type !== "string") issues.push("missing type");
  if (!Array.isArray(weapon.levels_available)) issues.push("levels_available must be array");
  if (typeof weapon.stats !== "object" || weapon.stats === null) issues.push("stats must be object");

  if (issues.length > 0) {
    console.warn(`[weapon-data] Row ${idx + 1} skipped: ${issues.join(", ")}`, weapon);
    return false;
  }

  return true;
}

// ── LOAD WEAPONS ──────────────────────────────────────────────────────────────
async function loadWeaponShowcase() {
  try {
    const csv = await fetchSheetCSV("final");
    const rows = parseCSV(csv);
    const normalized = rows.map(r => normalizeWeapon(r));
    const validWeapons = normalized.filter((weapon, idx) => validateWeapon(weapon, idx));

    console.info(`[weapon-data] loaded ${validWeapons.length}/${rows.length} rows`);
    return validWeapons;
  } catch (err) {
    console.error("Error loading weapon database:", err);
    throw err;
  }
}
