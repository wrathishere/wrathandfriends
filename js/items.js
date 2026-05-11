// ============================================================
//  items.js — Shop inventory data
//  Edit this file to add, remove, or change items.
// ============================================================

const ITEMS = [
  // ── WEAPONS ─────────────────────────────────────────────
  {
    id: 1,
    name: "Dawnbreaker",
    category: "weapon",
    rarity: "legendary",
    price: 980,
    emoji: "🗡️",
    description:
      "Forged at the break of dawn by the last Sungiven blacksmith. Its blade hums with trapped light, dealing bonus radiant damage at sunrise.",
    stats: { "ATK": 88, "CRIT": 24, "SPD": 12 },
    flavor: '"Light finds even the darkest corners." — Inscription on the hilt',
  },
  {
    id: 2,
    name: "Thornwood Staff",
    category: "weapon",
    rarity: "rare",
    price: 420,
    emoji: "🪄",
    description:
      "Carved from the Thornwood of the Ashen Grove. Channels nature magic and boosts spell power by 40% when standing on soil.",
    stats: { "MAGIC": 72, "MANA": 35, "INT": 18 },
    flavor: '"The forest does not forget its own." — Druid Proverb',
  },
  {
    id: 3,
    name: "Iron Crossbow",
    category: "weapon",
    rarity: "common",
    price: 120,
    emoji: "🏹",
    description:
      "A reliable crossbow favored by bounty hunters and scouts. Accurate at long range with quick reload enchantment.",
    stats: { "ATK": 44, "RNG": 30, "SPD": 22 },
    flavor: '"Straight and true." — Standard-issue Ranger motto',
  },
  {
    id: 4,
    name: "Voidfang Dagger",
    category: "weapon",
    rarity: "epic",
    price: 650,
    emoji: "🔪",
    description:
      "A blade tempered in the Void between worlds. Attacks ignore 30% of enemy armor and apply a stacking shadow curse.",
    stats: { "ATK": 61, "CRIT": 38, "PEN": 30 },
    flavor: '"What it pierces never truly heals." — Unknown Assassin',
  },

  // ── ARMOR ────────────────────────────────────────────────
  {
    id: 5,
    name: "Dragonscale Cuirass",
    category: "armor",
    rarity: "legendary",
    price: 1100,
    emoji: "🐉",
    description:
      "Scales harvested from the Elder Drake Varethos. Grants fire immunity and reflects 15% of melee damage back at attackers.",
    stats: { "DEF": 95, "FIRE RES": 100, "HP": 60 },
    flavor: '"Even in death, the dragon protects." — Armorer Selphine',
  },
  {
    id: 6,
    name: "Shadowweave Cloak",
    category: "armor",
    rarity: "epic",
    price: 580,
    emoji: "🧥",
    description:
      "Woven from shadow-silk harvested at midnight. Grants invisibility for 3 seconds after taking a critical hit.",
    stats: { "DEF": 38, "EVD": 44, "STEALTH": 55 },
    flavor: '"You cannot strike what you cannot see." — Thieves\' Guild Motto',
  },
  {
    id: 7,
    name: "Pilgrim\'s Robe",
    category: "armor",
    rarity: "common",
    price: 85,
    emoji: "👘",
    description:
      "Simple robes blessed at the Temple of Arim. Provides minor defense and boosts healing received by 20%.",
    stats: { "DEF": 18, "HEAL BOOST": 20, "MANA": 12 },
    flavor: '"Faith is the lightest armor." — Temple Teaching',
  },
  {
    id: 8,
    name: "Ironveil Helm",
    category: "armor",
    rarity: "rare",
    price: 310,
    emoji: "⛑️",
    description:
      "A battle-tested helm with a reinforced visor. Reduces stagger chance by 50% and grants resistance to mental effects.",
    stats: { "DEF": 52, "STAGGER RES": 50, "MENTAL RES": 35 },
    flavor: '"Keep your head, always." — General Aldric',
  },

  // ── POTIONS ─────────────────────────────────────────────
  {
    id: 9,
    name: "Elixir of Giants",
    category: "potion",
    rarity: "rare",
    price: 200,
    emoji: "🧪",
    description:
      "A shimmering blue concoction brewed from Giant\'s Blossom root. Doubles Strength and Constitution for 60 seconds.",
    stats: { "STR BOOST": 100, "CON BOOST": 100, "DURATION": 60 },
    flavor: '"Drink with care. Or don\'t. It\'s your funeral." — Alchemist Hob',
  },
  {
    id: 10,
    name: "Crimson Revival",
    category: "potion",
    rarity: "epic",
    price: 450,
    emoji: "❤️‍🔥",
    description:
      "When reduced to 0 HP, this potion automatically activates, restoring 75% health. Single-use. Feels like drowning in fire.",
    stats: { "AUTO HP": 75, "USES": 1 },
    flavor: '"Death tried. Death failed." — Engraved on the bottle',
  },
  {
    id: 11,
    name: "Mana Dew",
    category: "potion",
    rarity: "common",
    price: 55,
    emoji: "💧",
    description:
      "Condensed magical energy in a tiny vial. Instantly restores 40 mana points. Faintly tastes of rain and pine.",
    stats: { "MANA RESTORE": 40 },
    flavor: '"Small bottle, big sparkle." — Street Vendor Sign',
  },

  // ── ACCESSORIES ─────────────────────────────────────────
  {
    id: 12,
    name: "Ring of Farseeing",
    category: "accessory",
    rarity: "rare",
    price: 375,
    emoji: "💍",
    description:
      "An ancient ring set with a miniature scrying eye. Reveals the map in a 200-tile radius and warns of nearby ambushes.",
    stats: { "VISION": 200, "AMBUSH WARN": 1, "INT": 8 },
    flavor: '"The wise see danger before it arrives." — Seer of Orim',
  },
  {
    id: 13,
    name: "Amulet of Eternal Flame",
    category: "accessory",
    rarity: "legendary",
    price: 890,
    emoji: "🔮",
    description:
      "An amulet containing a fragment of the First Flame. All fire spells cost 50% less mana and deal 35% more damage.",
    stats: { "FIRE DMG": 35, "MANA COST": -50, "INT": 22 },
    flavor: '"The flame remembers what the world forgot." — Unnamed Flame Keeper',
  },

  // ── SCROLLS ─────────────────────────────────────────────
  {
    id: 14,
    name: "Scroll of Meteor Strike",
    category: "scroll",
    rarity: "epic",
    price: 520,
    emoji: "📜",
    description:
      "Calls down a meteor from the heavens onto a targeted area. Destroys terrain. Single use. Keep away from populated areas.",
    stats: { "DAMAGE": 340, "AOE": 15, "USES": 1 },
    flavor: '"Please aim responsibly." — Scroll Merchant disclaimer',
  },
  {
    id: 15,
    name: "Scroll of Binding",
    category: "scroll",
    rarity: "rare",
    price: 185,
    emoji: "📃",
    description:
      "Roots a target in place for 8 seconds with spectral chains. Useful for escape, interrogation, or just being rude.",
    stats: { "ROOT DURATION": 8, "RANGE": 20, "USES": 1 },
    flavor: '"Stand still. I said STAND STILL." — Last words of many mages',
  },
  {
    id: 16,
    name: "Tome of Lesser Conjuring",
    category: "scroll",
    rarity: "common",
    price: 95,
    emoji: "📖",
    description:
      "Teaches the basic conjuration of small familiars: mice, candles, or very enthusiastic sparrows. Good for beginners.",
    stats: { "CONJURE LEVEL": 1, "FAMILIAR SLOTS": 1 },
    flavor: '"Every great mage started with a mouse familiar." — Arcane Academy Intro Pamphlet',
  },
];
