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

  function getFilteredItems() {
    return ITEMS.filter(item => {
      const matchCat    = activeCategory === "all" || item.category === activeCategory;
      const matchSearch = searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });
  }

  function buildCard(item) {
    const media = item.image
      ? `<div class="card-img-wrap"><img src="${item.image}" alt="${item.name}" class="card-img" loading="lazy"/></div>`
      : `<div class="card-img-wrap"><div class="card-emoji">${item.emoji}</div></div>`;

    const saleBadge = item.sale ? `<span class="sale-badge">Sale</span>` : "";

    return `
      <article class="item-card" data-id="${item.id}" tabindex="0" role="button" aria-label="${item.name}">
        ${media}
        ${saleBadge}
        <div class="card-badge">Lv. ${item.level}</div>
        <div class="card-info">
          <h2 class="card-name">${item.name}</h2>
          <div class="card-footer">
            <span class="card-price">💰 ${item.price.toLocaleString()}</span>
            <span class="card-category">${item.category}</span>
          </div>
        </div>
      </article>`;
  }

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

  function attachCardListeners() {
    grid.querySelectorAll(".item-card").forEach(card => {
      const id = parseInt(card.dataset.id, 10);
      card.addEventListener("click",   () => openModal(id));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(id); }
      });
    });
  }

  function openModal(id) {
    const item = ITEMS.find(i => i.id === id);
    if (!item) return;

    const media = item.image
      ? `<div class="modal-img-wrap"><img src="${item.image}" alt="${item.name}" class="modal-img"/></div>`
      : `<div class="modal-img-wrap"><div class="modal-emoji">${item.emoji}</div></div>`;

    const saleLine = item.sale ? `<span class="sale-badge" style="position:static;margin-bottom:0.25rem;">On Sale!</span>` : "";

    modalContent.innerHTML = `
      ${media}
      <div class="modal-body">
        ${saleLine}
        <span class="modal-level-badge">Level ${item.level}</span>
        <h2 class="modal-title" id="modal-title">${item.name}</h2>
        <div class="modal-actions">
          <span class="modal-price">💰 ${item.price.toLocaleString()}</span>
          <span class="modal-category-tag">${item.category}</span>
        </div>
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

    if (ITEMS.length === 0) {
      grid.innerHTML = `<div class="loading-state">⚠️Could not load items. Please try refreshing the page. </div>`;
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
