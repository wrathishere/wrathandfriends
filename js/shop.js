// ============================================================
//  shop.js — Wrath and Friends catalogue shop
//  Loads items from Google Sheets via items.js
// ============================================================

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────
  let activeCategory = "all";
  let searchQuery    = "";

  // ── DOM refs ───────────────────────────────────────────
  const grid         = document.getElementById("shop-grid");
  const emptyState   = document.getElementById("empty-state");
  const itemCount    = document.getElementById("item-count");
  const searchInput  = document.getElementById("search-input");
  const modalBackdrop= document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");
  const modalClose   = document.getElementById("modal-close");

  // ── Rarity config ──────────────────────────────────────
  const RARITY = {
    common:    { label: "Common",    color: "#888888" },
    rare:      { label: "Rare",      color: "#3a86ff" },
    epic:      { label: "Epic",      color: "#9b5de5" },
    legendary: { label: "Legendary", color: "#d4a017" },
  };

  function rarityStars(r) {
    const count = { common:1, rare:2, epic:3, legendary:4 }[r] ?? 1;
    return "★".repeat(count) + "☆".repeat(4 - count);
  }

  // ── Filtering ──────────────────────────────────────────
  function getFilteredItems() {
    return ITEMS.filter(item => {
      const matchCat    = activeCategory === "all" || item.category === activeCategory;
      const matchSearch = searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery) ||
        item.rarity.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });
  }

  // ── Card HTML ──────────────────────────────────────────
  function buildCard(item) {
    const r   = RARITY[item.rarity] ?? RARITY.common;
    const img = item.image
      ? `<div class="card-img-wrap"><img src="${item.image}" alt="${item.name}" class="card-img" loading="lazy"/></div>`
      : `<div class="card-emoji" aria-hidden="true">${item.emoji}</div>`;

    const desc = item.description
      ? `<p class="card-desc">${item.description.length > 90 ? item.description.slice(0,90)+"…" : item.description}</p>`
      : "";

    return `
      <article
        class="item-card rarity-${item.rarity}"
        data-id="${item.id}"
        style="--rarity-color:${r.color}"
        tabindex="0"
        role="button"
        aria-label="View details for ${item.name}"
      >
        <div class="card-badge">${r.label}</div>
        ${img}
        <div class="card-stars" aria-label="${r.label} rarity">${rarityStars(item.rarity)}</div>
        <h2 class="card-name">${item.name}</h2>
        ${desc}
        <div class="card-footer">
          <span class="card-price">💰 ${item.price.toLocaleString()}</span>
          <span class="card-category">${item.category}</span>
        </div>
      </article>`;
  }

  // ── Render grid ────────────────────────────────────────
  function render() {
    const filtered = getFilteredItems();
    itemCount.textContent = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`;

    if (filtered.length === 0) {
      grid.innerHTML = "";
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
      grid.innerHTML = filtered.map(buildCard).join("");

      grid.querySelectorAll(".item-card").forEach((card, i) => {
        card.style.animationDelay = `${i * 55}ms`;
        card.classList.add("card-enter");
      });

      attachCardListeners();
    }
  }

  // ── Card listeners ─────────────────────────────────────
  function attachCardListeners() {
    grid.querySelectorAll(".item-card").forEach(card => {
      const id = parseInt(card.dataset.id, 10);
      card.addEventListener("click",   () => openModal(id));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(id); }
      });
    });
  }

  // ── Modal ──────────────────────────────────────────────
  function openModal(id) {
    const item = ITEMS.find(i => i.id === id);
    if (!item) return;
    const r = RARITY[item.rarity] ?? RARITY.common;

    const img = item.image
      ? `<img src="${item.image}" alt="${item.name}" class="modal-img"/>`
      : `<div class="modal-emoji">${item.emoji}</div>`;

    const desc = item.description
      ? `<p class="modal-desc">${item.description}</p>`
      : "";

    const flavor = item.flavor
      ? `<blockquote class="modal-flavor">${item.flavor}</blockquote>`
      : "";

    modalContent.innerHTML = `
      <div class="modal-top" style="--rarity-color:${r.color}">
        <div class="modal-img-wrap">${img}</div>
        <div class="modal-header-text">
          <span class="modal-rarity-badge rarity-${item.rarity}">${r.label}</span>
          <h2 class="modal-title" id="modal-title">${item.name}</h2>
          <div class="modal-stars">${rarityStars(item.rarity)}</div>
        </div>
      </div>
      ${desc}
      ${flavor}
      <div class="modal-actions">
        <span class="modal-price">💰 ${item.price.toLocaleString()}</span>
        <span class="modal-category-tag">${item.category}</span>
      </div>
    `;

    modalBackdrop.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }

  function closeModal() {
    modalBackdrop.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }

  // ── Event listeners ────────────────────────────────────
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll(".pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.category;
      render();
    });
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // ── Init: load sheet then render ───────────────────────
  async function init() {
    grid.innerHTML = `<div class="loading-state">Loading items…</div>`;
    await loadItemsFromSheet();

    if (ITEMS.length === 0) {
      grid.innerHTML = `<div class="loading-state">⚠️ Could not load items. Make sure your Google Sheet is set to public.</div>`;
      return;
    }

    // Build category pills dynamically from sheet data
    const categories = [...new Set(ITEMS.map(i => i.category))];
    const pillsContainer = document.querySelector(".category-pills");
    pillsContainer.innerHTML = `<button class="pill active" data-category="all">All Items</button>`;
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "pill";
      btn.dataset.category = cat;
      btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = cat;
        render();
      });
      pillsContainer.appendChild(btn);
    });

    render();
  }

  init();
})();
