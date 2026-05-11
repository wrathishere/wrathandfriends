// ============================================================
//  shop.js — Wrath and Friends catalogue
//  Uses level (number) instead of rarity
// ============================================================

(function () {
  "use strict";

  let activeCategory = "all";
  let searchQuery    = "";

  const grid          = document.getElementById("shop-grid");
  const emptyState    = document.getElementById("empty-state");
  const itemCount     = document.getElementById("item-count");
  const searchInput   = document.getElementById("search-input");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalContent  = document.getElementById("modal-content");
  const modalClose    = document.getElementById("modal-close");

  // ── Filtering ──────────────────────────────────────────
  function getFilteredItems() {
    return ITEMS.filter(item => {
      const matchCat    = activeCategory === "all" || item.category === activeCategory;
      const matchSearch = searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });
  }

  // ── Card HTML ──────────────────────────────────────────
  function buildCard(item) {
    const img = item.image
      ? `<div class="card-img-wrap"><img src="${item.image}" alt="${item.name}" class="card-img" loading="lazy"/></div>`
      : `<div class="card-emoji" aria-hidden="true">${item.emoji}</div>`;

    return `
      <article
        class="item-card"
        data-id="${item.id}"
        tabindex="0"
        role="button"
        aria-label="View details for ${item.name}"
      >
        <div class="card-badge">Lv. ${item.level}</div>
        ${img}
        <h2 class="card-name">${item.name}</h2>
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

    const img = item.image
      ? `<img src="${item.image}" alt="${item.name}" class="modal-img"/>`
      : `<div class="modal-emoji">${item.emoji}</div>`;

    modalContent.innerHTML = `
      <div class="modal-top">
        <div class="modal-img-wrap">${img}</div>
        <div class="modal-header-text">
          <span class="modal-level-badge">Level ${item.level}</span>
          <h2 class="modal-title" id="modal-title">${item.name}</h2>
          <span class="modal-category-tag">${item.category}</span>
        </div>
      </div>
      <div class="modal-actions">
        <span class="modal-price">💰 ${item.price.toLocaleString()}</span>
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

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // ── Init ───────────────────────────────────────────────
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
