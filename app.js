"use strict";

/* =========================================================
   PLAN DE TRADING — APP.JS V3
   ========================================================= */

const APP_VERSION = 3;

const STORAGE_KEYS = {
  trades: "trading-plan-trades",
  capitals: "trading-plan-capitals",
  plan: "trading-plan-settings",
  metadata: "trading-plan-metadata",
};

/* =========================================================
   STORAGE
   ========================================================= */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);

    return parsed ?? fallback;
  } catch (error) {
    console.error(`Erreur lecture localStorage (${key}) :`, error);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Erreur écriture localStorage (${key}) :`, error);
    return false;
  }
}

function saveMetadata() {
  saveJSON(STORAGE_KEYS.metadata, {
    version: APP_VERSION,
    updatedAt: new Date().toISOString(),
  });
}

/* =========================================================
   HELPERS GENERAUX
   ========================================================= */

function createId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function escapeHTML(value) {
  return safeString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNumber(value));
}

function formatPercent(value) {
  return `${safeNumber(value).toFixed(1)} %`;
}

function formatNumber(value, decimals = 2) {
  return safeNumber(value).toFixed(decimals);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(asset, value) {
  const number = safeNumber(value);

  if (!number) {
    return "—";
  }

  if (asset === "XAUUSD" || asset === "USDJPY") {
    return number.toFixed(2);
  }

  return number.toFixed(5);
}

function getDefaultDateTime() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/* =========================================================
   DONNEES
   ========================================================= */

let trades = loadJSON(STORAGE_KEYS.trades, []);
let capitals = loadJSON(STORAGE_KEYS.capitals, []);

function normalizeLoadedData() {
  if (!Array.isArray(trades)) {
    trades = [];
  }

  if (!Array.isArray(capitals)) {
    capitals = [];
  }

  trades = trades
    .filter((trade) => trade && typeof trade === "object")
    .map((trade) => ({
      ...trade,

      id: trade.id || createId("trade"),

      capitalId: safeString(trade.capitalId, ""),

      capitalName: safeString(trade.capitalName, ""),

      asset: safeString(trade.asset, "XAUUSD"),

      direction: safeString(trade.direction, "BUY"),

      session: safeString(trade.session, ""),

      timeframe: safeString(trade.timeframe, ""),

      setup: safeString(trade.setup, ""),

      result: safeString(trade.result, "TP").toUpperCase(),

      entry: safeNumber(trade.entry),

      sl: safeNumber(trade.sl),

      tp: safeNumber(trade.tp),

      exitPrice: safeNumber(trade.exitPrice),

      rr: safeNumber(trade.rr),

      lot: safeNumber(trade.lot),

      lotRaw: safeNumber(trade.lotRaw),

      riskMoney: safeNumber(trade.riskMoney),

      riskAtStop: safeNumber(trade.riskAtStop),

      slPips: safeNumber(trade.slPips),

      realizedPips: safeNumber(trade.realizedPips),

      pipValuePerLot: safeNumber(trade.pipValuePerLot),

      pnl: safeNumber(trade.pnl),

      r: safeNumber(trade.r),

      entryReason: safeString(trade.entryReason, ""),

      notes: safeString(trade.notes, ""),

      date: trade.date || trade.createdAt || "",

      createdAt: trade.createdAt || trade.date || "",
    }));

  capitals = capitals
    .filter((capital) => capital && typeof capital === "object")
    .map((capital) => ({
      ...capital,

      id: capital.id || createId("capital"),

      name: safeString(capital.name, "Capital"),

      initialCapital: safeNumber(capital.initialCapital),

      riskPercent: safeNumber(capital.riskPercent),

      riskAmount: safeNumber(capital.riskAmount),

      defaultRR: safeNumber(capital.defaultRR, 2),

      status: capital.status === "archived" ? "archived" : "active",

      createdAt: capital.createdAt || new Date().toISOString(),
    }));
}

function refreshDataFromStorage() {
  trades = loadJSON(STORAGE_KEYS.trades, []);
  capitals = loadJSON(STORAGE_KEYS.capitals, []);

  normalizeLoadedData();
}

/* =========================================================
   PLAN
   ========================================================= */

function loadPlan() {
  const plan = loadJSON(STORAGE_KEYS.plan, {});

  return plan && typeof plan === "object" ? plan : {};
}

function savePlan(plan) {
  saveJSON(STORAGE_KEYS.plan, plan);
  saveMetadata();
}

/* =========================================================
   DOM
   ========================================================= */

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll("[data-page]");

const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");
const currentDateElement = document.getElementById("current-date");

/* =========================================================
   NAVIGATION
   ========================================================= */

const PAGE_META = {
  dashboard: {
    title: "Dashboard",
    description: "Vue d’ensemble de tes performances de trading.",
  },

  journal: {
    title: "Journal",
    description: "Enregistre et analyse chaque opération.",
  },

  capitals: {
    title: "Capitaux",
    description: "Gère tes capitaux et ton risque par opération.",
  },

  plan: {
    title: "Plan de trading",
    description: "Vérifie ton plan avant chaque prise de position.",
  },
};

function showPage(pageName) {
  pages.forEach((page) => {
    page.classList.toggle(
      "active",
      page.id === `page-${pageName}`
    );
  });

  navButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  const meta = PAGE_META[pageName];

  if (meta) {
    if (pageTitle) {
      pageTitle.textContent = meta.title;
    }

    if (pageDescription) {
      pageDescription.textContent = meta.description;
    }
  }

  if (pageName === "journal") {
    renderJournal();
  }

  if (pageName === "dashboard") {
    renderDashboard();
  }

  if (pageName === "capitals") {
    renderCapitals();
  }

  if (pageName === "plan") {
    renderPlanChecklist();
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

/* =========================================================
   MODALS
   ========================================================= */

const tradeModal = document.getElementById("trade-modal");
const capitalModal = document.getElementById("capital-modal");

const tradeForm = document.getElementById("trade-form");
const capitalForm = document.getElementById("capital-form");

function openModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  const anyOpenModal = document.querySelector(
    ".modal.open"
  );

  if (!anyOpenModal) {
    document.body.classList.remove("modal-open");
  }
}

document
  .getElementById("open-trade-modal")
  ?.addEventListener("click", openTradeModal);

document
  .getElementById("open-capital-modal")
  ?.addEventListener("click", () => {
    openCapitalModal();
  });

document
  .getElementById("close-trade-modal")
  ?.addEventListener("click", () => {
    closeModal(tradeModal);
  });

document
  .getElementById("close-capital-modal")
  ?.addEventListener("click", () => {
    closeModal(capitalModal);
  });

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modalId = button.dataset.closeModal;

    closeModal(document.getElementById(modalId));
  });
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  closeModal(tradeModal);
  closeModal(capitalModal);
});

/* =========================================================
   CAPITAUX
   ========================================================= */

function getActiveCapital() {
  return capitals.find(
    (capital) => capital.status === "active"
  ) || null;
}

function getCapitalById(id) {
  return capitals.find(
    (capital) => capital.id === id
  ) || null;
}

function getCapitalTrades(capitalId) {
  return trades.filter(
    (trade) => trade.capitalId === capitalId
  );
}

function getCapitalBalance(capital) {
  if (!capital) {
    return 0;
  }

  const capitalTrades = getCapitalTrades(capital.id);

  const pnl = capitalTrades.reduce(
    (sum, trade) => sum + safeNumber(trade.pnl),
    0
  );

  return safeNumber(capital.initialCapital) + pnl;
}

function getCapitalRisk(capital) {
  if (!capital) {
    return 0;
  }

  const balance = getCapitalBalance(capital);

  if (capital.riskMode === "fixed") {
    return Math.max(0, safeNumber(capital.riskAmount));
  }

  const percent = safeNumber(capital.riskPercent);

  return Math.max(0, balance * (percent / 100));
}

function getCapitalRiskPercent(capital) {
  if (!capital) {
    return 0;
  }

  const balance = getCapitalBalance(capital);

  if (balance <= 0) {
    return 0;
  }

  if (capital.riskMode === "fixed") {
    return (
      safeNumber(capital.riskAmount) /
      balance *
      100
    );
  }

  return safeNumber(capital.riskPercent);
}

function ensureSingleActiveCapital() {
  const activeCapitals = capitals.filter(
    (capital) => capital.status === "active"
  );

  if (activeCapitals.length <= 1) {
    return;
  }

  activeCapitals.slice(1).forEach((capital) => {
    capital.status = "archived";
  });

  saveJSON(STORAGE_KEYS.capitals, capitals);
}

function ensureActiveCapitalExists() {
  const active = getActiveCapital();

  if (active) {
    return active;
  }

  if (!capitals.length) {
    return null;
  }

  const mostRecent = [...capitals]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )[0];

  if (mostRecent) {
    mostRecent.status = "active";

    saveJSON(STORAGE_KEYS.capitals, capitals);

    return mostRecent;
  }

  return null;
}

/* =========================================================
   CAPITAL MODAL
   ========================================================= */

function setCapitalRiskMode(mode) {
  const percentageMode =
    document.getElementById("capital-risk-mode-percentage");

  const fixedMode =
    document.getElementById("capital-risk-mode-fixed");

  const percentageGroup =
    document.getElementById("capital-risk-percent-group");

  const fixedGroup =
    document.getElementById("capital-risk-amount-group");

  const isPercentage = mode !== "fixed";

  if (percentageMode) {
    percentageMode.checked = isPercentage;
  }

  if (fixedMode) {
    fixedMode.checked = !isPercentage;
  }

  if (percentageGroup) {
    percentageGroup.style.display =
      isPercentage ? "" : "none";
  }

  if (fixedGroup) {
    fixedGroup.style.display =
      isPercentage ? "none" : "";
  }
}

document
  .getElementById("capital-risk-mode-percentage")
  ?.addEventListener("change", () => {
    setCapitalRiskMode("percentage");
  });

document
  .getElementById("capital-risk-mode-fixed")
  ?.addEventListener("change", () => {
    setCapitalRiskMode("fixed");
  });

function openCapitalModal(capitalId = null) {
  if (!capitalForm) {
    return;
  }

  capitalForm.reset();

  const idInput =
    document.getElementById("capital-id");

  const nameInput =
    document.getElementById("capital-name");

  const initialInput =
    document.getElementById("capital-initial");

  const riskPercentInput =
    document.getElementById("capital-risk-percent");

  const riskAmountInput =
    document.getElementById("capital-risk-amount");

  const defaultRRInput =
    document.getElementById("capital-default-rr");

  const title =
    document.getElementById("capital-modal-title");

  if (idInput) {
    idInput.value = capitalId || "";
  }

  if (capitalId) {
    const capital = getCapitalById(capitalId);

    if (!capital) {
      return;
    }

    if (title) {
      title.textContent = "Modifier le capital";
    }

    if (nameInput) {
      nameInput.value = capital.name;
    }

    if (initialInput) {
      initialInput.value = capital.initialCapital;
    }

    if (riskPercentInput) {
      riskPercentInput.value = capital.riskPercent || 1;
    }

    if (riskAmountInput) {
      riskAmountInput.value = capital.riskAmount || "";
    }

    if (defaultRRInput) {
      defaultRRInput.value = capital.defaultRR || 2;
    }

    setCapitalRiskMode(
      capital.riskMode === "fixed"
        ? "fixed"
        : "percentage"
    );
  } else {
    if (title) {
      title.textContent = "Nouveau capital";
    }

    if (riskPercentInput) {
      riskPercentInput.value = 1;
    }

    if (defaultRRInput) {
      defaultRRInput.value = 2;
    }

    setCapitalRiskMode("percentage");
  }

  openModal(capitalModal);
}

capitalForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const id =
    document.getElementById("capital-id")?.value.trim() || "";

  const name =
    document.getElementById("capital-name")?.value.trim() || "";

  const initialCapital =
    safeNumber(
      document.getElementById("capital-initial")?.value
    );

  const riskMode =
    document.getElementById(
      "capital-risk-mode-fixed"
    )?.checked
      ? "fixed"
      : "percentage";

  const riskPercent =
    safeNumber(
      document.getElementById("capital-risk-percent")?.value
    );

  const riskAmount =
    safeNumber(
      document.getElementById("capital-risk-amount")?.value
    );

  const defaultRR =
    safeNumber(
      document.getElementById("capital-default-rr")?.value,
      2
    );

  if (!name) {
    alert("Veuillez saisir un nom de capital.");
    return;
  }

  if (initialCapital <= 0) {
    alert("Le capital initial doit être supérieur à 0.");
    return;
  }

  if (riskMode === "percentage" && riskPercent <= 0) {
    alert("Le risque en pourcentage doit être supérieur à 0.");
    return;
  }

  if (riskMode === "fixed" && riskAmount <= 0) {
    alert("Le risque fixe doit être supérieur à 0.");
    return;
  }

  if (id) {
    const capital = getCapitalById(id);

    if (!capital) {
      return;
    }

    capital.name = name;
    capital.initialCapital = initialCapital;
    capital.riskMode = riskMode;
    capital.riskPercent = riskPercent;
    capital.riskAmount = riskAmount;
    capital.defaultRR = defaultRR;
  } else {
    const hasActiveCapital = Boolean(getActiveCapital());

    capitals.push({
      id: createId("capital"),
      name,
      initialCapital,
      riskMode,
      riskPercent,
      riskAmount,
      defaultRR,
      status: hasActiveCapital
        ? "archived"
        : "active",
      createdAt: new Date().toISOString(),
    });
  }

  ensureSingleActiveCapital();

  saveJSON(STORAGE_KEYS.capitals, capitals);
  saveMetadata();

  closeModal(capitalModal);

  updateAll();
});

/* =========================================================
   CAPITAL ACTIONS
   ========================================================= */

function archiveCapital(id) {
  const capital = getCapitalById(id);

  if (!capital) {
    return;
  }

  capital.status = "archived";

  ensureActiveCapitalExists();

  saveJSON(STORAGE_KEYS.capitals, capitals);
  saveMetadata();

  updateAll();
}

function activateCapital(id) {
  const capital = getCapitalById(id);

  if (!capital) {
    return;
  }

  capitals.forEach((item) => {
    item.status =
      item.id === id
        ? "active"
        : "archived";
  });

  saveJSON(STORAGE_KEYS.capitals, capitals);
  saveMetadata();

  updateAll();
}

function deleteCapital(id) {
  const capital = getCapitalById(id);

  if (!capital) {
    return;
  }

  const linkedTrades = getCapitalTrades(id);

  if (linkedTrades.length > 0) {
    alert(
      "Impossible de supprimer ce capital car il contient des trades."
    );
    return;
  }

  const confirmed = confirm(
    `Supprimer le capital "${capital.name}" ?`
  );

  if (!confirmed) {
    return;
  }

  capitals = capitals.filter(
    (item) => item.id !== id
  );

  ensureActiveCapitalExists();

  saveJSON(STORAGE_KEYS.capitals, capitals);
  saveMetadata();

  updateAll();
}

function editCapital(id) {
  openCapitalModal(id);
}

window.editCapital = editCapital;
window.archiveCapital = archiveCapital;
window.activateCapital = activateCapital;
window.deleteCapital = deleteCapital;

/* =========================================================
   RENDER CAPITAUX
   ========================================================= */

function renderCapitalItem(capital, active = false) {
  const balance = getCapitalBalance(capital);
  const pnl = balance - capital.initialCapital;
  const risk = getCapitalRisk(capital);
  const riskPercent = getCapitalRiskPercent(capital);

  const pnlClass =
    pnl > 0
      ? "positive"
      : pnl < 0
      ? "negative"
      : "";

  return `
    <div class="capital-item">
      <div class="capital-item-main">
        <div>
          <h3>${escapeHTML(capital.name)}</h3>
          <span class="capital-status">
            ${active ? "Actif" : "Archivé"}
          </span>
        </div>

        <div class="capital-item-balance">
          ${formatMoney(balance)}
        </div>
      </div>

      <div class="capital-item-details">
        <div>
          <span>Capital initial</span>
          <strong>${formatMoney(capital.initialCapital)}</strong>
        </div>

        <div>
          <span>P&L</span>
          <strong class="${pnlClass}">
            ${pnl >= 0 ? "+" : ""}${formatMoney(pnl)}
          </strong>
        </div>

        <div>
          <span>Risque / trade</span>
          <strong>
            ${formatMoney(risk)}
            (${formatPercent(riskPercent)})
          </strong>
        </div>

        <div>
          <span>RR par défaut</span>
          <strong>RR ${formatNumber(capital.defaultRR, 1)}</strong>
        </div>
      </div>

      <div class="capital-item-actions">
        <button
          type="button"
          class="btn btn-secondary"
          onclick="editCapital('${escapeHTML(capital.id)}')"
        >
          Modifier
        </button>

        ${
          active
            ? `
              <button
                type="button"
                class="btn btn-secondary"
                onclick="archiveCapital('${escapeHTML(capital.id)}')"
              >
                Archiver
              </button>
            `
            : `
              <button
                type="button"
                class="btn btn-secondary"
                onclick="activateCapital('${escapeHTML(capital.id)}')"
              >
                Activer
              </button>
            `
        }

        <button
          type="button"
          class="btn btn-danger"
          onclick="deleteCapital('${escapeHTML(capital.id)}')"
        >
          Supprimer
        </button>
      </div>
    </div>
  `;
}

function renderCapitals() {
  const activeContainer =
    document.getElementById(
      "active-capital-container"
    );

  const archivedContainer =
    document.getElementById(
      "archived-capitals-container"
    );

  const activeName =
    document.getElementById(
      "active-capital-name"
    );

  const activeBalance =
    document.getElementById(
      "active-capital-balance"
    );

  const archivedCount =
    document.getElementById(
      "archived-capitals-count"
    );

  const globalPnl =
    document.getElementById(
      "capitals-global-pnl"
    );

  const active = getActiveCapital();

  if (activeContainer) {
    activeContainer.innerHTML = active
      ? renderCapitalItem(active, true)
      : `
        <div class="empty">
          Aucun capital actif.
        </div>
      `;
  }

  if (archivedContainer) {
    const archived = capitals.filter(
      (capital) =>
        capital.status === "archived"
    );

    archivedContainer.innerHTML =
      archived.length
        ? archived
            .map((capital) =>
              renderCapitalItem(capital, false)
            )
            .join("")
        : `
          <div class="empty">
            Aucun capital archivé.
          </div>
        `;

    if (archivedCount) {
      archivedCount.textContent = archived.length;
    }
  }

  if (activeName) {
    activeName.textContent =
      active?.name || "Aucun capital";
  }

  if (activeBalance) {
    activeBalance.textContent =
      formatMoney(
        active
          ? getCapitalBalance(active)
          : 0
      );
  }

  if (globalPnl) {
    const totalPnl = trades.reduce(
      (sum, trade) =>
        sum + safeNumber(trade.pnl),
      0
    );

    globalPnl.textContent =
      `${totalPnl >= 0 ? "+" : ""}${formatMoney(totalPnl)}`;
  }
}

/* =========================================================
   ASSETS / CALCULS
   ========================================================= */

const ASSET_CONFIG = {
  XAUUSD: {
    multiplier: 100,
    pipValue: 1,
  },

  EURUSD: {
    multiplier: 10000,
    pipValue: 10,
  },

  GBPUSD: {
    multiplier: 10000,
    pipValue: 10,
  },

  AUDUSD: {
    multiplier: 10000,
    pipValue: 10,
  },

  NZDUSD: {
    multiplier: 10000,
    pipValue: 10,
  },

  USDJPY: {
    multiplier: 100,
    dynamic: true,
  },

  USDCAD: {
    multiplier: 10000,
    dynamic: true,
  },

  USDCHF: {
    multiplier: 10000,
    dynamic: true,
  },
};

function getAssetConfig(asset) {
  return (
    ASSET_CONFIG[asset] || {
      multiplier: 10000,
      pipValue: 10,
    }
  );
}

function normalizeLot(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value * 100) / 100;
}

function getPipDistance(asset, price1, price2) {
  const config = getAssetConfig(asset);

  const p1 = safeNumber(price1);
  const p2 = safeNumber(price2);

  if (!p1 || !p2) {
    return 0;
  }

  return Math.abs(p1 - p2) * config.multiplier;
}

function getSignedPips(
  asset,
  direction,
  entry,
  exit
) {
  const config = getAssetConfig(asset);

  const entryPrice = safeNumber(entry);
  const exitPrice = safeNumber(exit);

  if (!entryPrice || !exitPrice) {
    return 0;
  }

  const difference =
    direction === "BUY"
      ? exitPrice - entryPrice
      : entryPrice - exitPrice;

  return difference * config.multiplier;
}

function getPipValue(asset, price) {
  const config = getAssetConfig(asset);

  if (!config.dynamic) {
    return config.pipValue;
  }

  const currentPrice = safeNumber(price);

  if (!currentPrice) {
    return 0;
  }

  if (asset === "USDJPY") {
    return 1000 / currentPrice;
  }

  if (asset === "USDCAD") {
    return 10 / currentPrice;
  }

  if (asset === "USDCHF") {
    return 10 * currentPrice;
  }

  return config.pipValue || 0;
}

function getActualPipValue(asset, entry) {
  return getPipValue(asset, entry);
}

function calculateRiskAtStop(
  lot,
  slPips,
  pipValue
) {
  return (
    safeNumber(lot) *
    safeNumber(slPips) *
    safeNumber(pipValue)
  );
}

/* =========================================================
   TRADE MODAL
   ========================================================= */

function openTradeModal() {
  const activeCapital = getActiveCapital();

  if (!activeCapital) {
    alert(
      "Crée d'abord un capital actif avant d'ajouter un trade."
    );
    showPage("capitals");
    return;
  }

  if (!tradeForm) {
    return;
  }

  tradeForm.reset();

  const dateInput =
    document.getElementById("trade-date");

  const rrInput =
    document.getElementById("trade-rr");

  const assetInput =
    document.getElementById("trade-asset");

  const resultInput =
    document.getElementById("trade-result");

  if (dateInput) {
    dateInput.value =
      getDefaultDateTime();
  }

  if (assetInput) {
    assetInput.value = "XAUUSD";
  }

  if (rrInput) {
    rrInput.value =
      activeCapital.defaultRR || 2;
  }

  if (resultInput) {
    resultInput.value = "TP";
  }

  const capitalName =
    document.getElementById(
      "trade-active-capital-name"
    );

  const capitalRisk =
    document.getElementById(
      "trade-active-capital-risk"
    );

  const capitalBalance =
    document.getElementById(
      "trade-active-capital-balance"
    );

  if (capitalName) {
    capitalName.textContent =
      activeCapital.name;
  }

  if (capitalRisk) {
    capitalRisk.textContent =
      formatMoney(
        getCapitalRisk(activeCapital)
      );
  }

  if (capitalBalance) {
    capitalBalance.textContent =
      formatMoney(
        getCapitalBalance(activeCapital)
      );
  }

  const beGroup =
    document.getElementById(
      "trade-be-group"
    );

  if (beGroup) {
    beGroup.style.display = "none";
  }

  openModal(tradeModal);

  updateTradeCalculations();
}

function calculateTradeValues() {
  const activeCapital = getActiveCapital();

  if (!activeCapital) {
    return {
      riskMoney: 0,
      slPips: 0,
      pipValuePerLot: 0,
      lot: 0,
      lotRaw: 0,
      riskAtStop: 0,
      riskDifference: 0,
      riskPercentOfCapital: 0,
      tp: 0,
      exitPrice: 0,
      realizedPips: 0,
      pnl: 0,
      r: 0,
    };
  }

  const asset =
    document.getElementById(
      "trade-asset"
    )?.value || "XAUUSD";

  const direction =
    document.getElementById(
      "trade-direction"
    )?.value || "BUY";

  const entry =
    safeNumber(
      document.getElementById(
        "trade-entry"
      )?.value
    );

  const sl =
    safeNumber(
      document.getElementById(
        "trade-sl"
      )?.value
    );

  const rr =
    safeNumber(
      document.getElementById(
        "trade-rr"
      )?.value,
      2
    );

  const result =
    document.getElementById(
      "trade-result"
    )?.value || "TP";

  const beExit =
    safeNumber(
      document.getElementById(
        "trade-be-exit"
      )?.value
    );

  const riskMoney =
    getCapitalRisk(activeCapital);

  const slPips =
    getPipDistance(
      asset,
      entry,
      sl
    );

  const pipValuePerLot =
    getActualPipValue(
      asset,
      entry
    );

  let lotRaw = 0;

  if (
    riskMoney > 0 &&
    slPips > 0 &&
    pipValuePerLot > 0
  ) {
    lotRaw =
      riskMoney /
      (slPips * pipValuePerLot);
  }

  const lot =
    normalizeLot(lotRaw);

  const riskAtStop =
    calculateRiskAtStop(
      lot,
      slPips,
      pipValuePerLot
    );

  const riskDifference =
    riskAtStop - riskMoney;

  const balance =
    getCapitalBalance(activeCapital);

  const riskPercentOfCapital =
    balance > 0
      ? (riskAtStop / balance) * 100
      : 0;

  let tp = 0;

  if (
    entry > 0 &&
    sl > 0 &&
    rr > 0
  ) {
    const distance =
      Math.abs(entry - sl);

    if (direction === "BUY") {
      tp =
        entry +
        distance * rr;
    } else {
      tp =
        entry -
        distance * rr;
    }
  }

  let exitPrice = 0;

  if (result === "TP") {
    exitPrice = tp;
  } else if (result === "SL") {
    exitPrice = sl;
  } else if (result === "BE") {
    exitPrice = beExit;
  }

  const realizedPips =
    getSignedPips(
      asset,
      direction,
      entry,
      exitPrice
    );

  const pnl =
    realizedPips *
    pipValuePerLot *
    lot;

  const r =
    riskMoney > 0
      ? pnl / riskMoney
      : 0;

  return {
    riskMoney,
    slPips,
    pipValuePerLot,
    lot,
    lotRaw,
    riskAtStop,
    riskDifference,
    riskPercentOfCapital,
    tp,
    exitPrice,
    realizedPips,
    pnl,
    r,
  };
}

function updateTradeCalculations() {
  const values =
    calculateTradeValues();

  const riskMoneyElement =
    document.getElementById(
      "trade-risk-money"
    );

  const slPipsElement =
    document.getElementById(
      "trade-sl-pips"
    );

  const lotElement =
    document.getElementById(
      "trade-lot"
    );

  const lotHidden =
    document.getElementById(
      "trade-lot-value"
    );

  const tpElement =
    document.getElementById(
      "trade-tp-display"
    );

  const tpHidden =
    document.getElementById(
      "trade-tp"
    );

  const exitElement =
    document.getElementById(
      "trade-exit-display"
    );

  const realizedPipsElement =
    document.getElementById(
      "trade-realized-pips"
    );

  const pnlElement =
    document.getElementById(
      "trade-pnl"
    );

  const rElement =
    document.getElementById(
      "trade-r"
    );

  const riskCheck =
    document.getElementById(
      "trade-risk-check"
    );

  if (riskMoneyElement) {
    riskMoneyElement.textContent =
      formatMoney(
        values.riskMoney
      );
  }

  if (slPipsElement) {
    slPipsElement.textContent =
      `${formatNumber(values.slPips, 1)} pips`;
  }

  if (lotElement) {
    lotElement.textContent =
      formatNumber(values.lot, 2);
  }

  if (lotHidden) {
    lotHidden.value =
      values.lot;
  }

  const asset =
    document.getElementById(
      "trade-asset"
    )?.value || "XAUUSD";

  if (tpElement) {
    tpElement.textContent =
      values.tp > 0
        ? formatPrice(
            asset,
            values.tp
          )
        : "—";
  }

  if (tpHidden) {
    tpHidden.value =
      values.tp || "";
  }

  if (exitElement) {
    exitElement.textContent =
      values.exitPrice > 0
        ? formatPrice(
            asset,
            values.exitPrice
          )
        : "—";
  }

  if (realizedPipsElement) {
    realizedPipsElement.textContent =
      `${values.realizedPips >= 0 ? "+" : ""}${formatNumber(
        values.realizedPips,
        1
      )} pips`;
  }

  if (pnlElement) {
    pnlElement.textContent =
      `${values.pnl >= 0 ? "+" : ""}${formatMoney(
        values.pnl
      )}`;
  }

  if (rElement) {
    rElement.textContent =
      `${values.r >= 0 ? "+" : ""}${formatNumber(
        values.r,
        2
      )} R`;
  }

  if (riskCheck) {
    const tolerance =
      Math.max(
        values.riskMoney * 0.01,
        0.01
      );

    const valid =
      values.riskAtStop <=
      values.riskMoney + tolerance;

    riskCheck.textContent =
      values.lot > 0
        ? valid
          ? "Risque respecté"
          : "Risque dépassé"
        : "En attente des données";

    riskCheck.classList.toggle(
      "positive",
      valid && values.lot > 0
    );

    riskCheck.classList.toggle(
      "negative",
      !valid && values.lot > 0
    );
  }

  const result =
    document.getElementById(
      "trade-result"
    )?.value || "TP";

  const beGroup =
    document.getElementById(
      "trade-be-group"
    );

  if (beGroup) {
    beGroup.style.display =
      result === "BE"
        ? ""
        : "none";
  }
}

[
  "trade-asset",
  "trade-direction",
  "trade-entry",
  "trade-sl",
  "trade-rr",
  "trade-result",
  "trade-be-exit",
].forEach((id) => {
  document
    .getElementById(id)
    ?.addEventListener(
      "input",
      updateTradeCalculations
    );

  document
    .getElementById(id)
    ?.addEventListener(
      "change",
      updateTradeCalculations
    );
});

/* =========================================================
   AJOUT TRADE
   ========================================================= */

tradeForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const activeCapital =
    getActiveCapital();

  if (!activeCapital) {
    alert(
      "Aucun capital actif."
    );
    return;
  }

  const asset =
    document.getElementById(
      "trade-asset"
    )?.value || "XAUUSD";

  const direction =
    document.getElementById(
      "trade-direction"
    )?.value || "BUY";

  const entry =
    safeNumber(
      document.getElementById(
        "trade-entry"
      )?.value
    );

  const sl =
    safeNumber(
      document.getElementById(
        "trade-sl"
      )?.value
    );

  const rr =
    safeNumber(
      document.getElementById(
        "trade-rr"
      )?.value,
      2
    );

  const result =
    document.getElementById(
      "trade-result"
    )?.value || "TP";

  const beExit =
    safeNumber(
      document.getElementById(
        "trade-be-exit"
      )?.value
    );

  if (entry <= 0 || sl <= 0) {
    alert(
      "Veuillez saisir un prix d'entrée et un Stop Loss valides."
    );
    return;
  }

  if (direction === "BUY" && sl >= entry) {
    alert(
      "Pour un BUY, le Stop Loss doit être inférieur à l'entrée."
    );
    return;
  }

  if (direction === "SELL" && sl <= entry) {
    alert(
      "Pour un SELL, le Stop Loss doit être supérieur à l'entrée."
    );
    return;
  }

  const values =
    calculateTradeValues();

  if (values.slPips <= 0) {
    alert(
      "La distance du Stop Loss doit être supérieure à 0."
    );
    return;
  }

  if (values.lot <= 0) {
    alert(
      "Le lot calculé est invalide. Vérifie le capital, le risque et le Stop Loss."
    );
    return;
  }

  const tolerance =
    Math.max(
      values.riskMoney * 0.01,
      0.01
    );

  if (
    values.riskAtStop >
    values.riskMoney + tolerance
  ) {
    alert(
      "Le risque réel dépasse le risque prévu."
    );
    return;
  }

  if (result === "BE" && beExit <= 0) {
    alert(
      "Veuillez saisir le prix de sortie pour le BE."
    );
    return;
  }

  if (
    (result === "TP" || result === "SL") &&
    values.exitPrice <= 0
  ) {
    alert(
      "Le prix de sortie est invalide."
    );
    return;
  }

  const trade = {
    id: createId("trade"),

    capitalId: activeCapital.id,

    capitalName: activeCapital.name,

    date:
      document.getElementById(
        "trade-date"
      )?.value ||
      getDefaultDateTime(),

    asset,

    direction,

    session:
      document.getElementById(
        "trade-session"
      )?.value || "",

    timeframe:
      document.getElementById(
        "trade-timeframe"
      )?.value || "",

    setup:
      document.getElementById(
        "trade-setup"
      )?.value || "",

    entry,

    sl,

    rr,

    tp: values.tp,

    lot: values.lot,

    lotRaw: values.lotRaw,

    riskMoney: values.riskMoney,

    riskAtStop: values.riskAtStop,

    slPips: values.slPips,

    pipValuePerLot:
      values.pipValuePerLot,

    result,

    exitPrice:
      values.exitPrice,

    realizedPips:
      values.realizedPips,

    pnl:
      values.pnl,

    r:
      values.r,

    entryReason:
      document.getElementById(
        "trade-entry-reason"
      )?.value || "",

    notes:
      document.getElementById(
        "trade-notes"
      )?.value || "",

    createdAt:
      new Date().toISOString(),
  };

  trades.push(trade);

  const saved =
    saveJSON(
      STORAGE_KEYS.trades,
      trades
    );

  if (!saved) {
    alert(
      "Impossible d'enregistrer le trade dans le navigateur."
    );
    return;
  }

  saveMetadata();

  tradeForm.reset();

  closeModal(tradeModal);

  updateAll();

  showPage("journal");
});

/* =========================================================
   SUPPRESSION TRADE
   ========================================================= */

function deleteTrade(id) {
  const trade =
    trades.find(
      (item) => item.id === id
    );

  if (!trade) {
    return;
  }

  const confirmed = confirm(
    `Supprimer le trade du ${formatDate(
      trade.date
    )} ?`
  );

  if (!confirmed) {
    return;
  }

  trades =
    trades.filter(
      (item) => item.id !== id
    );

  saveJSON(
    STORAGE_KEYS.trades,
    trades
  );

  saveMetadata();

  updateAll();
}

window.deleteTrade = deleteTrade;

/* =========================================================
   JOURNAL
   ========================================================= */

function getFilteredJournalTrades() {
  const filter =
    document.getElementById(
      "journal-capital-filter"
    )?.value || "active";

  const active =
    getActiveCapital();

  if (filter === "active") {
    if (!active) {
      return [];
    }

    return trades.filter(
      (trade) =>
        trade.capitalId === active.id
    );
  }

  return [...trades];
}

function createJournalRow(trade) {
  try {
    const capital =
      getCapitalById(
        trade.capitalId
      );

    const capitalName =
      capital?.name ||
      trade.capitalName ||
      "Capital inconnu";

    const pnl =
      safeNumber(trade.pnl);

    const r =
      safeNumber(trade.r);

    const realizedPips =
      safeNumber(
        trade.realizedPips
      );

    const result =
      safeString(
        trade.result,
        "—"
      ).toUpperCase();

    const resultClass =
      result === "TP"
        ? "result-win"
        : result === "SL"
        ? "result-loss"
        : result === "BE"
        ? "result-be"
        : "";

    const pnlClass =
      pnl > 0
        ? "positive"
        : pnl < 0
        ? "negative"
        : "";

    const direction =
      safeString(
        trade.direction,
        "—"
      ).toUpperCase();

    const directionClass =
      direction === "BUY"
        ? "positive"
        : direction === "SELL"
        ? "negative"
        : "";

    const asset =
      safeString(
        trade.asset,
        "XAUUSD"
      );

    return `
      <tr>
        <td>
          ${escapeHTML(
            formatDateTime(
              trade.date
            )
          )}
        </td>

        <td>
          <strong>
            ${escapeHTML(
              capitalName
            )}
          </strong>
        </td>

        <td>
          ${escapeHTML(asset)}
        </td>

        <td class="${directionClass}">
          ${escapeHTML(direction)}
        </td>

        <td>
          ${formatPrice(
            asset,
            trade.entry
          )}
        </td>

        <td>
          ${formatPrice(
            asset,
            trade.sl
          )}
        </td>

        <td>
          ${formatPrice(
            asset,
            trade.tp
          )}
        </td>

        <td>
          ${formatNumber(
            trade.lot,
            2
          )}
        </td>

        <td>
          RR ${formatNumber(
            trade.rr,
            1
          )}
        </td>

        <td>
          <span class="${resultClass}">
            ${escapeHTML(result)}
          </span>
        </td>

        <td>
          ${
            realizedPips >= 0
              ? "+"
              : ""
          }${formatNumber(
            realizedPips,
            1
          )}
        </td>

        <td class="${pnlClass}">
          ${
            pnl >= 0
              ? "+"
              : ""
          }${formatMoney(pnl)}
        </td>

        <td class="${pnlClass}">
          ${
            r >= 0
              ? "+"
              : ""
          }${formatNumber(r, 2)} R
        </td>

        <td>
          <button
            type="button"
            class="icon-btn danger"
            title="Supprimer"
            onclick="deleteTrade('${escapeHTML(
              trade.id
            )}')"
          >
            ×
          </button>
        </td>
      </tr>
    `;
  } catch (error) {
    console.error(
      "Erreur affichage trade :",
      trade,
      error
    );

    return `
      <tr>
        <td colspan="14">
          Impossible d'afficher ce trade.
        </td>
      </tr>
    `;
  }
}

function renderJournal() {
  const tbody =
    document.getElementById(
      "journal-trades"
    );

  if (!tbody) {
    console.warn(
      "Élément #journal-trades introuvable."
    );
    return;
  }

  const noCapital =
    document.getElementById(
      "journal-no-capital"
    );

  const summary =
    document.getElementById(
      "journal-summary"
    );

  const active =
    getActiveCapital();

  if (noCapital) {
    noCapital.style.display =
      active
        ? "none"
        : "";
  }

  const filteredTrades =
    getFilteredJournalTrades();

  if (summary) {
    summary.textContent =
      `${filteredTrades.length} ${
        filteredTrades.length > 1
          ? "trades"
          : "trade"
      }`;
  }

  /*
   * IMPORTANT :
   * On trie une COPIE pour ne jamais modifier
   * l'ordre réel des trades dans localStorage.
   */
  const sortedTrades =
    [...filteredTrades].sort(
      (a, b) => {
        const dateA =
          new Date(
            a.date ||
              a.createdAt ||
              0
          ).getTime();

        const dateB =
          new Date(
            b.date ||
              b.createdAt ||
              0
          ).getTime();

        return (
          (Number.isFinite(dateB)
            ? dateB
            : 0) -
          (Number.isFinite(dateA)
            ? dateA
            : 0)
        );
      }
    );

  if (!sortedTrades.length) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="14"
          class="empty"
        >
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;
  }

  /*
   * Chaque trade est transformé individuellement.
   * Ainsi, un trade mal formé ne bloque plus
   * l'affichage de tout l'historique.
   */
  tbody.innerHTML =
    sortedTrades
      .map(
        (trade) =>
          createJournalRow(trade)
      )
      .join("");

  /*
   * Sécurité supplémentaire :
   * si le navigateur n'a pas rendu les lignes,
   * on vérifie immédiatement le nombre de lignes.
   */
  if (
    tbody.querySelectorAll("tr")
      .length === 0
  ) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="14"
          class="empty"
        >
          Les trades existent mais n'ont pas pu être affichés.
        </td>
      </tr>
    `;
  }
}

