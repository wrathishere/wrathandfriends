const SHOWCASE_RAW = "https://raw.githubusercontent.com/wrathishere/rpg-shop/main/checkweaponstat";

async function fetchShowcaseJSON(path) {
  const res = await fetch(`${SHOWCASE_RAW}/${path}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function normalizeWeapon(entry, index) {
  return {
    id: index + 1,
    name: entry?.name || "Unknown Weapon",
    type: entry?.type || "Unknown Type",
    image: entry?.image || "",
    link: entry?.link || ""
  };
}

async function loadWeaponShowcase() {
  const manifest = await fetchShowcaseJSON("_data/manifest.json");
  const files = (Array.isArray(manifest) ? manifest : []).filter(Boolean);
  const rows = await Promise.all(files.map(file => fetchShowcaseJSON(`_data/${file}`)));
  return rows.map(normalizeWeapon);
}
