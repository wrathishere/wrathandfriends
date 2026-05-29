// ============================================================
//  items.js — Google Sheets inventory service layer
//  Google Sheet → Normalize data → Existing frontend UI
// ============================================================

const CACHE_TIME = 60000; // auto-refresh interval in ms (60s)

const SHOP_INVENTORY_SHEET_CSV = window.SHOP_INVENTORY_SHEET_CSV || "";
const SHOP_SETTINGS_SHEET_CSV = window.SHOP_SETTINGS_SHEET_CSV || "";
const SHOP_IMAGE_BASE_URL = window.SHOP_IMAGE_BASE_URL || "images";

let ITEMS = [];
let SHOP_SETTINGS = getDefaultShopSettings();
let _lastFetched = 0;

// ── Main loader ───────────────────────────────────────────
// Called by shop.js on init and on auto-refresh.
async function loadItemsFromSheet(force = false) {
  const now = Date.now();

  // Skip if fetched recently and not forced.
  if (!force && ITEMS.length > 0 && (now - _lastFetched) < CACHE_TIME) return;

  if (!SHOP_INVENTORY_SHEET_CSV) {
    console.error("[Shop] Missing window.SHOP_INVENTORY_SHEET_CSV Google Sheet URL.");
    if (ITEMS.length === 0) ITEMS = [];
    return;
  }

  try {
    const [inventoryRows, settingsRows] = await Promise.all([
      fetchCSVRows(withCacheBust(SHOP_INVENTORY_SHEET_CSV, now)),
      SHOP_SETTINGS_SHEET_CSV
        ? fetchCSVRows(withCacheBust(SHOP_SETTINGS_SHEET_CSV, now)).catch(error => {
            console.warn("[Shop] Failed to load settings sheet:", error);
            return [];
          })
        : Promise.resolve([])
    ]);

    SHOP_SETTINGS = normalizeShopSettings(settingsRows[0] || {});

    ITEMS = inventoryRows
      .map((item, index) => normalizeSheetItem(item, index, SHOP_SETTINGS))
      .filter(item => item !== null);

    _lastFetched = now;
  } catch (err) {
    console.error("[Shop] Failed to load items:", err);
    if (ITEMS.length === 0) ITEMS = [];
  }
}

// ── Normalize Google Sheet rows into the existing item shape ─
function normalizeSheetItem(raw, index, settings) {
  if (!raw || !getCell(raw, "Name")) return null;

  const category = (getCell(raw, "category") || "other").toLowerCase().trim();
  const price = parseMoney(getCell(raw, "price"));
  const salePrice = parseNullableMoney(getCell(raw, "saleprice"));
  const onSale = isYes(getCell(raw, "onsale"));
  const globalSaleOn = settings.globalSale === "on";
  const globalSalePrice = globalSaleOn
    ? Math.round(price * (1 - settings.globalDiscount / 100))
    : null;

  const bossTags = normalizeTags(getCell(raw, "bosstag"));
  const typeTags = normalizeTags(getCell(raw, "typetag"));
  const tokenTags = normalizeTags(getCell(raw, "tokentag"));
  const tagGroups = {};

  if (bossTags.length) tagGroups["Boss Kill"] = bossTags;
  if (typeTags.length) tagGroups.Type = typeTags;
  if (tokenTags.length) tagGroups.Token = tokenTags;

  const availableRaw = getCell(raw, "available");
  const available = availableRaw === "" ? true : !isNo(availableRaw);

  const sheetSaleType = getCell(raw, "saletype");
  const saleType = sheetSaleType 
    ? sheetSaleType 
    : (category === "bulk" || isYes(getCell(raw, "ifbulk")) ? "Per Stack" : "Per Item");

  return {
    id: index + 1,
    name: getCell(raw, "Name") || "Unnamed Item",
    description: getCell(raw, "description") || "",
    price,
    category,
    level: 1,
    saleType,
    image: normalizeImage(getCell(raw, "image")),
    tags: [...bossTags, ...typeTags, ...tokenTags],
    tagGroups,
    available,
    ifBulk: isYes(getCell(raw, "ifbulk")),
    onSale,
    salePrice,
    globalSaleOn,
    salePricePct: globalSalePrice,
    emoji: categoryEmoji(category),
  };
}

function normalizeShopSettings(raw) {
  return {
    ...getDefaultShopSettings(),
    globalSale: isOn(getCell(raw, "globalsale")) ? "on" : "off",
    globalDiscount: parseDiscount(getCell(raw, "globaldiscount")),
    shopLogo: getCell(raw, "shoplogo"),
    shopHeader: getCell(raw, "shopheader"),
    shopDescription: getCell(raw, "shopdescription"),
    menu1Name: getCell(raw, "menu1_name"),
    menu1Link: getCell(raw, "menu1_link"),
    menu2Name: getCell(raw, "menu2_name"),
    menu2Link: getCell(raw, "menu2_link"),
    menu3Name: getCell(raw, "menu3_name"),
    menu3Link: getCell(raw, "menu3_link"),
    featuredItems: [
      getCell(raw, "featured_item1"),
      getCell(raw, "featured_item2"),
      getCell(raw, "featured_item3"),
      getCell(raw, "featured_item4")
    ].filter(Boolean),
  };
}

function getDefaultShopSettings() {
  return {
    globalSale: "off",
    globalDiscount: 0,
    shopLogo: "",
    shopHeader: "",
    shopDescription: "",
    menu1Name: "",
    menu1Link: "",
    menu2Name: "",
    menu2Link: "",
    menu3Name: "",
    menu3Link: "",
    featuredItems: [],
  };
}

// ── Fetch + CSV helpers ───────────────────────────────────
async function fetchCSVRows(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return parseCSV(await res.text());
}

function withCacheBust(url, value) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${value}`;
}

function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(cell => String(cell).trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = (r[idx] || "").trim();
      });
      return obj;
    });
}

// ── Cell normalization helpers ────────────────────────────
function getCell(raw, name) {
  if (!raw || !name) return "";
  const requested = normalizeHeader(name);
  const key = Object.keys(raw).find(header => normalizeHeader(header) === requested);
  return key ? String(raw[key] || "").trim() : "";
}

function normalizeHeader(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
  return String(tags)
    .split(/[,|\n]/)
    .map(t => t.trim())
    .filter(Boolean);
}

function normalizeImage(image) {
  const value = String(image || "").trim();
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;

  const path = value.replace(/^\.\//, "").replace(/^\/+/, "");
  if (/^images\//i.test(path)) return path;

  const base = SHOP_IMAGE_BASE_URL.replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/$/, "");
  return base ? `${base}/${path}` : path;
}

function parseMoney(value) {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableMoney(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  return parseMoney(trimmed);
}

function parseDiscount(value) {
  const parsed = parseMoney(value);
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

function isYes(value) {
  return ["yes", "y", "true", "1", "on"].includes(String(value || "").trim().toLowerCase());
}

function isNo(value) {
  return ["no", "n", "false", "0", "off"].includes(String(value || "").trim().toLowerCase());
}

function isOn(value) {
  return ["on", "yes", "true", "1"].includes(String(value || "").trim().toLowerCase());
}

function categoryEmoji(cat) {
  const map = {
    weapon: "⚔️",
    armor: "🛡️",
    potion: "🧪",
    accessory: "💍",
    scroll: "📜",
    food: "🍖",
    bulk: "📦",
    other: "🎁",
  };
  return map[cat] || "🎁";
}
