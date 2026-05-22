// ============================================================
//  shop.js — Dynamic shop renderer + player helper tools
//  Preserves existing search/category behavior and card style
// ============================================================

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────
  let activeCategory = "all";
  let searchQuery = "";
  let refreshTimer = null;

  // Tag filter state: Map<groupName, Set<lowerTag>>
  const activeTagFilters = new Map();
  const expandedTagGroups = new Set();

  // Smart sort state
  let recommendationTerms = new Set();

  // Player report state
  let playerRows = [];
  let activePlayerRow = null;

  // Optional global set in index.html:
  // <script>window.PLAYER_SHEET_CSV = "https://docs.google.com/.../pub?output=csv";</script>
  const PLAYER_SHEET_CSV = window.PLAYER_SHEET_CSV || "";

  const WEAPON_BUTTON_LABEL = "Check Available Weapons";
  const WEAPON_PAGE_URL = window.WEAPON_PAGE_URL || "/checkweaponstat/index.html";
  const BULK_MIN_QTY = 1;
  const BULK_MAX_QTY = 32;

  // ── DOM refs ───────────────────────────────────────────
  const grid = document.getElementById("shop-grid");
  const emptyState = document.getElementById("empty-state");
  const itemCount = document.getElementById("item-count");
  const searchInput = document.getElementById("search-input");

  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");
  const modalClose = document.getElementById("modal-close");

  const tagSidebar = document.getElementById("tag-sidebar");

  const playerSelect = document.getElementById("player-select");
  const playerBtn = document.getElementById("player-report-btn");
  const clearSortBtn = document.getElementById("clear-smart-sort-btn");
  const reportBackdrop = document.getElementById("report-backdrop");
  const reportClose = document.getElementById("report-close");
  const reportContent = document.getElementById("report-content");

  // ── Sale helpers ────────────────────────────────────────
  function getSaleInfo(item) {
    if (item.onSale === true && item.salePrice !== null && item.salePrice !== "" && item.salePrice !== undefined) {
      return { onSale: true, salePrice: item.salePrice };
    }

    if (item.globalSaleOn === true && item.onSale !== true && item.salePricePct !== null && item.salePricePct !== undefined) {
      return { onSale: true, salePrice: item.salePricePct };
    }

    return { onSale: false, salePrice: null };
  }

  function priceHTML(item, large = false) {
    const { onSale, salePrice } = getSaleInfo(item);

    if (onSale) {
      return `
        <div class="price-wrap">
          <span class="price-original">💰 ${item.price.toLocaleString()}</span>
          <span class="price-sale${large ? " price-sale-lg" : ""}">💰 ${Number(salePrice).toLocaleString()}</span>
        </div>`;
    }

    return `<span class="${large ? "modal-price" : "card-price"}" ${item.category === "bulk" ? 'data-bulk-price' : ''}>💰 ${item.price.toLocaleString()}</span>`;
  }

  // ── Filtering + sorting ─────────────────────────────────
  function getFilteredItems() {
    const filtered = ITEMS.filter(item => {
      if (item.available === false) return false;

      const matchCategory = activeCategory === "all" || item.category === activeCategory;

      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q));

      const matchTags = matchesTagFilters(item);
      const matchRecommendation = recommendationTerms.size === 0 || getRecommendationScore(item) > 0;

      return matchCategory && matchSearch && matchTags && matchRecommendation;
    });

    // If smart sort is active, put strongest recommendation matches first.
    if (recommendationTerms.size > 0) {
      filtered.sort((a, b) => getRecommendationScore(b) - getRecommendationScore(a));
    }

    return filtered;
  }

  function matchesTagFilters(item) {
    if (!activeTagFilters.size) return true;

    for (const [groupName, selectedTags] of activeTagFilters.entries()) {
      const groupTags = (item.tagGroups?.[groupName] || []).map(tag => tag.toLowerCase());
      const hasAnyTagInGroup = [...selectedTags].some(tag => groupTags.includes(tag));
      if (!hasAnyTagInGroup) return false;
    }

    return true;
  }

  function getRecommendationScore(item) {
    if (!recommendationTerms.size) return 0;

    const name = item.name.toLowerCase();
    const tags = item.tags.map(tag => tag.toLowerCase());

    let score = 0;
    recommendationTerms.forEach(term => {
      if (!term) return;
      if (name.includes(term)) score += 3;
      if (tags.some(tag => tag.includes(term))) score += 2;
    });

    return score;
  }

  // ── Category pills ───────────────────────────────────────
  function buildCategoryPills() {
    const categories = [...new Set(ITEMS.filter(i => i.available !== false).map(i => i.category))];
    const pillsContainer = document.querySelector(".category-pills");

    pillsContainer.innerHTML = "";
const allBtn = document.createElement("button");
allBtn.className = "pill active";
allBtn.dataset.category = "all";
allBtn.textContent = "All Items";
allBtn.addEventListener("click", () => {
  document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  allBtn.classList.add("active");
  activeCategory = "all";
  renderGrid();
});
pillsContainer.appendChild(allBtn);

    categories.forEach(category => {
      const btn = document.createElement("button");
      btn.className = "pill";
      btn.dataset.category = category;
      btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);

      btn.addEventListener("click", () => {
        document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = category;
        renderGrid();
      });

      pillsContainer.appendChild(btn);
    });

    if (!categories.includes(activeCategory)) activeCategory = "all";

    document.querySelectorAll(".pill").forEach(pill => {
      pill.classList.toggle("active", pill.dataset.category === activeCategory);
    });
  }

  // ── Tag sidebar ──────────────────────────────────────────
  function buildTagSidebar() {
    const tagGroups = collectTagGroupsFromItems();

    if (!tagGroups.length) {
      tagSidebar.innerHTML = "";
      return;
    }

    const sidebarHeader = `
      <div class="sidebar-head">
        <h3 class="sidebar-title">Tag Filters</h3>
        <button class="sidebar-clear" id="clear-tag-filters" type="button">Clear</button>
      </div>`;

    const groupsHtml = tagGroups.map(group => {
      const isOpen = expandedTagGroups.has(group.name) || expandedTagGroups.size === 0;

      const tagsHtml = group.tags.map(tag => {
        const checked = activeTagFilters.get(group.name)?.has(tag.toLowerCase()) ? "checked" : "";
        return `
          <label class="tag-option">
            <input type="checkbox" data-group="${escHtml(group.name)}" data-tag="${escHtml(tag)}" ${checked} />
            <span>${escHtml(tag)}</span>
          </label>`;
      }).join("");

      return `
        <section class="tag-group ${isOpen ? "open" : ""}">
          <button class="tag-group-btn" data-group-btn="${escHtml(group.name)}" type="button">
            ${escHtml(group.name)}
          </button>
          <div class="tag-group-options">${tagsHtml}</div>
        </section>`;
    }).join("");

    tagSidebar.innerHTML = sidebarHeader + groupsHtml;

    const clearBtn = document.getElementById("clear-tag-filters");
    clearBtn.addEventListener("click", () => {
      activeTagFilters.clear();
      renderGrid();
      buildTagSidebar();
    });

    tagSidebar.querySelectorAll("[data-group-btn]").forEach(btn => {
      btn.addEventListener("click", () => {
        const section = btn.closest(".tag-group");
        section.classList.toggle("open");

        const group = btn.dataset.groupBtn;
        if (section.classList.contains("open")) expandedTagGroups.add(group);
        else expandedTagGroups.delete(group);
      });
    });

    tagSidebar.querySelectorAll("input[type='checkbox'][data-group]").forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        const group = checkbox.dataset.group;
        const tag = checkbox.dataset.tag.toLowerCase();

        if (!activeTagFilters.has(group)) activeTagFilters.set(group, new Set());

        if (checkbox.checked) activeTagFilters.get(group).add(tag);
        else activeTagFilters.get(group).delete(tag);

        if (activeTagFilters.get(group).size === 0) activeTagFilters.delete(group);

        renderGrid();
      });
    });
  }