document
  .getElementById(
    "journal-capital-filter"
  )
  ?.addEventListener(
    "change",
    renderJournal
  );

/* =========================================================
   RECENTS TRADES
   ========================================================= */

function renderRecentTrades() {
  const tbody =
    document.getElementById(
      "recent-trades"
    );

  if (!tbody) {
    return;
  }

  const active =
    getActiveCapital();

  if (!active) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty"
        >
          Aucun capital actif.
        </td>
      </tr>
    `;

    return;
  }

  const recentTrades =
    trades
      .filter(
        (trade) =>
          trade.capitalId ===
          active.id
      )
      .sort(
        (a, b) =>
          new Date(
            b.date ||
              b.createdAt ||
              0
          ).getTime() -
          new Date(
            a.date ||
              a.createdAt ||
              0
          ).getTime()
      )
      .slice(0, 5);

  if (!recentTrades.length) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty"
        >
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    recentTrades
      .map((trade) => {
        const pnl =
          safeNumber(trade.pnl);

        const result =
          safeString(
            trade.result,
            "—"
          ).toUpperCase();

        return `
          <tr>
            <td>
              ${escapeHTML(
                formatDate(
                  trade.date
                )
              )}
            </td>

            <td>
              ${escapeHTML(
                trade.asset
              )}
            </td>

            <td>
              ${escapeHTML(
                trade.direction
              )}
            </td>

            <td>
              ${escapeHTML(
                result
              )}
            </td>

            <td>
              ${formatNumber(
                trade.r,
                2
              )} R
            </td>

            <td class="${
              pnl >= 0
                ? "positive"
                : "negative"
            }">
              ${
                pnl >= 0
                  ? "+"
                  : ""
              }${formatMoney(pnl)}
            </td>

            <td>
              ${formatNumber(
                trade.lot,
                2
              )}
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   STATISTIQUES
   ========================================================= */

