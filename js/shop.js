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

  // ── Sale price helper ──────────────────────────────────
  // Priority: per-item onSale > globalSaleOn
  // They are mutually exclusive based on which mode was active when saved
  function getSaleInfo(item) {
    // Per-item manual sale — only if onSale is explicitly true AND salePrice exists
    if (item.onSale === true && item.salePrice !== null && item.salePrice !== "" && item.salePrice !== undefined) {
      return { onSale: true, salePrice: item.salePrice };
    }
    // Global percentage sale — only if globalSaleOn is true AND onSale is NOT explicitly false
    if (item.globalSaleOn === true && item.onSale !== true && item.salePricePct !== null && item.salePricePct !== undefined) {
      return { onSale: true, salePrice: item.salePricePct };
    }
    return { onSale: false, salePrice: null };
  }

  // ── Price display HTML ─────────────────────────────────
  function priceHTML(item) {
    const { onSale, salePrice } = getSaleInfo(item);
    if (onSale) {
      return `
        <div class="price-wrap">
          <span class="price-original">💰 ${item.price.toLocaleString()}</span>
          <span class="price-sale">💰 ${Number(salePrice).toLocaleString()}</span>
        </div>`;
    }
    return `<span class="card-price">💰 ${item.price.toLocaleString()}</span>`;
  }

  function modalPriceHTML(item) {
    const { onSale, salePrice } = getSaleInfo(item);
    if (onSale) {
      return `
        <div class="price-wrap">
          <span class="price-original">💰 ${item.price.toLocaleString()}</span>
          <span class="price-sale" style="font-size:1.2rem;">💰 ${Number(salePrice).toLocaleString()}</span>
          <span class="sale-tag">SALE</span>
        </div>`;
    }
    return `<span class="modal-price">💰 ${item.price.toLocaleString()}</span>`;
  }

  // ── Filter ─────────────────────────────────────────────
  function getFiltered() {
    return ITEMS.filter(item => {
      const matchCat    = activeCategory === "all" || item.category === activeCategory;
      const matchSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });
  }

  // ── Card ───────────────────────────────────────────────
  function buildCard(item) {
    const { onSale } = getSaleInfo(item);
    const media = item.image
      ? `<div class="card-img-wrap"><img src="${item.image}" alt="${item.name}" class="card-img" loading="lazy"/></div>`
      : `<div class="card-img-wrap"><div class="card-emoji">${item.emoji}</div></div>`;

    return `
      <article class="item-card ${onSale ? 'on-sale' : ''}" data-id="${item.id}" tabindex="0" role="button" aria-label="${item.name}">
        ${onSale ? `<span class="sale-ribbon">SALE</span>` : ""}
        <div class="card-badge">Lv. ${item.level}</div>
        ${media}
        <div class="card-info">
          <h2 class="card-name">${item.name}</h2>
          <div class="card-footer">
            ${priceHTML(item)}
            <span class="card-category">${item.category}</span>
          </div>
        </div>
      </article>`;
  }

  // ── Render ─────────────────────────────────────────────
  function render() {
    const filtered = getFiltered();
    itemCount.textContent = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`;

    if (!filtered.length) {
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

    const media = item.image
      ? `<div class="modal-img-wrap"><img src="${item.image}" alt="${item.name}" class="modal-img"/></div>`
      : `<div class="modal-img-wrap"><div class="modal-emoji">${item.emoji}</div></div>`;

    const desc = item.description
      ? `<p class="modal-desc">${item.description}</p>` : "";

    modalContent.innerHTML = `
      ${media}
      <div class="modal-body">
        <span class="modal-level-badge">Level ${item.level}</span>
        <h2 class="modal-title" id="modal-title">${item.name}</h2>
        ${desc}
        <div class="modal-actions">
          ${modalPriceHTML(item)}
          <span class="modal-category-tag">${item.category}</span>
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

  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.trim().toLowerCase();
    render();
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  async function init() {
    grid.innerHTML = `<div class="loading-state">Loading items…</div>`;
    await loadItemsFromSheet();

    if (!ITEMS.length) {
      grid.innerHTML = `<div class="loading-state">⚠️ Could not load items. Please try refreshing.</div>`;
      return;
    }

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