function collectTagGroupsFromItems() {
  const groups = new Map();

  ITEMS.forEach(item => {
    // Use tagGroups if it exists AND has keys, otherwise fall back to flat tags
    const hasTagGroups = item.tagGroups && Object.keys(item.tagGroups).length > 0;

    if (hasTagGroups) {
      Object.entries(item.tagGroups).forEach(([groupName, tags]) => {
        if (!groups.has(groupName)) groups.set(groupName, new Set());
        (tags || []).forEach(tag => groups.get(groupName).add(tag));
      });
    } else {
      // Flat tags with no category — put under "Tags"
      const flatTags = item.tags || [];
      if (!groups.has("Tags")) groups.set("Tags", new Set());
      flatTags.forEach(tag => groups.get("Tags").add(tag));
    }
  });

  return [...groups.entries()]
    .map(([name, tagSet]) => ({ name, tags: [...tagSet].sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

  // ── Card rendering ───────────────────────────────────────
  function buildCard(item) {
    const { onSale } = getSaleInfo(item);
    const recommendationScore = getRecommendationScore(item);
    const base = buildBaseCardParts(item);
    const categoryExtension = buildCategoryCardExtension(item);

    return `
      <article class="item-card${onSale ? " on-sale" : ""}${recommendationScore > 0 ? " rec-match" : ""}"
        data-id="${item.id}" tabindex="0" role="button" aria-label="View details for ${escHtml(item.name)}">
        ${onSale ? `<span class="sale-ribbon">SALE</span>` : ""}
        <div class="card-badge">${escHtml(item.saleType || "Per Item")}</div>
        ${base.media}
        <div class="card-info">
          <h2 class="card-name">${escHtml(item.name)}</h2>
          <div class="card-footer">
            ${base.priceMarkup}
          </div>
          ${categoryExtension}
          ${base.tagsHTML}
        </div>
      </article>`;
  }

  function buildBaseCardParts(item) {
    const media = item.image
      ? `<div class="card-img-wrap"><img src="${item.image}" alt="${escHtml(item.name)}" class="card-img" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'card-emoji\'>${item.emoji}</div>'"/></div>`
      : `<div class="card-img-wrap"><div class="card-emoji">${item.emoji}</div></div>`;

    const tagsHTML = item.tags.length
      ? `<div class="card-tags">${item.tags.map(tag => `<span class="card-tag">${escHtml(tag)}</span>`).join("")}</div>`
      : "";

    return { media, tagsHTML, priceMarkup: priceHTML(item) };
  }

  function buildCategoryCardExtension(item) {
    if (item.category === "weapon") return buildWeaponCardExtension();
    if (item.category === "bulk") return buildBulkCardExtension(item);
    return "";
  }

  function buildWeaponCardExtension() {
    return `<a class="card-action-btn weapon-action-btn" href="${escHtml(WEAPON_PAGE_URL)}" target="_blank" rel="noopener noreferrer">${WEAPON_BUTTON_LABEL}</a>`;
  }

  function buildBulkCardExtension(item) { return ""; }

  function renderGrid() {
    const filtered = getFilteredItems();
    itemCount.textContent = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`;

    if (!filtered.length) {
      grid.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = filtered.map(buildCard).join("");

    grid.querySelectorAll(".item-card").forEach((card, index) => {
      card.style.animationDelay = `${index * 40}ms`;
      card.classList.add("card-enter");
    });

    attachCardListeners();
    attachCategoryCardListeners();
  }

  function attachCardListeners() {
    grid.querySelectorAll(".item-card").forEach(card => {
      const id = parseInt(card.dataset.id, 10);
      card.addEventListener("click", () => openModal(id));
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openModal(id);
        }
      });
    });
  }


  function attachCategoryCardListeners() {
    grid.querySelectorAll(".card-action-btn, .bulk-slider").forEach(el => {
      el.addEventListener("click", event => event.stopPropagation());
      el.addEventListener("keydown", event => event.stopPropagation());
    });

    grid.querySelectorAll("[data-bulk-controls]").forEach(container => {
      const slider    = container.querySelector("[data-bulk-slider]");
      const qtyEl     = container.querySelector("[data-bulk-qty]");
      const discEl    = container.querySelector("[data-bulk-discount]");
      const card      = container.closest(".item-card");
      const priceEl   = card ? card.querySelector("[data-bulk-price]") : null;
      const unitPrice = Number(container.dataset.unitPrice) || 0;

      if (!slider || !qtyEl) return;

      const getDiscount = qty => {
        if (qty < 5)   return 0;
        if (qty >= 10) return 20;
        return 10 + (qty - 5) * 2;
      };

      const updateBulkDisplay = () => {
        const q        = Number(slider.value) || BULK_MIN_QTY;
        const discount = getDiscount(q);
        const price    = discount > 0 ? Math.round(unitPrice * (1 - discount / 100)) : unitPrice;
        qtyEl.textContent  = String(q);
        discEl.textContent = discount > 0 ? `${discount}% off` : "";
        if (priceEl) priceEl.textContent = `💰 ${price.toLocaleString()}`;
      };

      slider.addEventListener("input", updateBulkDisplay);
      updateBulkDisplay();
    });
  }

  // ── Item modal ───────────────────────────────────────────
  function openModal(id) {
    const item = ITEMS.find(i => i.id === id);
    if (!item) return;

    const { onSale } = getSaleInfo(item);

    const media = item.image
      ? `<div class="modal-img-wrap"><img src="${item.image}" alt="${escHtml(item.name)}" class="modal-img" onerror="this.parentElement.innerHTML='<div class=\\'modal-emoji\\'>${item.emoji}</div>'"/></div>`
      : `<div class="modal-img-wrap"><div class="modal-emoji">${item.emoji}</div></div>`;

    const desc = item.description ? `<p class="modal-desc">${escHtml(item.description)}</p>` : "";

    const tagsHTML = item.tags.length
      ? `<div class="card-tags" style="margin-top:0.5rem">${item.tags.map(tag => `<span class="card-tag">${escHtml(tag)}</span>`).join("")}</div>`
      : "";

    modalContent.innerHTML = `
      ${media}
      <div class="modal-body">
        <span class="modal-level-badge">${escHtml(item.saleType || "Per Item")}</span>
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

  // ── Player report ────────────────────────────────────────
  async function loadPlayerReportRows() {
    if (!PLAYER_SHEET_CSV) return;

    try {
      const response = await fetch(PLAYER_SHEET_CSV);
      const csvText = await response.text();
      const rows = parseCSV(csvText);

      playerRows = rows.filter(row => row["Player Name"]);
      playerSelect.innerHTML = `<option value="">Select player...</option>` +
        playerRows.map(row => `<option>${escHtml(row["Player Name"])}</option>`).join("");
    } catch (error) {
      console.warn("[Player Report] Failed to load CSV:", error);
    }
  }

  function openPlayerReport() {
    const selectedName = playerSelect.value;
    if (!selectedName) return;

    const row = playerRows.find(r => r["Player Name"] === selectedName);
    if (!row) return;

    activePlayerRow = row;

    const manufacturing = splitRecommendationList(row["Manufacturing Buy Suggestion"]);
    const retail = splitRecommendationList(row["Retail Buy Suggestion"]);
    const wholesale = splitRecommendationList(row["WholeSale Buy Suggestion"]);

    reportContent.innerHTML = `
      <h2>PLAYER REPORT — ${escHtml(selectedName)}</h2>
      <p><strong>Missing Manufacturing:</strong> ${escHtml(row["Missing Manufacturing"] || "0")}</p>
      <p><strong>Missing Retail:</strong> ${escHtml(row["Missing Retail"] || "0")}</p>
      <p><strong>Missing Wholesale:</strong> ${escHtml(row["Missing Wholesale"] || "0")}</p>
      <p><strong>Total Missing:</strong> ${escHtml(row["Missing Total"] || "0")}</p>
      <hr />
      <h3>Recommended Manufacturing Purchases</h3>
      ${listHTML(manufacturing)}
      <h3>Recommended Retail Purchases</h3>
      ${listHTML(retail)}
      <h3>Recommended Wholesale Purchases</h3>
      ${listHTML(wholesale)}
      <button id="sort-shop-btn" class="sort-shop-btn" type="button">Sort Shop For Me</button>`;

    reportBackdrop.removeAttribute("hidden");

    const sortBtn = reportContent.querySelector("#sort-shop-btn");
    sortBtn.addEventListener("click", applyRecommendationFilter);
  }

  function applyRecommendationFilter() {
    if (!activePlayerRow) return;

    const allTerms = [
      "Manufacturing Buy Suggestion",
      "Retail Buy Suggestion",
      "Wholesale Buy Suggestion"
    ].flatMap(key => splitRecommendationList(activePlayerRow[key]));

    recommendationTerms = new Set(allTerms.map(term => term.toLowerCase()));
    renderGrid();
    closeReport();

    if (clearSortBtn) clearSortBtn.classList.remove("hidden");
  }

  function clearRecommendationFilter() {
    recommendationTerms = new Set();
    renderGrid();

    if (clearSortBtn) clearSortBtn.classList.add("hidden");
  }

  function closeReport() {
    reportBackdrop.setAttribute("hidden", "");
  }

  function splitRecommendationList(value) {
    if (!value) return [];
    return String(value)
      .split(/[\n,|]/)
      .map(v => v.trim())
      .filter(Boolean);
  }

  // Handles quoted commas in CSV rows.
  function parseCSV(csvText) {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i += 1) {
      const char = csvText[i];
      const next = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(value);
        value = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }

    if (value.length || row.length) {
      row.push(value);
      rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map(h => h.trim());
    return rows.slice(1)
      .filter(r => r.some(cell => String(cell).trim() !== ""))
      .map(r => {
        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = (r[idx] || "").trim();
        });
        return obj;
      });
  }

  function listHTML(items) {
    if (!items.length) return "<p>None</p>";
    return `<ul>${items.map(item => `<li>${escHtml(item)}</li>`).join("")}</ul>`;
  }

  function escHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ── Events ───────────────────────────────────────────────
  searchInput.addEventListener("input", event => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderGrid();
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", event => {
    if (event.target === modalBackdrop) closeModal();
  });

  reportClose.addEventListener("click", closeReport);
  reportBackdrop.addEventListener("click", event => {
    if (event.target === reportBackdrop) closeReport();
  });

  playerBtn.addEventListener("click", openPlayerReport);

  if (clearSortBtn) {
    clearSortBtn.addEventListener("click", clearRecommendationFilter);
  }

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeModal();
    closeReport();
  });

  // ── Auto-refresh ─────────────────────────────────────────
  function scheduleRefresh() {
    refreshTimer = setInterval(async () => {
      if (!modalBackdrop.hasAttribute("hidden")) return;

      await loadItemsFromSheet(true);
      buildCategoryPills();
      buildTagSidebar();
      renderGrid();
    }, CACHE_TIME);
  }

  // ── Init ─────────────────────────────────────────────────
  async function init() {
    grid.innerHTML = `<div class="loading-state">Loading items…</div>`;

    await Promise.all([loadItemsFromSheet(), loadPlayerReportRows()]);

    if (!ITEMS.length) {
      grid.innerHTML = `<div class="loading-state">⚠️ Could not load items. Please refresh the page.</div>`;
      return;
    }

    buildCategoryPills();
    buildTagSidebar();
    renderGrid();
    scheduleRefresh();
  }

  init();
})();
