// ============================================================
//  shop.js — Dynamic shop renderer
//  Reads from ITEMS (loaded by items.js)
//  Preserves all existing UI, filters, search, card layout
// ============================================================

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────
  let activeCategory = "all";
  let searchQuery    = "";
  let refreshTimer   = null;

  // ── DOM refs ───────────────────────────────────────────
  const grid          = document.getElementById("shop-grid");
  const emptyState    = document.getElementById("empty-state");
  const itemCount     = document.getElementById("item-count");
  const searchInput   = document.getElementById("search-input");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalContent  = document.getElementById("modal-content");
  const modalClose    = document.getElementById("modal-close");

  // ── Sale helpers ────────────────────────────────────────
  // Returns { onSale, salePrice } for an item
  // Per-item onSale takes priority over globalSaleOn
  function getSaleInfo(item) {
    if (item.onSale === true &&
        item.salePrice !== null &&
        item.salePrice !== "" &&
        item.salePrice !== undefined) {
      return { onSale: true, salePrice: item.salePrice };
    }
    if (item.globalSaleOn === true &&
        item.onSale !== true &&
        item.salePricePct !== null &&
        item.salePricePct !== undefined) {
      return { onSale: true, salePrice: item.salePricePct };
    }
    return { onSale: false, salePrice: null };
  }

  // ── Price HTML ─────────────────────────────────────────
  function priceHTML(item, large = false) {
    const { onSale, salePrice } = getSaleInfo(item);
    if (onSale) {
      return `
        <div class="price-wrap">
          <span class="price-original">💰 ${item.price.toLocaleString()}</span>
          <span class="price-sale${large ? ' price-sale-lg' : ''}">💰 ${Number(salePrice).toLocaleString()}</span>
        </div>`;
    }
    return `<span class="${large ? 'modal-price' : 'card-price'}">💰 ${item.price.toLocaleString()}</span>`;
  }

  // ── Filter logic ────────────────────────────────────────
  function getFilteredItems() {
    return ITEMS.filter(item => {
      // Hide unavailable items
      if (item.available === false) return false;

      // Category filter
      const matchCat = activeCategory === "all" || item.category === activeCategory;

      // Search — checks name, description, category, and tags
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }

  // ── Build category pills from live data ─────────────────
  function buildCategoryPills() {
    const categories    = [...new Set(ITEMS.filter(i => i.available !== false).map(i => i.category))];
    const pillsContainer = document.querySelector(".category-pills");

    pillsContainer.innerHTML = `<button class="pill active" data-category="all">All Items</button>`;

    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className        = "pill";
      btn.dataset.category = cat;
      btn.textContent      = cat.charAt(0).toUpperCase() + cat.slice(1);
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = cat;
        renderGrid();
      });
      pillsContainer.appendChild(btn);
    });

    // Restore active category if it still exists, else reset to all
    if (!categories.includes(activeCategory)) activeCategory = "all";
    document.querySelectorAll(".pill").forEach(p => {
      p.classList.toggle("active", p.dataset.category === activeCategory);
    });
  }

  // ── Build card HTML ─────────────────────────────────────
  function buildCard(item) {
    const { onSale } = getSaleInfo(item);

    // Image or emoji fallback
    const media = item.image
      ? `<div class="card-img-wrap">
           <img src="${item.image}" alt="${escHtml(item.name)}" class="card-img" loading="lazy"
                onerror="this.parentElement.innerHTML='<div class=\'card-emoji\'>${item.emoji}</div>'"/>
         </div>`
      : `<div class="card-img-wrap"><div class="card-emoji">${item.emoji}</div></div>`;

    // Tags HTML (shown as small pills)
    const tagsHTML = item.tags.length
      ? `<div class="card-tags">${item.tags.map(t =>
          `<span class="card-tag">${escHtml(t)}</span>`).join("")}</div>`
      : "";

    return `
      <article
        class="item-card${onSale ? " on-sale" : ""}"
        data-id="${item.id}"
        tabindex="0"
        role="button"
        aria-label="View details for ${escHtml(item.name)}"
      >
        ${onSale ? `<span class="sale-ribbon">SALE</span>` : ""}
        <div class="card-badge">Lv. ${item.level}</div>
        ${media}
        <div class="card-info">
          <h2 class="card-name">${escHtml(item.name)}</h2>
          ${tagsHTML}
          <div class="card-footer">
            ${priceHTML(item)}
            <span class="card-category">${escHtml(item.category)}</span>
          </div>
        </div>
      </article>`;
  }

  // ── Render grid ─────────────────────────────────────────
  function renderGrid() {
    const filtered = getFilteredItems();
    itemCount.textContent = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`;

    if (filtered.length === 0) {
      grid.innerHTML = "";
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
      grid.innerHTML = filtered.map(buildCard).join("");

      // Stagger animation
      grid.querySelectorAll(".item-card").forEach((card, i) => {
        card.style.animationDelay = `${i * 50}ms`;
        card.classList.add("card-enter");
      });

      attachCardListeners();
    }
  }

  // ── Card click listeners ────────────────────────────────
  function attachCardListeners() {
    grid.querySelectorAll(".item-card").forEach(card => {
      const id = parseInt(card.dataset.id, 10);
      card.addEventListener("click",   () => openModal(id));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(id); }
      });
    });
  }

  // ── Modal ───────────────────────────────────────────────
  function openModal(id) {
    const item = ITEMS.find(i => i.id === id);
    if (!item) return;

    const { onSale } = getSaleInfo(item);

    const media = item.image
      ? `<div class="modal-img-wrap">
           <img src="${item.image}" alt="${escHtml(item.name)}" class="modal-img"
                onerror="this.parentElement.innerHTML='<div class=\'modal-emoji\'>${item.emoji}</div>'"/>
         </div>`
      : `<div class="modal-img-wrap"><div class="modal-emoji">${item.emoji}</div></div>`;

    const desc = item.description
      ? `<p class="modal-desc">${escHtml(item.description)}</p>` : "";

    const tagsHTML = item.tags.length
      ? `<div class="card-tags" style="margin-top:0.5rem">${item.tags.map(t =>
          `<span class="card-tag">${escHtml(t)}</span>`).join("")}</div>`
      : "";

    const availBadge = item.available === false
      ? `<span class="unavail-badge">Out of Stock</span>` : "";

    modalContent.innerHTML = `
      ${media}
      <div class="modal-body">
        ${availBadge}
        <span class="modal-level-badge">Level ${item.level}</span>
        <h2 class="modal-title" id="modal-title">${escHtml(item.name)}</h2>
        ${desc}
        ${tagsHTML}
        <div class="modal-actions">
          ${priceHTML(item, true)}
          ${onSale ? `<span class="sale-tag">SALE</span>` : ""}
          <span class="modal-category-tag">${escHtml(item.category)}</span>
        </div>
      </div>`;

    modalBackdrop.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }

  function closeModal() {
    modalBackdrop.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }

  // ── Search ──────────────────────────────────────────────
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderGrid();
  });

  // ── Modal events ────────────────────────────────────────
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // ── Auto-refresh ────────────────────────────────────────
  // Re-fetches data periodically so updates appear quickly after commits
  // Skips if modal is open to avoid disrupting the user
  function scheduleRefresh() {
    refreshTimer = setInterval(async () => {
      if (!modalBackdrop.hasAttribute("hidden")) return; // don't refresh while modal open
      await loadItemsFromSheet(true); // force = true bypasses the cache check
      buildCategoryPills();
      renderGrid();
    }, CACHE_TIME);
  }

  // ── Init ────────────────────────────────────────────────
  async function init() {
    grid.innerHTML = `<div class="loading-state">Loading items…</div>`;

    await loadItemsFromSheet();

    if (ITEMS.length === 0) {
      grid.innerHTML = `<div class="loading-state">⚠️ Could not load items. Please refresh the page.</div>`;
      return;
    }

    buildCategoryPills();
    renderGrid();
    scheduleRefresh(); // start auto-refresh
  }

  init();

  // ── Helpers ─────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

})();