function calculateStatistics(
  tradeList,
  startingCapital = 0
) {
  const list =
    Array.isArray(tradeList)
      ? tradeList
      : [];

  const totalTrades =
    list.length;

  const wins =
    list.filter(
      (trade) =>
        trade.result === "TP"
    ).length;

  const losses =
    list.filter(
      (trade) =>
        trade.result === "SL"
    ).length;

  const breakevens =
    list.filter(
      (trade) =>
        trade.result === "BE"
    ).length;

  const totalPnl =
    list.reduce(
      (sum, trade) =>
        sum + safeNumber(trade.pnl),
      0
    );

  const currentCapital =
    safeNumber(startingCapital) +
    totalPnl;

  const decisiveTrades =
    wins + losses;

  const winRate =
    decisiveTrades > 0
      ? (wins / decisiveTrades) * 100
      : 0;

  const grossProfit =
    list
      .filter(
        (trade) =>
          safeNumber(trade.pnl) > 0
      )
      .reduce(
        (sum, trade) =>
          sum + safeNumber(trade.pnl),
        0
      );

  const grossLoss =
    Math.abs(
      list
        .filter(
          (trade) =>
            safeNumber(trade.pnl) < 0
        )
        .reduce(
          (sum, trade) =>
            sum + safeNumber(trade.pnl),
          0
        )
    );

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
      ? Infinity
      : 0;

  const avgR =
    totalTrades > 0
      ? list.reduce(
          (sum, trade) =>
            sum + safeNumber(trade.r),
          0
        ) / totalTrades
      : 0;

  const winsList =
    list.filter(
      (trade) =>
        safeNumber(trade.pnl) > 0
    );

  const lossesList =
    list.filter(
      (trade) =>
        safeNumber(trade.pnl) < 0
    );

  const avgWin =
    winsList.length > 0
      ? winsList.reduce(
          (sum, trade) =>
            sum + safeNumber(trade.pnl),
          0
        ) / winsList.length
      : 0;

  const avgLoss =
    lossesList.length > 0
      ? lossesList.reduce(
          (sum, trade) =>
            sum + safeNumber(trade.pnl),
          0
        ) / lossesList.length
      : 0;

  return {
    totalTrades,
    wins,
    losses,
    breakevens,
    totalPnl,
    currentCapital,
    winRate,
    grossProfit,
    grossLoss,
    profitFactor,
    avgR,
    avgWin,
    avgLoss,
  };
}

