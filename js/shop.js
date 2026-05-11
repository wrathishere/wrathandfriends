// ============================================================
//  shop.js — Shop rendering, filtering, modal, and interactions
// ============================================================

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────
  let activeCategory = "all";
  let searchQuery = "";
  let playerGold = 1500;

  // ── DOM refs ───────────────────────────────────────────
  const grid = document.getElementById("shop-grid");
  const emptyState = document.getElementById("empty-state");
  const itemCount = document.getElementById("item-count");
  const searchInput = document.getElementById("search-input");
  const goldDisplay = document.getElementById("gold-display");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");
  const modalClose = document.getElementById("modal-close");
  const toast = document.getElementById("toast");

  // ── Rarity config ──────────────────────────────────────
  const RARITY = {
    common:    { label: "Common",    color: "#a3a3a3", glow: "rgba(163,163,163,0.35)", stars: 1 },
    rare:      { label: "Rare",      color: "#60a5fa", glow: "rgba(96,165,250,0.45)",  stars: 2 },
    epic:      { label: "Epic",      color: "#c084fc", glow: "rgba(192,132,252,0.5)",  stars: 3 },
    legendary: { label: "Legendary", color: "#fbbf24", glow: "rgba(251,191,36,0.6)",  stars: 4 },
  };

  // ── Helpers ────────────────────────────────────────────
  function rarityStars(r) {
    const count = RARITY[r]?.stars ?? 1;
    return "★".repeat(count) + "☆".repeat(4 - count);
  }

  function formatGold(n) {
    return n.toLocaleString() + " Gold";
  }

  function statBar(value, max = 100) {
    const pct = Math.min(Math.round((value / max) * 100), 100);
    return `<div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pct}%"></div></div>`;
  }

  // ── Filtering ──────────────────────────────────────────
  function getFilteredItems() {
    return ITEMS.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const matchSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery) ||
        item.rarity.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });
  }

  // ── Card HTML ──────────────────────────────────────────
  function buildCard(item) {
    const r = RARITY[item.rarity] ?? RARITY.common;
    const canAfford = playerGold >= item.price;

    return `
      <article
        class="item-card rarity-${item.rarity}"
        data-id="${item.id}"
        style="--rarity-color:${r.color};--rarity-glow:${r.glow}"
        tabindex="0"
        role="button"
        aria-label="View details for ${item.name}"
      >
        <div class="card-glow"></div>
        <div class="card-badge rarity-badge">${r.label}</div>
        <div class="card-emoji" aria-hidden="true">${item.emoji}</div>
        <div class="card-stars" aria-label="${r.label} rarity">${rarityStars(item.rarity)}</div>
        <h2 class="card-name">${item.name}</h2>
        <p class="card-desc">${item.description.length > 90 ? item.description.slice(0, 90) + "…" : item.description}</p>
        <div class="card-footer">
          <span class="card-price ${canAfford ? "" : "too-expensive"}">
            🪙 ${item.price.toLocaleString()}
          </span>
          <button
            class="buy-btn ${canAfford ? "" : "disabled"}"
            data-id="${item.id}"
            aria-label="Buy ${item.name} for ${item.price} gold"
            ${canAfford ? "" : "aria-disabled='true'"}
          >
            ${canAfford ? "Buy" : "Too costly"}
          </button>
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
      emptyState.removeAttribute("aria-hidden");
    } else {
      emptyState.classList.add("hidden");
      emptyState.setAttribute("aria-hidden", "true");
      grid.innerHTML = filtered.map(buildCard).join("");

      // Animate cards in with stagger
      grid.querySelectorAll(".item-card").forEach((card, i) => {
        card.style.animationDelay = `${i * 60}ms`;
        card.classList.add("card-enter");
      });

      attachCardListeners();
    }
  }

  // ── Card listeners ─────────────────────────────────────
  function attachCardListeners() {
    grid.querySelectorAll(".item-card").forEach((card) => {
      const id = parseInt(card.dataset.id, 10);

      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("buy-btn")) return;
        openModal(id);
      });

      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(id);
        }
      });
    });

    grid.querySelectorAll(".buy-btn:not(.disabled)").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        buyItem(id);
      });
    });
  }

  // ── Buy item ───────────────────────────────────────────
  function buyItem(id) {
    const item = ITEMS.find((i) => i.id === id);
    if (!item || playerGold < item.price) return;

    playerGold -= item.price;
    goldDisplay.textContent = formatGold(playerGold);

    showToast(`✅ Purchased ${item.emoji} ${item.name}!`);
    render();
  }

  // ── Modal ──────────────────────────────────────────────
  function openModal(id) {
    const item = ITEMS.find((i) => i.id === id);
    if (!item) return;
    const r = RARITY[item.rarity] ?? RARITY.common;
    const canAfford = playerGold >= item.price;

    const statsHtml = Object.entries(item.stats ?? {})
      .map(([key, val]) => {
        const numVal = typeof val === "number" ? Math.abs(val) : null;
        const prefix = typeof val === "number" && val < 0 ? "-" : "";
        return `
          <div class="modal-stat">
            <span class="stat-label">${key}</span>
            <span class="stat-value">${prefix}${val}${typeof val === "number" ? "" : ""}</span>
            ${numVal !== null && numVal <= 100 ? statBar(numVal) : ""}
          </div>`;
      })
      .join("");

    modalContent.innerHTML = `
      <div class="modal-top" style="--rarity-color:${r.color};--rarity-glow:${r.glow}">
        <div class="modal-emoji">${item.emoji}</div>
        <div class="modal-header-text">
          <span class="modal-rarity-badge rarity-${item.rarity}">${r.label}</span>
          <h2 class="modal-title" id="modal-title">${item.name}</h2>
          <div class="modal-stars">${rarityStars(item.rarity)}</div>
        </div>
      </div>
      <p class="modal-desc">${item.description}</p>
      ${item.flavor ? `<blockquote class="modal-flavor">${item.flavor}</blockquote>` : ""}
      <div class="modal-stats">${statsHtml}</div>
      <div class="modal-actions">
        <span class="modal-price ${canAfford ? "" : "too-expensive"}">🪙 ${item.price.toLocaleString()} Gold</span>
        <button
          class="modal-buy-btn ${canAfford ? "" : "disabled"}"
          data-id="${item.id}"
          ${canAfford ? "" : "disabled"}
        >${canAfford ? "⚔️ Purchase Item" : "Not enough gold"}</button>
      </div>
    `;

    const buyBtn = modalContent.querySelector(".modal-buy-btn:not(.disabled)");
    if (buyBtn) {
      buyBtn.addEventListener("click", () => {
        buyItem(id);
        closeModal();
      });
    }

    modalBackdrop.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }

  function closeModal() {
    modalBackdrop.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }

  // ── Toast ──────────────────────────────────────────────
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ── Event listeners ────────────────────────────────────
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.category;
      render();
    });
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ── Init ───────────────────────────────────────────────
  render();
})();
