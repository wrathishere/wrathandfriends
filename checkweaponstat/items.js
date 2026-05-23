const WEAPON_SHEET_CSV = window.WEAPON_SHEET_CSV || "";

const STAT_GROUPS = {
  Offense: ["Slash", "Pierce", "Frost"],
  Defense: ["Block Armour", "Block Force"],
  Utility: ["Weight", "Durability", "Stamina Usage"]
};

function parseCSVRow(line) {
  const out = [];
  let cur = "";
  let q = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (ch === ',' && !q) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCSV(text) {
  return text.split(/\r?\n/).filter(Boolean).map(parseCSVRow);
}

function toWeapons(rows) {
  const [header, ...dataRows] = rows;
  const idx = Object.fromEntries(header.map((name, i) => [name.trim(), i]));

  return dataRows
    .map(row => {
      const weapon = {
        name: row[idx["Weapon Name"]] || "Unknown",
        type: row[idx["Weapon Type"]] || "Uncategorized",
        icon: row[idx["Weapon Icon"]] || "",
        statImage: row[idx["Weapon Stat Image"]] || "",
        stats: {}
      };

      Object.keys(idx).forEach(col => {
        if (!["Weapon Name", "Weapon Type", "Weapon Icon", "Weapon Stat Image"].includes(col)) {
          weapon.stats[col] = row[idx[col]] || "-";
        }
      });

      return weapon;
    })
    .filter(w => w.name && w.type);
}

async function loadWeaponsFromSheet() {
  if (!WEAPON_SHEET_CSV) throw new Error("WEAPON_SHEET_CSV is not configured.");
  const res = await fetch(`${WEAPON_SHEET_CSV}${WEAPON_SHEET_CSV.includes('?') ? '&' : '?'}t=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to load weapon spreadsheet.");
  const text = await res.text();
  return toWeapons(parseCSV(text));
}
