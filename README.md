# ⚔️ The Arcane Emporium — RPG Shop Item Cards

A fantasy RPG shop page built for GitHub Pages. Features animated item cards with rarity tiers, category filtering, search, and item detail modals — all in pure HTML, CSS, and vanilla JavaScript. No frameworks, no build step.

---

## ✨ Features

- **16 hand-crafted items** across 5 categories (Weapons, Armor, Potions, Accessories, Scrolls)
- **4 rarity tiers** — Common, Rare, Epic, Legendary — each with unique color glows and star ratings
- **Live search** — filter by name, description, or rarity
- **Category pills** — filter by item type
- **Item detail modal** — click any card for full stats, flavor text, and a buy button
- **Gold economy** — player starts with 1,500 gold; purchases deduct correctly
- **Animated embers** in the background for atmosphere
- **Fully responsive** — works on mobile and desktop
- **Accessible** — keyboard navigable, ARIA labels, screen reader friendly

---

## 🗂️ File Structure

```
rpg-shop/
├── index.html         # Main page
├── css/
│   └── style.css      # All styles (dark fantasy theme)
├── js/
│   ├── items.js       # Item data — edit this to change inventory
│   └── shop.js        # Shop logic (rendering, filtering, modal, gold)
└── README.md
```

---

## 🚀 Deploy to GitHub Pages

1. **Fork or clone** this repository.
2. Push it to a GitHub repo (e.g. `your-username/rpg-shop`).
3. Go to **Settings → Pages**.
4. Under **Source**, select `main` branch and `/ (root)` folder.
5. Click **Save** — your shop will be live at:
   ```
   https://your-username.github.io/rpg-shop/
   ```

---

## 🧙 Customizing Items

All items live in `js/items.js`. Each item follows this structure:

```js
{
  id: 1,                         // Unique number
  name: "Dawnbreaker",           // Item name
  category: "weapon",            // weapon | armor | potion | accessory | scroll
  rarity: "legendary",           // common | rare | epic | legendary
  price: 980,                    // Gold cost
  emoji: "🗡️",                   // Item icon (emoji)
  description: "...",            // Full description (shown in modal)
  stats: {                       // Key-value stat pairs
    "ATK": 88,
    "CRIT": 24,
  },
  flavor: '"Quote here." — Source', // Optional flavor text
}
```

### Adding a new item:
1. Open `js/items.js`
2. Copy an existing item object
3. Change the `id` to a unique number
4. Update all fields
5. Save and refresh!

---

## 🎨 Theming

All colors and fonts are controlled via CSS variables in `css/style.css` under `:root`. Key variables:

| Variable        | Purpose                     |
|-----------------|-----------------------------|
| `--bg-deep`     | Page background             |
| `--bg-card`     | Card background             |
| `--gold`        | Primary gold accent         |
| `--font-display`| Heading font (Cinzel)       |
| `--font-body`   | Body font (Crimson Pro)     |

---

## 📜 License

MIT — free to use, modify, and deploy.