function calculateCapitalStatistics(
  capital
) {
  if (!capital) {
    return calculateStatistics([], 0);
  }

  return calculateStatistics(
    getCapitalTrades(capital.id),
    capital.initialCapital
  );
}

function calculateGlobalStatistics() {
  const stats =
    calculateStatistics(
      trades,
      0
    );

  return {
    ...stats,
    totalPnl:
      trades.reduce(
        (sum, trade) =>
          sum + safeNumber(trade.pnl),
        0
      ),
    currentCapital:
      stats.totalPnl,
  };
}

/* =========================================================
   DRAWNDOWN
   ========================================================= */

function calculateMaxDrawdown(
  tradeList,
  startingCapital
) {
  const sorted =
    [...tradeList].sort(
      (a, b) =>
        new Date(
          a.date ||
            a.createdAt ||
            0
        ).getTime() -
        new Date(
          b.date ||
            b.createdAt ||
            0
        ).getTime()
    );

  let equity =
    safeNumber(startingCapital);

  let peak = equity;

  let maxDrawdown = 0;

  sorted.forEach((trade) => {
    equity += safeNumber(
      trade.pnl
    );

    if (equity > peak) {
      peak = equity;
    }

    const drawdown =
      peak > 0
        ? ((peak - equity) /
            peak) *
          100
        : 0;

    maxDrawdown =
      Math.max(
        maxDrawdown,
        drawdown
      );
  });

  return maxDrawdown;
}

/* =========================================================
   STREAKS
   ========================================================= */

function calculateStreaks(
  tradeList
) {
  const sorted =
    [...tradeList].sort(
      (a, b) =>
        new Date(
          a.date ||
            a.createdAt ||
            0
        ).getTime() -
        new Date(
          b.date ||
            b.createdAt ||
            0
        ).getTime()
    );

  let currentWin = 0;
  let currentLoss = 0;

  let maxWin = 0;
  let maxLoss = 0;

  sorted.forEach((trade) => {
    const pnl =
      safeNumber(trade.pnl);

    if (pnl > 0) {
      currentWin += 1;
      currentLoss = 0;

      maxWin =
        Math.max(
          maxWin,
          currentWin
        );
    } else if (pnl < 0) {
      currentLoss += 1;
      currentWin = 0;

      maxLoss =
        Math.max(
          maxLoss,
          currentLoss
        );
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  });

  return {
    maxWin,
    maxLoss,
    currentWin,
    currentLoss,
  };
}

/* =========================================================
   EQUITY CURVE
   ========================================================= */

function renderEquityChart(
  tradeList,
  startingCapital
) {
  const container =
    document.getElementById(
      "equity-chart"
    );

  if (!container) {
    return;
  }

  const sorted =
    [...tradeList].sort(
      (a, b) =>
        new Date(
          a.date ||
            a.createdAt ||
            0
        ).getTime() -
        new Date(
          b.date ||
            b.createdAt ||
            0
        ).getTime()
    );

  if (!sorted.length) {
    container.innerHTML = `
      <div class="empty">
        Aucun trade pour afficher la courbe d'équité.
      </div>
    `;

    return;
  }

  let equity =
    safeNumber(startingCapital);

  const points = [
    {
      date: "Départ",
      value: equity,
    },
  ];

  sorted.forEach((trade) => {
    equity += safeNumber(
      trade.pnl
    );

    points.push({
      date: formatDate(
        trade.date ||
          trade.createdAt
      ),
      value: equity,
    });
  });

  const values =
    points.map(
      (point) => point.value
    );

  const min =
    Math.min(...values);

  const max =
    Math.max(...values);

  const range =
    max - min || 1;

  const width = 900;
  const height = 300;

  const padding = 30;

  const usableWidth =
    width - padding * 2;

  const usableHeight =
    height - padding * 2;

  const coordinates =
    points.map(
      (point, index) => {
        const x =
          padding +
          (index /
            Math.max(
              points.length - 1,
              1
            )) *
            usableWidth;

        const y =
          padding +
          (1 -
            (point.value - min) /
              range) *
            usableHeight;

        return {
          ...point,
          x,
          y,
        };
      }
    );

  const polyline =
    coordinates
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  container.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label="Courbe d'équité"
    >
      <polyline
        points="${polyline}"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        vector-effect="non-scaling-stroke"
      />

      ${coordinates
        .map(
          (point) => `
            <circle
              cx="${point.x}"
              cy="${point.y}"
              r="4"
              fill="currentColor"
            >
              <title>
                ${escapeHTML(
                  point.date
                )} — ${formatMoney(
                  point.value
                )}
              </title>
            </circle>
          `
        )
        .join("")}
    </svg>
  `;
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const noCapital =
    document.getElementById(
      "dashboard-no-capital"
    );

  const content =
    document.getElementById(
      "dashboard-content"
    );

  const active =
    getActiveCapital();

  if (!active) {
    if (noCapital) {
      noCapital.style.display = "";
    }

    if (content) {
      content.style.display = "none";
    }

    return;
  }

  if (noCapital) {
    noCapital.style.display = "none";
  }

  if (content) {
    content.style.display = "";
  }

  const filter =
    document.getElementById(
      "dashboard-capital-filter"
    )?.value || "active";

  const activeStats =
    calculateCapitalStatistics(
      active
    );

  const globalStats =
    calculateGlobalStatistics();

  const stats =
    filter === "all"
      ? globalStats
      : activeStats;

  /*
   * IMPORTANT :
   * Le solde actuel du Dashboard représente
   * TOUJOURS le capital actif.
   *
   * Même si le filtre est "Tous les capitaux",
   * on ne mélange jamais les soldes des capitaux.
   */
  const currentActiveBalance =
    getCapitalBalance(active);

  const dashboardCapital =
    document.getElementById(
      "dashboard-capital"
    );

  const dashboardStart =
    document.getElementById(
      "dashboard-start-capital"
    );

  const dashboardPnl =
    document.getElementById(
      "dashboard-pnl"
    );

  const dashboardPnlPercent =
    document.getElementById(
      "dashboard-pnl-percent"
    );

  const dashboardWinrate =
    document.getElementById(
      "dashboard-winrate"
    );

  const dashboardWL =
    document.getElementById(
      "dashboard-wl"
    );

  const dashboardTrades =
    document.getElementById(
      "dashboard-trades"
    );

  const dashboardPF =
    document.getElementById(
      "dashboard-profit-factor"
    );

  const dashboardAvgR =
    document.getElementById(
      "dashboard-avg-r"
    );

  const dashboardDrawdown =
    document.getElementById(
      "dashboard-drawdown"
    );

  const dashboardStreak =
    document.getElementById(
      "dashboard-streak"
    );

  const dashboardStreakLabel =
    document.getElementById(
      "dashboard-streak-label"
    );

  if (dashboardCapital) {
    dashboardCapital.textContent =
      formatMoney(
        currentActiveBalance
      );
  }

  if (dashboardStart) {
    dashboardStart.textContent =
      formatMoney(
        active.initialCapital
      );
  }

  if (dashboardPnl) {
    dashboardPnl.textContent =
      `${stats.totalPnl >= 0 ? "+" : ""}${formatMoney(
        stats.totalPnl
      )}`;
  }

  if (dashboardPnlPercent) {
    const baseCapital =
      filter === "all"
        ? 0
        : active.initialCapital;

    const percent =
      baseCapital > 0
        ? (stats.totalPnl /
            baseCapital) *
          100
        : 0;

    dashboardPnlPercent.textContent =
      baseCapital > 0
        ? formatPercent(percent)
        : "Performance globale";
  }

  if (dashboardWinrate) {
    dashboardWinrate.textContent =
      formatPercent(
        stats.winRate
      );
  }

  if (dashboardWL) {
    dashboardWL.textContent =
      `${stats.wins} W / ${stats.losses} L / ${stats.breakevens} BE`;
  }

  if (dashboardTrades) {
    dashboardTrades.textContent =
      stats.totalTrades;
  }

  if (dashboardPF) {
    dashboardPF.textContent =
      Number.isFinite(
        stats.profitFactor
      )
        ? formatNumber(
            stats.profitFactor,
            2
          )
        : "∞";
  }

  if (dashboardAvgR) {
    dashboardAvgR.textContent =
      `${stats.avgR >= 0 ? "+" : ""}${formatNumber(
        stats.avgR,
        2
      )} R`;
  }

  const tradeList =
    filter === "all"
      ? trades
      : getCapitalTrades(
          active.id
        );

  const startingCapital =
    filter === "all"
      ? 0
      : active.initialCapital;

  const drawdown =
    calculateMaxDrawdown(
      tradeList,
      startingCapital
    );

  if (dashboardDrawdown) {
    dashboardDrawdown.textContent =
      formatPercent(drawdown);
  }

  const streaks =
    calculateStreaks(
      tradeList
    );

  if (dashboardStreak) {
    dashboardStreak.textContent =
      Math.max(
        streaks.maxWin,
        streaks.maxLoss
      );
  }

  if (dashboardStreakLabel) {
    if (
      streaks.maxWin >=
      streaks.maxLoss
    ) {
      dashboardStreakLabel.textContent =
        "Meilleure série gagnante";
    } else {
      dashboardStreakLabel.textContent =
        "Plus longue série perdante";
    }
  }

  const equityDescription =
    document.getElementById(
      "equity-description"
    );

  if (equityDescription) {
    equityDescription.textContent =
      filter === "all"
        ? "Évolution cumulée de la performance de tous les capitaux."
        : `Évolution du capital actif : ${active.name}.`;
  }

  renderEquityChart(
    tradeList,
    startingCapital
  );

  /*
   * PERFORMANCE GLOBALE
   */

  const globalPnl =
    document.getElementById(
      "global-pnl"
    );

  const globalTrades =
    document.getElementById(
      "global-trades"
    );

  const globalWinrate =
    document.getElementById(
      "global-winrate"
    );

  const globalCapitals =
    document.getElementById(
      "global-capitals"
    );

  if (globalPnl) {
    globalPnl.textContent =
      `${globalStats.totalPnl >= 0 ? "+" : ""}${formatMoney(
        globalStats.totalPnl
      )}`;
  }

  if (globalTrades) {
    globalTrades.textContent =
      globalStats.totalTrades;
  }

  if (globalWinrate) {
    globalWinrate.textContent =
      formatPercent(
        globalStats.winRate
      );
  }

  if (globalCapitals) {
    globalCapitals.textContent =
      capitals.length;
  }

  renderRecentTrades();
}

document
  .getElementById(
    "dashboard-capital-filter"
  )
  ?.addEventListener(
    "change",
    renderDashboard
  );

/* =========================================================
   PLAN DE TRADING
   ========================================================= */

const PLAN_CHECKS = [
  "fundamental",
  "usdBias",
  "h4",
  "h4Trend",
  "phase",
  "m15",
  "m15Structure",
  "zone",
  "validZone",
  "zoneContext",
  "returnZone",
  "reaction",
  "m1",
  "shift",
  "fvg",
  "entry",
  "risk",
  "lot",
  "sl",
  "tp",
  "rr",
  "noFomo",
  "noSlMove",
  "fullPlan",
];

function getPlanCheckboxes() {
  return Array.from(
    document.querySelectorAll(
      "[data-plan-check]"
    )
  );
}

function getPlanState() {
  const state = {};

  getPlanCheckboxes().forEach(
    (checkbox) => {
      const key =
        checkbox.dataset.planCheck;

      if (key) {
        state[key] =
          checkbox.checked;
      }
    }
  );

  return state;
}

function renderPlanChecklist() {
  const savedPlan =
    loadPlan();

  const checkboxes =
    getPlanCheckboxes();

  checkboxes.forEach(
    (checkbox) => {
      const key =
        checkbox.dataset.planCheck;

      checkbox.checked =
        Boolean(
          savedPlan[key]
        );
    }
  );

  updatePlanPermission();
}

function updatePlanPermission() {
  const checkboxes =
    getPlanCheckboxes();

  const checked =
    checkboxes.filter(
      (checkbox) =>
        checkbox.checked
    ).length;

  const total =
    checkboxes.length ||
    PLAN_CHECKS.length;

  const progress =
    document.getElementById(
      "plan-checklist-progress"
    );

  const permission =
    document.getElementById(
      "trade-permission"
    );

  const permissionTitle =
    document.getElementById(
      "trade-permission-title"
    );

  const permissionDescription =
    document.getElementById(
      "trade-permission-description"
    );

  const allowed =
    total > 0 &&
    checked === total;

  if (progress) {
    progress.textContent =
      `${checked}/${total}`;
  }

  if (permission) {
    permission.classList.toggle(
      "allowed",
      allowed
    );

    permission.classList.toggle(
      "authorized",
      allowed
    );
  }

  if (permissionTitle) {
    permissionTitle.textContent =
      allowed
        ? "PRISE AUTORISÉE"
        : "PRISE NON AUTORISÉE";
  }

  if (permissionDescription) {
    permissionDescription.textContent =
      allowed
        ? "Toutes les conditions du plan sont validées."
        : `Il reste ${
            total - checked
          } condition(s) à valider.`;
  }
}

getPlanCheckboxes().forEach(
  (checkbox) => {
    checkbox.addEventListener(
      "change",
      updatePlanPermission
    );
  }
);

document
  .getElementById(
    "save-plan"
  )
  ?.addEventListener(
    "click",
    () => {
      savePlan(
        getPlanState()
      );

      updatePlanPermission();

      alert(
        "Plan de trading enregistré."
      );
    }
  );

document
  .getElementById(
    "reset-plan-checklist"
  )
  ?.addEventListener(
    "click",
    () => {
      const confirmed =
        confirm(
          "Réinitialiser toutes les conditions du plan ?"
        );

      if (!confirmed) {
        return;
      }

      getPlanCheckboxes().forEach(
        (checkbox) => {
          checkbox.checked = false;
        }
      );

      savePlan(
        getPlanState()
      );

      updatePlanPermission();
    }
  );

/* =========================================================
   UPDATE GLOBAL
   ========================================================= */

function updateAll() {
  refreshDataFromStorage();

  ensureSingleActiveCapital();
  ensureActiveCapitalExists();

  renderCapitals();
  renderJournal();
  renderRecentTrades();
  renderDashboard();
  renderPlanChecklist();

  updateTradeCalculations();

  if (currentDateElement) {
    currentDateElement.textContent =
      new Date().toLocaleDateString(
        "fr-FR",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
  }
}

/* =========================================================
   API POUR FUTURES VERSIONS / PWA / ANDROID / PC
   ========================================================= */

window.TradingPlanApp = {
  refresh() {
    updateAll();
  },

  showPage(page) {
    showPage(page);
  },

  getState() {
    return {
      version: APP_VERSION,
      trades: [...trades],
      capitals: [...capitals],
      plan: loadPlan(),
    };
  },

  exportData() {
    return JSON.stringify(
      {
        version: APP_VERSION,
        exportedAt:
          new Date().toISOString(),
        trades,
        capitals,
        plan: loadPlan(),
      },
      null,
      2
    );
  },
};

/* =========================================================
   INITIALISATION
   ========================================================= */

function initializeApplication() {
  refreshDataFromStorage();

  ensureSingleActiveCapital();
  ensureActiveCapitalExists();

  saveMetadata();

  const tradeDate =
    document.getElementById(
      "trade-date"
    );

  if (
    tradeDate &&
    !tradeDate.value
  ) {
    tradeDate.value =
      getDefaultDateTime();
  }

  updateAll();

  showPage("dashboard");
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
  );
} else {
  initializeApplication();
}
