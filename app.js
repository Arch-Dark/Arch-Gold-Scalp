"use strict";

/*
  ==========================================================
  TRADING PLAN - APPLICATION V3
  ==========================================================

  VERSION APP-READY

  Cette version conserve le fonctionnement actuel de
  l'application tout en préparant le projet pour :

  - PWA
  - Android
  - PC
  - Export / import des données
  - Évolution du stockage
  - Meilleure gestion mobile
  - Meilleure robustesse des données

  ==========================================================

  CALCUL DU RISQUE / LOT

  Risque du capital
        ↓
  Distance Entrée → SL
        ↓
  Distance en pips
        ↓
  Valeur du pip pour 1 lot
        ↓
  Taille du lot automatique

  FORMULE :

  Lot brut =
    Risque monétaire /
    (SL en pips × valeur du pip pour 1 lot)

  ==========================================================

  GOLD - XAUUSD

  1 lot    = 100 oz = $1.00 / pip
  0.10 lot = 10 oz  = $0.10 / pip
  0.01 lot = 1 oz   = $0.01 / pip

  BUY  = (Sortie - Entrée) × 100
  SELL = (Entrée - Sortie) × 100

  ==========================================================

  FOREX NON-JPY

  EURUSD
  USDCAD
  NZDUSD
  AUDUSD
  GBPUSD
  USDCHF

  BUY  = (Sortie - Entrée) × 10000
  SELL = (Entrée - Sortie) × 10000

  ==========================================================

  FOREX JPY

  USDJPY

  BUY  = (Sortie - Entrée) × 100
  SELL = (Entrée - Sortie) × 100

  ==========================================================
*/


/* =========================================================
   APPLICATION CONFIGURATION
========================================================= */

const APP_CONFIG = {

  version: "3.0.0",

  dataVersion: 1,

  currency: "USD",

  locale: "fr-FR",

  lotStep: 0.01,

  maxRiskToleranceRatio: 0.000001,

  minRiskTolerance: 0.01,

  chartHeight: 220

};


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {

  trades: "trading-plan-trades",

  capitals: "trading-plan-capitals",

  plan: "trading-plan-settings",

  metadata: "trading-plan-metadata"

};


function safeParseJSON(value, fallback) {

  if (!value) {

    return fallback;

  }


  try {

    return JSON.parse(value);

  } catch {

    return fallback;

  }

}


function loadJSON(
  key,
  fallback = []
) {

  try {

    const value =
      localStorage.getItem(
        key
      );


    const parsed =
      safeParseJSON(
        value,
        fallback
      );


    return parsed ?? fallback;

  } catch {

    return fallback;

  }

}


function saveJSON(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;

  } catch (error) {

    console.error(
      "Impossible de sauvegarder les données :",
      error
    );

    alert(
      "Impossible de sauvegarder les données sur cet appareil."
    );

    return false;

  }

}


function initializeStorageMetadata() {

  const metadata =
    loadJSON(
      STORAGE_KEYS.metadata,
      {}
    );


  const updatedMetadata = {

    ...metadata,

    appVersion:
      APP_CONFIG.version,

    dataVersion:
      APP_CONFIG.dataVersion,

    lastOpenedAt:
      new Date().toISOString()

  };


  saveJSON(
    STORAGE_KEYS.metadata,
    updatedMetadata
  );

}


let trades =
  loadJSON(
    STORAGE_KEYS.trades,
    []
  );


let capitals =
  loadJSON(
    STORAGE_KEYS.capitals,
    []
  );


function loadPlan() {

  return loadJSON(
    STORAGE_KEYS.plan,
    {}
  );

}


function savePlan(plan) {

  return saveJSON(
    STORAGE_KEYS.plan,
    plan
  );

}


/* =========================================================
   DOM
========================================================= */

const pages =
  document.querySelectorAll(
    ".page"
  );


const navButtons =
  document.querySelectorAll(
    ".nav-button"
  );


const pageTitle =
  document.getElementById(
    "page-title"
  );


const pageDescription =
  document.getElementById(
    "page-description"
  );


const tradeModal =
  document.getElementById(
    "trade-modal"
  );


const tradeForm =
  document.getElementById(
    "trade-form"
  );


const capitalModal =
  document.getElementById(
    "capital-modal"
  );


const capitalForm =
  document.getElementById(
    "capital-form"
  );


/* =========================================================
   UTILITY
========================================================= */

function isFiniteNumber(value) {

  return Number.isFinite(
    Number(value)
  );

}


function positiveNumber(value) {

  const number =
    Number(value);


  return Number.isFinite(number) &&
    number > 0
    ? number
    : 0;

}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );

}


/* =========================================================
   FORMATTERS
========================================================= */

function formatMoney(value) {

  const number =
    Number(value);


  const safeNumber =
    Number.isFinite(number)
      ? number
      : 0;


  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: APP_CONFIG.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(
    safeNumber
  );

}


function formatPercent(value) {

  const number =
    Number(value);


  const safeNumber =
    Number.isFinite(number)
      ? number
      : 0;


  return `${safeNumber.toFixed(
    2
  )}%`;

}


function formatNumber(
  value,
  decimals = 2
) {

  const number =
    Number(value);


  const safeNumber =
    Number.isFinite(number)
      ? number
      : 0;


  return safeNumber.toFixed(
    decimals
  );

}


function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function formatDate(dateString) {

  if (!dateString) {

    return "—";

  }


  const date =
    new Date(
      dateString
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "—";

  }


  return date.toLocaleDateString(
    APP_CONFIG.locale,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );

}


function getDefaultDateTime() {

  const now =
    new Date();


  const offset =
    now.getTimezoneOffset() *
    60000;


  return new Date(
    now.getTime() -
    offset
  )
    .toISOString()
    .slice(
      0,
      16
    );

}


function createId(
  prefix = ""
) {

  return (
    prefix +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );

}


/* =========================================================
   MODAL / BODY UX
========================================================= */

let openModalCount = 0;


function lockBodyScroll() {

  openModalCount++;


  if (
    openModalCount === 1
  ) {

    document.body.classList.add(
      "modal-open"
    );

  }

}


function unlockBodyScroll() {

  openModalCount =
    Math.max(
      0,
      openModalCount - 1
    );


  if (
    openModalCount === 0
  ) {

    document.body.classList.remove(
      "modal-open"
    );

  }

}


function openModalElement(
  modal
) {

  if (!modal) {

    return;

  }


  modal.classList.add(
    "active"
  );


  lockBodyScroll();

}


function closeModalElement(
  modal
) {

  if (!modal) {

    return;

  }


  if (
    modal.classList.contains(
      "active"
    )
  ) {

    modal.classList.remove(
      "active"
    );

    unlockBodyScroll();

  }

}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

const pageInformation = {

  dashboard: {

    title: "Dashboard",

    description:
      "Vue générale de ta performance."

  },


  journal: {

    title: "Journal",

    description:
      "Enregistre et analyse chaque opération."

  },


  capitals: {

    title: "Capitaux",

    description:
      "Gère tes capitaux actifs et archivés."

  },


  plan: {

    title: "Plan de trading",

    description:
      "Définis les règles que tu dois respecter."

  }

};


function showPage(
  pageName
) {

  pages.forEach(
    page => {

      page.classList.remove(
        "active"
      );

    }
  );


  navButtons.forEach(
    button => {

      button.classList.remove(
        "active"
      );

    }
  );


  const page =
    document.getElementById(
      `page-${pageName}`
    );


  const button =
    document.querySelector(
      `.nav-button[data-page="${pageName}"]`
    );


  if (page) {

    page.classList.add(
      "active"
    );

  }


  if (button) {

    button.classList.add(
      "active"
    );

  }


  if (
    pageInformation[pageName]
  ) {

    if (pageTitle) {

      pageTitle.textContent =
        pageInformation[
          pageName
        ].title;

    }


    if (pageDescription) {

      pageDescription.textContent =
        pageInformation[
          pageName
        ].description;

    }

  }


  window.scrollTo({
    top: 0,
    behavior: "auto"
  });

}


navButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        showPage(
          button.dataset.page
        );

      }
    );

  }
);


document
  .querySelectorAll(
    "[data-page-button]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          showPage(
            button.dataset.pageButton
          );

        }
      );

    }
  );


/* =========================================================
   CAPITAL MANAGEMENT
========================================================= */

function getActiveCapital() {

  return (
    capitals.find(
      capital =>
        capital.status === "active"
    ) || null
  );

}


function getCapitalById(
  id
) {

  return (
    capitals.find(
      capital =>
        capital.id === id
    ) || null
  );

}


function getCapitalBalance(
  capital
) {

  if (!capital) {

    return 0;

  }


  const capitalTrades =
    trades
      .filter(
        trade =>
          trade.capitalId ===
          capital.id
      )
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );


  return (
    Number(
      capital.initialCapital
    ) +
    capitalTrades.reduce(
      (
        sum,
        trade
      ) =>
        sum +
        Number(
          trade.pnl || 0
        ),
      0
    )
  );

}


/*
  Risque monétaire actuel du capital.

  Percentage :

    Balance actuelle × risque %

  Fixed :

    montant fixe
*/

function getCapitalRisk(
  capital
) {

  if (!capital) {

    return 0;

  }


  const balance =
    getCapitalBalance(
      capital
    );


  if (
    capital.riskMode ===
    "fixed"
  ) {

    return Math.max(
      0,
      Number(
        capital.riskAmount
      ) || 0
    );

  }


  return Math.max(
    0,
    balance *
      (
        Number(
          capital.riskPercent
        ) || 0
      ) /
      100
  );

}


function getCapitalRiskPercent(
  capital
) {

  if (!capital) {

    return 0;

  }


  if (
    capital.riskMode ===
    "percentage"
  ) {

    return (
      Number(
        capital.riskPercent
      ) || 0
    );

  }


  const balance =
    getCapitalBalance(
      capital
    );


  if (
    balance <= 0
  ) {

    return 0;

  }


  return (
    Number(
      capital.riskAmount || 0
    ) /
    balance
  ) *
  100;

}


/*
  Garantit qu'un seul capital soit actif.

  Si plusieurs capitaux sont accidentellement actifs,
  le premier reste actif et les autres sont archivés.
*/

function ensureSingleActiveCapital() {

  const active =
    capitals.filter(
      capital =>
        capital.status ===
        "active"
    );


  if (
    active.length <= 1
  ) {

    return;

  }


  active
    .slice(1)
    .forEach(
      capital => {

        capital.status =
          "archived";

      }
    );


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );

}


/*
  Si aucun capital actif n'existe mais qu'un capital
  archivé existe, on peut réactiver automatiquement
  le plus récent uniquement lorsque nécessaire.

  Cela évite de laisser l'application sans capital
  utilisable après une archive accidentelle.
*/

function ensureActiveCapitalIfPossible() {

  if (
    getActiveCapital()
  ) {

    return;

  }


  if (!capitals.length) {

    return;

  }


  const archived =
    capitals
      .filter(
        capital =>
          capital.status ===
          "archived"
      )
      .sort(
        (a, b) =>
          new Date(
            b.createdAt || 0
          ) -
          new Date(
            a.createdAt || 0
          )
      );


  if (!archived.length) {

    return;

  }


  archived[0].status =
    "active";


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );

}


function openCapitalModal(
  capital = null
) {

  if (!capital && capitalForm) {

    capitalForm.reset();

  }


  openModalElement(
    capitalModal
  );


  const title =
    document.getElementById(
      "capital-modal-title"
    );


  if (title) {

    title.textContent =
      capital
        ? "Modifier le capital"
        : "Nouveau capital";

  }


  const id =
    document.getElementById(
      "capital-id"
    );


  const name =
    document.getElementById(
      "capital-name"
    );


  const initial =
    document.getElementById(
      "capital-initial"
    );


  const riskMode =
    document.getElementById(
      "capital-risk-mode"
    );


  const riskPercent =
    document.getElementById(
      "capital-risk-percent"
    );


  const riskAmount =
    document.getElementById(
      "capital-risk-amount"
    );


  const defaultRR =
    document.getElementById(
      "capital-default-rr"
    );


  if (id) {

    id.value =
      capital?.id || "";

  }


  if (name) {

    name.value =
      capital?.name || "";

  }


  if (initial) {

    initial.value =
      capital?.initialCapital ?? "";

  }


  if (riskMode) {

    riskMode.value =
      capital?.riskMode ||
      "percentage";

  }


  if (riskPercent) {

    riskPercent.value =
      capital?.riskPercent ?? 1;

  }


  if (riskAmount) {

    riskAmount.value =
      capital?.riskAmount ?? "";

  }


  if (defaultRR) {

    defaultRR.value =
      capital?.defaultRR ?? 2;

  }


  updateCapitalRiskMode();

}


function closeCapitalModal() {

  closeModalElement(
    capitalModal
  );

}


function updateCapitalRiskMode() {

  const modeElement =
    document.getElementById(
      "capital-risk-mode"
    );


  const percentGroup =
    document.getElementById(
      "capital-risk-percent-group"
    );


  const amountGroup =
    document.getElementById(
      "capital-risk-amount-group"
    );


  if (
    !modeElement ||
    !percentGroup ||
    !amountGroup
  ) {

    return;

  }


  const mode =
    modeElement.value;


  percentGroup.classList.toggle(
    "hidden",
    mode !== "percentage"
  );


  amountGroup.classList.toggle(
    "hidden",
    mode !== "fixed"
  );

}


document
  .getElementById(
    "open-capital-modal"
  )
  ?.addEventListener(
    "click",
    () => {

      openCapitalModal();

    }
  );


document
  .getElementById(
    "close-capital-modal"
  )
  ?.addEventListener(
    "click",
    closeCapitalModal
  );


document
  .getElementById(
    "cancel-capital"
  )
  ?.addEventListener(
    "click",
    closeCapitalModal
  );


document
  .getElementById(
    "capital-risk-mode"
  )
  ?.addEventListener(
    "change",
    updateCapitalRiskMode
  );


capitalModal?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      capitalModal
    ) {

      closeCapitalModal();

    }

  }
);


capitalForm?.addEventListener(
  "submit",
  event => {

    event.preventDefault();


    const id =
      document.getElementById(
        "capital-id"
      ).value;


    const name =
      document.getElementById(
        "capital-name"
      ).value.trim();


    const initialCapital =
      Number(
        document.getElementById(
          "capital-initial"
        ).value
      );


    const riskMode =
      document.getElementById(
        "capital-risk-mode"
      ).value;


    const riskPercent =
      Number(
        document.getElementById(
          "capital-risk-percent"
        ).value
      ) || 0;


    const riskAmount =
      Number(
        document.getElementById(
          "capital-risk-amount"
        ).value
      ) || 0;


    const defaultRR =
      Number(
        document.getElementById(
          "capital-default-rr"
        ).value
      ) || 2;


    if (!name) {

      alert(
        "Donne un nom à ton capital."
      );

      return;

    }


    if (
      !Number.isFinite(
        initialCapital
      ) ||
      initialCapital <= 0
    ) {

      alert(
        "Le capital initial doit être supérieur à 0."
      );

      return;

    }


    if (
      riskMode ===
      "percentage" &&
      (
        !Number.isFinite(
          riskPercent
        ) ||
        riskPercent <= 0
      )
    ) {

      alert(
        "Le risque en pourcentage doit être supérieur à 0."
      );

      return;

    }


    if (
      riskMode === "fixed" &&
      (
        !Number.isFinite(
          riskAmount
        ) ||
        riskAmount <= 0
      )
    ) {

      alert(
        "Le risque fixe doit être supérieur à 0."
      );

      return;

    }


    if (
      !Number.isFinite(
        defaultRR
      ) ||
      defaultRR < 1 ||
      defaultRR > 10
    ) {

      alert(
        "Le RR par défaut doit être compris entre 1 et 10."
      );

      return;

    }


    if (id) {

      const capital =
        getCapitalById(
          id
        );


      if (!capital) {

        return;

      }


      capital.name =
        name;

      capital.initialCapital =
        initialCapital;

      capital.riskMode =
        riskMode;

      capital.riskPercent =
        riskPercent;

      capital.riskAmount =
        riskAmount;

      capital.defaultRR =
        defaultRR;


    } else {

      const hasActiveCapital =
        Boolean(
          getActiveCapital()
        );


      const capital = {

        id:
          createId(
            "capital-"
          ),

        name,

        initialCapital,

        riskMode,

        riskPercent,

        riskAmount,

        defaultRR,

        status:
          hasActiveCapital
            ? "archived"
            : "active",

        createdAt:
          new Date().toISOString()

      };


      capitals.push(
        capital
      );

    }


    if (
      saveJSON(
        STORAGE_KEYS.capitals,
        capitals
      )
    ) {

      closeCapitalModal();

      updateAll();


      if (
        !id &&
        capitals.length === 1
      ) {

        alert(
          "Capital créé et activé."
        );

      }

    }

  }
);


function editCapital(
  id
) {

  const capital =
    getCapitalById(
      id
    );


  if (!capital) {

    return;

  }


  openCapitalModal(
    capital
  );

}


function archiveCapital(
  id
) {

  const capital =
    getCapitalById(
      id
    );


  if (!capital) {

    return;

  }


  if (
    capital.status !==
    "active"
  ) {

    return;

  }


  capital.status =
    "archived";


  /*
    Si c'était le seul capital actif,
    on active automatiquement un autre capital
    archivé si disponible.
  */

  ensureActiveCapitalIfPossible();


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  updateAll();

}


function activateCapital(
  id
) {

  const capital =
    getCapitalById(
      id
    );


  if (!capital) {

    return;

  }


  capitals.forEach(
    item => {

      item.status =
        item.id === id
          ? "active"
          : "archived";

    }
  );


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  updateAll();

}


function deleteCapital(
  id
) {

  const capital =
    getCapitalById(
      id
    );


  if (!capital) {

    return;

  }


  const linkedTrades =
    trades.filter(
      trade =>
        trade.capitalId ===
        id
    );


  if (
    linkedTrades.length > 0
  ) {

    alert(
      "Ce capital possède des trades enregistrés. " +
      "Archive-le plutôt que de le supprimer."
    );

    return;

  }


  const confirmed =
    window.confirm(
      `Supprimer le capital "${capital.name}" ?`
    );


  if (!confirmed) {

    return;

  }


  capitals =
    capitals.filter(
      item =>
        item.id !== id
    );


  ensureActiveCapitalIfPossible();


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  updateAll();

}


window.editCapital =
  editCapital;

window.archiveCapital =
  archiveCapital;

window.activateCapital =
  activateCapital;

window.deleteCapital =
  deleteCapital;


/* =========================================================
   CAPITAL RENDER
========================================================= */

function renderCapitals() {

  const activeContainer =
    document.getElementById(
      "active-capital-container"
    );


  const archivedContainer =
    document.getElementById(
      "archived-capitals-container"
    );


  if (
    !activeContainer ||
    !archivedContainer
  ) {

    return;

  }


  const active =
    getActiveCapital();


  const archived =
    capitals.filter(
      capital =>
        capital.status ===
        "archived"
    );


  if (!active) {

    activeContainer.innerHTML = `
      <div class="empty">
        Aucun capital actif.
      </div>
    `;

  } else {

    activeContainer.innerHTML =
      renderCapitalItem(
        active,
        true
      );

  }


  if (!archived.length) {

    archivedContainer.innerHTML = `
      <div class="empty">
        Aucun capital archivé.
      </div>
    `;

  } else {

    archivedContainer.innerHTML =
      archived
        .map(
          capital =>
            renderCapitalItem(
              capital,
              false
            )
        )
        .join("");

  }


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


  if (activeName) {

    activeName.textContent =
      active
        ? active.name
        : "Aucun";

  }


  if (activeBalance) {

    activeBalance.textContent =
      active
        ? formatMoney(
            getCapitalBalance(
              active
            )
          )
        : "$0.00";

  }


  if (archivedCount) {

    archivedCount.textContent =
      archived.length;

  }


  if (globalPnl) {

    const globalStats =
      calculateGlobalStatistics();


    globalPnl.textContent =
      formatMoney(
        globalStats.totalPnl
      );

  }

}


function renderCapitalItem(
  capital,
  isActive
) {

  const balance =
    getCapitalBalance(
      capital
    );


  const pnl =
    balance -
    Number(
      capital.initialCapital
    );


  const risk =
    getCapitalRisk(
      capital
    );


  const pnlClass =
    pnl >= 0
      ? "pnl-positive"
      : "pnl-negative";


  const riskPercent =
    getCapitalRiskPercent(
      capital
    );


  return `
    <div class="capital-item">

      <div class="capital-main">

        <strong>
          ${escapeHTML(
            capital.name
          )}
        </strong>

        <small>
          ${
            isActive
              ? "Capital actif"
              : "Capital archivé"
          }
        </small>

      </div>


      <div class="capital-stat">

        <span>
          Initial
        </span>

        <strong>
          ${formatMoney(
            capital.initialCapital
          )}
        </strong>

      </div>


      <div class="capital-stat">

        <span>
          Balance
        </span>

        <strong>
          ${formatMoney(
            balance
          )}
        </strong>

      </div>


      <div class="capital-stat">

        <span>
          Risque / trade
        </span>

        <strong>
          ${formatMoney(
            risk
          )}
        </strong>

        <small>
          ${formatPercent(
            riskPercent
          )}
        </small>

      </div>


      <div class="capital-stat">

        <span>
          P&L
        </span>

        <strong class="${pnlClass}">
          ${formatMoney(
            pnl
          )}
        </strong>

      </div>


      <div class="capital-actions">

        <button
          class="icon-button"
          onclick="editCapital('${capital.id}')"
        >
          Modifier
        </button>


        ${
          isActive
            ? `
              <button
                class="icon-button"
                onclick="archiveCapital('${capital.id}')"
              >
                Archiver
              </button>
            `
            : `
              <button
                class="icon-button"
                onclick="activateCapital('${capital.id}')"
              >
                Activer
              </button>
            `
        }


        <button
          class="icon-button danger"
          onclick="deleteCapital('${capital.id}')"
        >
          Supprimer
        </button>

      </div>

    </div>
  `;

}


/* =========================================================
   ASSET / PIP CONFIGURATION
========================================================= */

const LOT_STEP =
  APP_CONFIG.lotStep;


const ASSET_CONFIG = {

  XAUUSD: {

    multiplier: 100,

    pipValue: 1

  },


  EURUSD: {

    multiplier: 10000,

    pipValue: 10

  },


  GBPUSD: {

    multiplier: 10000,

    pipValue: 10

  },


  AUDUSD: {

    multiplier: 10000,

    pipValue: 10

  },


  NZDUSD: {

    multiplier: 10000,

    pipValue: 10

  },


  USDJPY: {

    multiplier: 100,

    dynamicPipValue: true

  },


  USDCAD: {

    multiplier: 10000,

    dynamicPipValue: true

  },


  USDCHF: {

    multiplier: 10000,

    dynamicPipValue: true

  }

};


function normalizeLot(
  lot
) {

  const numericLot =
    Number(lot) || 0;


  if (
    numericLot <= 0
  ) {

    return 0;

  }


  const normalized =
    Math.floor(
      (
        numericLot +
        Number.EPSILON
      ) /
      LOT_STEP
    ) *
    LOT_STEP;


  return Number(
    normalized.toFixed(2)
  );

}


function getPipDistance(
  asset,
  price1,
  price2
) {

  const config =
    ASSET_CONFIG[asset];


  if (!config) {

    return 0;

  }


  const p1 =
    Number(price1) || 0;


  const p2 =
    Number(price2) || 0;


  if (
    p1 <= 0 ||
    p2 <= 0
  ) {

    return 0;

  }


  return Math.abs(
    p1 - p2
  ) *
  config.multiplier;

}


function getSignedPips(
  asset,
  direction,
  entry,
  exit
) {

  const config =
    ASSET_CONFIG[asset];


  if (!config) {

    return 0;

  }


  const entryPrice =
    Number(entry) || 0;


  const exitPrice =
    Number(exit) || 0;


  if (
    entryPrice <= 0 ||
    exitPrice <= 0
  ) {

    return 0;

  }


  if (
    direction === "BUY"
  ) {

    return (
      exitPrice -
      entryPrice
    ) *
    config.multiplier;

  }


  return (
    entryPrice -
    exitPrice
  ) *
  config.multiplier;

}


function getPipValue(
  asset,
  price
) {

  const config =
    ASSET_CONFIG[asset];


  if (!config) {

    return 0;

  }


  if (
    !config.dynamicPipValue
  ) {

    return (
      Number(
        config.pipValue
      ) || 0
    );

  }


  const numericPrice =
    Number(price) || 0;


  if (
    numericPrice <= 0
  ) {

    return 0;

  }


  if (
    asset === "USDJPY"
  ) {

    return (
      1000 /
      numericPrice
    );

  }


  if (
    asset === "USDCAD"
  ) {

    return (
      10 /
      numericPrice
    );

  }


  if (
    asset === "USDCHF"
  ) {

    return (
      10 *
      numericPrice
    );

  }


  return 0;

}


function getActualPipValue(
  asset,
  price,
  lot
) {

  const pipValuePerLot =
    getPipValue(
      asset,
      price
    );


  return (
    pipValuePerLot *
    (
      Number(lot) || 0
    )
  );

}


function calculateRiskAtStop(
  asset,
  entry,
  sl,
  lot
) {

  const slPips =
    getPipDistance(
      asset,
      entry,
      sl
    );


  const pipValue =
    getPipValue(
      asset,
      entry
    );


  const numericLot =
    Number(lot) || 0;


  return (
    slPips *
    pipValue *
    numericLot
  );

}


/* =========================================================
   TRADE MODAL
========================================================= */

function resetTradeForm() {

  if (!tradeForm) {

    return;

  }


  tradeForm.reset();


  const date =
    document.getElementById(
      "trade-date"
    );


  const asset =
    document.getElementById(
      "trade-asset"
    );


  const direction =
    document.getElementById(
      "trade-direction"
    );


  const timeframe =
    document.getElementById(
      "trade-timeframe"
    );


  const rr =
    document.getElementById(
      "trade-rr"
    );


  const result =
    document.getElementById(
      "trade-result"
    );


  const beExit =
    document.getElementById(
      "trade-be-exit"
    );


  if (date) {

    date.value =
      getDefaultDateTime();

  }


  if (asset) {

    asset.value =
      "XAUUSD";

  }


  if (direction) {

    direction.value =
      "BUY";

  }


  if (timeframe) {

    timeframe.value =
      "M15";

  }


  if (rr) {

    rr.value =
      "2";

  }


  if (result) {

    result.value =
      "TP";

  }


  if (beExit) {

    beExit.value =
      "";

  }


  const beGroup =
    document.getElementById(
      "be-exit-group"
    );


  if (beGroup) {

    beGroup.classList.add(
      "hidden"
    );

  }

}


function openTradeModal() {

  const active =
    getActiveCapital();


  if (!active) {

    alert(
      "Aucun capital actif. Crée ou active un capital avant d'ajouter un trade."
    );


    showPage(
      "capitals"
    );


    return;

  }


  resetTradeForm();


  openModalElement(
    tradeModal
  );


  const activeName =
    document.getElementById(
      "trade-active-capital-name"
    );


  const balanceDisplay =
    document.getElementById(
      "trade-balance-display"
    );


  const riskDisplay =
    document.getElementById(
      "trade-risk-display"
    );


  const rr =
    document.getElementById(
      "trade-rr"
    );


  if (activeName) {

    activeName.textContent =
      active.name;

  }


  if (balanceDisplay) {

    balanceDisplay.textContent =
      formatMoney(
        getCapitalBalance(
          active
        )
      );

  }


  if (riskDisplay) {

    riskDisplay.textContent =
      formatMoney(
        getCapitalRisk(
          active
        )
      );

  }


  if (rr) {

    rr.value =
      String(
        clamp(
          Number(
            active.defaultRR || 2
          ),
          1,
          10
        )
      );

  }


  updateTradeCalculations();

}


function closeTradeModal() {

  closeModalElement(
    tradeModal
  );

}


document
  .getElementById(
    "open-trade-modal"
  )
  ?.addEventListener(
    "click",
    openTradeModal
  );


document
  .getElementById(
    "close-trade-modal"
  )
  ?.addEventListener(
    "click",
    closeTradeModal
  );


document
  .getElementById(
    "cancel-trade"
  )
  ?.addEventListener(
    "click",
    closeTradeModal
  );


tradeModal?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      tradeModal
    ) {

      closeTradeModal();

    }

  }
);


/* =========================================================
   TRADE CALCULATIONS
========================================================= */

function calculateTradeValues() {

  const capital =
    getActiveCapital();


  const asset =
    document.getElementById(
      "trade-asset"
    )?.value || "";


  const direction =
    document.getElementById(
      "trade-direction"
    )?.value || "BUY";


  const entry =
    Number(
      document.getElementById(
        "trade-entry"
      )?.value
    ) || 0;


  const sl =
    Number(
      document.getElementById(
        "trade-sl"
      )?.value
    ) || 0;


  const rr =
    Number(
      document.getElementById(
        "trade-rr"
      )?.value
    ) || 0;


  const result =
    document.getElementById(
      "trade-result"
    )?.value || "TP";


  const beExit =
    Number(
      document.getElementById(
        "trade-be-exit"
      )?.value
    ) || 0;


  if (!capital) {

    return {

      riskMoney: 0,

      slPips: 0,

      pipValuePerLot: 0,

      lotRaw: 0,

      lot: 0,

      riskAtStop: 0,

      riskDifference: 0,

      riskPercentOfCapital: 0,

      tp: 0,

      exitPrice: 0,

      realizedPips: 0,

      pnl: 0,

      r: 0

    };

  }


  const riskMoney =
    getCapitalRisk(
      capital
    );


  const slPips =
    getPipDistance(
      asset,
      entry,
      sl
    );


  const pipValuePerLot =
    getPipValue(
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
      (
        slPips *
        pipValuePerLot
      );

  }


  const lot =
    normalizeLot(
      lotRaw
    );


  const riskAtStop =
    calculateRiskAtStop(
      asset,
      entry,
      sl,
      lot
    );


  const riskDifference =
    riskMoney -
    riskAtStop;


  const riskPercentOfCapital =
    riskMoney > 0
      ? (
          riskAtStop /
          riskMoney
        ) *
        100
      : 0;


  let tp = 0;


  if (
    entry > 0 &&
    sl > 0 &&
    rr > 0
  ) {

    const distance =
      Math.abs(
        entry -
        sl
      );


    if (
      direction === "BUY"
    ) {

      tp =
        entry +
        distance *
        rr;

    } else {

      tp =
        entry -
        distance *
        rr;

    }

  }


  let exitPrice = 0;


  if (
    result === "TP"
  ) {

    exitPrice =
      tp;

  }


  if (
    result === "SL"
  ) {

    exitPrice =
      sl;

  }


  if (
    result === "BE"
  ) {

    exitPrice =
      beExit;

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
      ? pnl /
        riskMoney
      : 0;


  return {

    riskMoney,

    slPips,

    pipValuePerLot,

    lotRaw,

    lot,

    riskAtStop,

    riskDifference,

    riskPercentOfCapital,

    tp,

    exitPrice,

    realizedPips,

    pnl,

    r

  };

}


function updateTradeCalculations() {

  const values =
    calculateTradeValues();


  const riskMoney =
    document.getElementById(
      "trade-risk-money"
    );


  const slPips =
    document.getElementById(
      "trade-sl-pips"
    );


  const lot =
    document.getElementById(
      "trade-lot"
    );


  const lotValue =
    document.getElementById(
      "trade-lot-value"
    );


  if (riskMoney) {

    riskMoney.textContent =
      formatMoney(
        values.riskMoney
      );

  }


  if (slPips) {

    slPips.textContent =
      `${formatNumber(
        values.slPips,
        1
      )} pips`;

  }


  if (lot) {

    lot.textContent =
      `${formatNumber(
        values.lot,
        2
      )} lot`;

  }


  if (lotValue) {

    lotValue.value =
      values.lot.toFixed(4);

  }


  const asset =
    document.getElementById(
      "trade-asset"
    )?.value || "";


  const priceDecimals =
    asset === "XAUUSD" ||
    asset === "USDJPY"
      ? 2
      : 5;


  const tpDisplay =
    document.getElementById(
      "trade-tp-display"
    );


  const tpHidden =
    document.getElementById(
      "trade-tp"
    );


  if (tpDisplay) {

    tpDisplay.textContent =
      values.tp > 0
        ? formatNumber(
            values.tp,
            priceDecimals
          )
        : "—";

  }


  if (tpHidden) {

    tpHidden.value =
      values.tp > 0
        ? values.tp
        : "";

  }


  const exitDisplay =
    document.getElementById(
      "trade-exit-display"
    );


  if (exitDisplay) {

    exitDisplay.textContent =
      values.exitPrice > 0
        ? formatNumber(
            values.exitPrice,
            priceDecimals
          )
        : "—";

  }


  const realizedPips =
    document.getElementById(
      "trade-realized-pips"
    );


  if (realizedPips) {

    realizedPips.textContent =
      `${formatNumber(
        values.realizedPips,
        1
      )} pips`;

  }


  const pnlElement =
    document.getElementById(
      "trade-pnl-display"
    );


  if (pnlElement) {

    pnlElement.textContent =
      formatMoney(
        values.pnl
      );


    pnlElement.classList.remove(
      "pnl-positive",
      "pnl-negative"
    );


    if (
      values.pnl > 0
    ) {

      pnlElement.classList.add(
        "pnl-positive"
      );

    }


    if (
      values.pnl < 0
    ) {

      pnlElement.classList.add(
        "pnl-negative"
      );

    }

  }


  const rElement =
    document.getElementById(
      "trade-r-display"
    );


  if (rElement) {

    rElement.textContent =
      `${formatNumber(
        values.r,
        2
      )}R`;

  }


  const riskCheckElement =
    document.getElementById(
      "trade-risk-check"
    );


  if (riskCheckElement) {

    riskCheckElement.textContent =
      formatMoney(
        values.riskAtStop
      );

  }


  updateBEVisibility();

}


function updateBEVisibility() {

  const result =
    document.getElementById(
      "trade-result"
    )?.value;


  const group =
    document.getElementById(
      "be-exit-group"
    );


  if (!group) {

    return;

  }


  group.classList.toggle(
    "hidden",
    result !== "BE"
  );

}


/* =========================================================
   TRADE INPUT EVENTS
========================================================= */

[
  "trade-asset",
  "trade-direction",
  "trade-entry",
  "trade-sl",
  "trade-rr",
  "trade-result",
  "trade-be-exit"
].forEach(
  id => {

    const element =
      document.getElementById(
        id
      );


    if (!element) {

      return;

    }


    element.addEventListener(
      "input",
      updateTradeCalculations
    );


    element.addEventListener(
      "change",
      updateTradeCalculations
    );

  }
);


/* =========================================================
   ADD TRADE
========================================================= */

tradeForm?.addEventListener(
  "submit",
  event => {

    event.preventDefault();


    const capital =
      getActiveCapital();


    if (!capital) {

      alert(
        "Aucun capital actif."
      );

      closeTradeModal();

      return;

    }


    const values =
      calculateTradeValues();


    const asset =
      document.getElementById(
        "trade-asset"
      ).value;


    const direction =
      document.getElementById(
        "trade-direction"
      ).value;


    const entry =
      Number(
        document.getElementById(
          "trade-entry"
        ).value
      );


    const sl =
      Number(
        document.getElementById(
          "trade-sl"
        ).value
      );


    const result =
      document.getElementById(
        "trade-result"
      ).value;


    const tradeDate =
      document.getElementById(
        "trade-date"
      ).value;


    if (
      !tradeDate
    ) {

      alert(
        "Sélectionne une date pour le trade."
      );

      return;

    }


    if (
      !entry ||
      entry <= 0 ||
      !sl ||
      sl <= 0
    ) {

      alert(
        "Entre un prix d'entrée et un Stop Loss valides."
      );

      return;

    }


    if (
      direction === "BUY" &&
      sl >= entry
    ) {

      alert(
        "Pour un BUY, le Stop Loss doit être inférieur au prix d'entrée."
      );

      return;

    }


    if (
      direction === "SELL" &&
      sl <= entry
    ) {

      alert(
        "Pour un SELL, le Stop Loss doit être supérieur au prix d'entrée."
      );

      return;

    }


    if (
      values.slPips <= 0
    ) {

      alert(
        "La distance entre l'entrée et le Stop Loss doit être supérieure à 0."
      );

      return;

    }


    if (
      values.lot <= 0
    ) {

      alert(
        "Impossible de calculer une taille de lot valide pour ce risque et cette distance de Stop Loss."
      );

      return;

    }


    const riskTolerance =
      Math.max(
        APP_CONFIG.minRiskTolerance,
        values.riskMoney *
        APP_CONFIG.maxRiskToleranceRatio
      );


    if (
      values.riskAtStop >
      values.riskMoney +
      riskTolerance
    ) {

      alert(
        "La taille de lot calculée dépasse le risque maximum autorisé."
      );

      return;

    }


    if (
      result === "BE" &&
      (
        !values.exitPrice ||
        values.exitPrice <= 0
      )
    ) {

      alert(
        "Entre le prix réel de sortie pour un trade BE."
      );

      return;

    }


    if (
      (
        result === "TP" ||
        result === "SL"
      ) &&
      values.exitPrice <= 0
    ) {

      alert(
        "Impossible de déterminer le prix de sortie."
      );

      return;

    }


    if (
      !Number.isFinite(
        values.pnl
      ) ||
      !Number.isFinite(
        values.r
      )
    ) {

      alert(
        "Les calculs du trade sont invalides. Vérifie les prix saisis."
      );

      return;

    }


    const trade = {

      id:
        createId(
          "trade-"
        ),

      capitalId:
        capital.id,

      capitalName:
        capital.name,

      date:
        tradeDate,

      asset,

      direction,

      session:
        document.getElementById(
          "trade-session"
        ).value,

      timeframe:
        document.getElementById(
          "trade-timeframe"
        ).value,

      setup:
        document.getElementById(
          "trade-setup"
        ).value,

      entry,

      sl,

      rr:
        Number(
          document.getElementById(
            "trade-rr"
          ).value
        ),

      tp:
        values.tp,

      lot:
        values.lot,

      lotRaw:
        values.lotRaw,

      riskMoney:
        values.riskMoney,

      riskAtStop:
        values.riskAtStop,

      slPips:
        values.slPips,

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
        ).value.trim(),

      notes:
        document.getElementById(
          "trade-notes"
        ).value.trim(),

      createdAt:
        new Date().toISOString()

    };


    trades.push(
      trade
    );


    const saved =
      saveJSON(
        STORAGE_KEYS.trades,
        trades
      );


    if (!saved) {

      trades =
        trades.filter(
          item =>
            item.id !==
            trade.id
        );

      return;

    }


    resetTradeForm();

    closeTradeModal();

    updateAll();

    showPage(
      "journal"
    );

  }
);


/* =========================================================
   TRADE DELETION
========================================================= */

function deleteTrade(
  id
) {

  const confirmed =
    window.confirm(
      "Supprimer ce trade ?"
    );


  if (!confirmed) {

    return;

  }


  trades =
    trades.filter(
      trade =>
        trade.id !== id
    );


  saveJSON(
    STORAGE_KEYS.trades,
    trades
  );


  updateAll();

}


window.deleteTrade =
  deleteTrade;


/* =========================================================
   JOURNAL
========================================================= */

function getFilteredJournalTrades() {

  const filter =
    document.getElementById(
      "journal-capital-filter"
    )?.value || "all";


  if (
    filter === "active"
  ) {

    const active =
      getActiveCapital();


    if (!active) {

      return [];

    }


    return trades.filter(
      trade =>
        trade.capitalId ===
        active.id
    );

  }


  return [
    ...trades
  ];

}


function renderJournal() {

  const tbody =
    document.getElementById(
      "journal-trades"
    );


  const noCapital =
    document.getElementById(
      "journal-no-capital"
    );


  if (
    !tbody
  ) {

    return;

  }


  const active =
    getActiveCapital();


  if (noCapital) {

    noCapital.classList.toggle(
      "hidden",
      Boolean(active)
    );

  }


  const filtered =
    getFilteredJournalTrades();


  const summary =
    document.getElementById(
      "journal-summary"
    );


  if (summary) {

    summary.textContent =
      `${filtered.length} trade${
        filtered.length > 1
          ? "s"
          : ""
      }`;

  }


  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="empty">
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;

  }


  const sortedTrades =
    [...filtered].sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );


  tbody.innerHTML =
    sortedTrades
      .map(
        trade => {

          const pnl =
            Number(
              trade.pnl || 0
            );


          const pnlClass =
            pnl >= 0
              ? "pnl-positive"
              : "pnl-negative";


          const resultClass =
            trade.result === "TP"
              ? "result-tp"
              : trade.result === "SL"
                ? "result-sl"
                : "result-be";


          const tradeCapital =
            getCapitalById(
              trade.capitalId
            );


          const capitalName =
            tradeCapital?.name ||
            trade.capitalName ||
            "—";


          return `
            <tr>

              <td>
                ${formatDate(
                  trade.date
                )}
              </td>

              <td>
                ${escapeHTML(
                  capitalName
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
                ${formatPrice(
                  trade.asset,
                  trade.entry
                )}
              </td>

              <td>
                ${formatPrice(
                  trade.asset,
                  trade.sl
                )}
              </td>

              <td>
                ${formatPrice(
                  trade.asset,
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
                ${formatNumber(
                  trade.rr,
                  1
                )}R
              </td>

              <td class="${resultClass}">
                ${escapeHTML(
                  trade.result
                )}
              </td>

              <td>
                ${formatNumber(
                  trade.realizedPips,
                  1
                )}
              </td>

              <td class="${pnlClass}">
                ${formatMoney(
                  pnl
                )}
              </td>

              <td class="${pnlClass}">
                ${formatNumber(
                  trade.r,
                  2
                )}R
              </td>

              <td>

                <button
                  class="delete-button"
                  onclick="deleteTrade('${trade.id}')"
                  title="Supprimer"
                  aria-label="Supprimer le trade"
                >
                  ×
                </button>

              </td>

            </tr>
          `;

        }
      )
      .join("");

}


function formatPrice(
  asset,
  value
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {

    return "—";

  }


  const decimals =
    asset === "XAUUSD" ||
    asset === "USDJPY"
      ? 2
      : 5;


  return number.toFixed(
    decimals
  );

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
   RECENT TRADES
========================================================= */

function renderRecentTrades() {

  const tbody =
    document.getElementById(
      "recent-trades"
    );


  if (!tbody) {

    return;

  }


  if (!trades.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;

  }


  const sortedTrades =
    [...trades]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(
        0,
        5
      );


  tbody.innerHTML =
    sortedTrades
      .map(
        trade => {

          const pnl =
            Number(
              trade.pnl || 0
            );


          const pnlClass =
            pnl >= 0
              ? "pnl-positive"
              : "pnl-negative";


          const resultClass =
            trade.result === "TP"
              ? "result-tp"
              : trade.result === "SL"
                ? "result-sl"
                : "result-be";


          const tradeCapital =
            getCapitalById(
              trade.capitalId
            );


          const capitalName =
            tradeCapital?.name ||
            trade.capitalName ||
            "—";


          return `
            <tr>

              <td>
                ${formatDate(
                  trade.date
                )}
              </td>

              <td>
                ${escapeHTML(
                  capitalName
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
                ${formatNumber(
                  trade.rr,
                  1
                )}R
              </td>

              <td class="${resultClass}">
                ${escapeHTML(
                  trade.result
                )}
              </td>

              <td class="${pnlClass}">
                ${formatMoney(
                  pnl
                )}
              </td>

            </tr>
          `;

        }
      )
      .join("");

}


/* =========================================================
   STATISTICS
========================================================= */

function calculateStatistics(
  tradeList,
  startingCapital = 0
) {

  const safeTrades =
    Array.isArray(
      tradeList
    )
      ? tradeList
      : [];


  const totalTrades =
    safeTrades.length;


  const wins =
    safeTrades.filter(
      trade =>
        trade.result === "TP"
    ).length;


  const losses =
    safeTrades.filter(
      trade =>
        trade.result === "SL"
    ).length;


  const breakeven =
    safeTrades.filter(
      trade =>
        trade.result === "BE"
    ).length;


  const totalPnl =
    safeTrades.reduce(
      (
        sum,
        trade
      ) =>
        sum +
        Number(
          trade.pnl || 0
        ),
      0
    );


  const currentCapital =
    Number(
      startingCapital
    ) +
    totalPnl;


  const winRate =
    wins + losses > 0
      ? (
          wins /
          (
            wins +
            losses
          )
        ) *
        100
      : 0;


  const grossProfit =
    safeTrades
      .filter(
        trade =>
          Number(
            trade.pnl
          ) > 0
      )
      .reduce(
        (
          sum,
          trade
        ) =>
          sum +
          Number(
            trade.pnl
          ),
        0
      );


  const grossLoss =
    Math.abs(
      safeTrades
        .filter(
          trade =>
            Number(
              trade.pnl
            ) < 0
        )
        .reduce(
          (
            sum,
            trade
          ) =>
            sum +
            Number(
              trade.pnl
            ),
          0
        )
    );


  const profitFactor =
    grossLoss > 0
      ? grossProfit /
        grossLoss
      : grossProfit > 0
        ? Infinity
        : 0;


  const avgR =
    totalTrades > 0
      ? safeTrades.reduce(
          (
            sum,
            trade
          ) =>
            sum +
            Number(
              trade.r || 0
            ),
          0
        ) /
        totalTrades
      : 0;


  return {

    totalTrades,

    wins,

    losses,

    breakeven,

    totalPnl,

    currentCapital,

    winRate,

    grossProfit,

    grossLoss,

    profitFactor,

    avgR

  };

}


function calculateCapitalStatistics(
  capital
) {

  if (!capital) {

    return calculateStatistics(
      [],
      0
    );

  }


  const capitalTrades =
    trades.filter(
      trade =>
        trade.capitalId ===
        capital.id
    );


  return calculateStatistics(
    capitalTrades,
    capital.initialCapital
  );

}


/*
  PERFORMANCE GLOBALE

  Important :

  Les capitaux archivés représentent des capitaux
  distincts. On ne considère donc pas la somme de
  leurs balances comme "la balance actuelle".

  Le P&L global est la somme de tous les trades.

  Le nombre de capitaux correspond au nombre de
  capitaux enregistrés.

  Le dashboard principal continue à afficher
  uniquement le capital actif.
*/

function calculateGlobalStatistics() {

  const totalPnl =
    trades.reduce(
      (
        sum,
        trade
      ) =>
        sum +
        Number(
          trade.pnl || 0
        ),
      0
    );


  const stats =
    calculateStatistics(
      trades,
      0
    );


  return {

    ...stats,

    totalPnl,

    currentCapital:
      totalPnl

  };

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

  const active =
    getActiveCapital();


  const noCapital =
    document.getElementById(
      "dashboard-no-capital"
    );


  const content =
    document.getElementById(
      "dashboard-content"
    );


  if (
    noCapital
  ) {

    noCapital.classList.toggle(
      "hidden",
      Boolean(active)
    );

  }


  if (
    content
  ) {

    content.classList.toggle(
      "hidden",
      !active
    );

  }


  if (!active) {

    updateGlobalPerformance();

    return;

  }


  const filter =
    document.getElementById(
      "dashboard-capital-filter"
    )?.value || "active";


  /*
    Le capital actuel affiché reste TOUJOURS
    celui du capital actif.

    Le filtre peut influencer les statistiques
    secondaires et l'equity curve, mais jamais
    la balance actuelle du capital actif.
  */

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


  const activeBalance =
    getCapitalBalance(
      active
    );


  const activeStartingCapital =
    Number(
      active.initialCapital
    ) || 0;


  const dashboardCapital =
    document.getElementById(
      "dashboard-capital"
    );


  if (dashboardCapital) {

    dashboardCapital.textContent =
      formatMoney(
        activeBalance
      );

  }


  const dashboardStartCapital =
    document.getElementById(
      "dashboard-start-capital"
    );


  if (dashboardStartCapital) {

    dashboardStartCapital.textContent =
      formatMoney(
        activeStartingCapital
      );

  }


  const pnlElement =
    document.getElementById(
      "dashboard-pnl"
    );


  if (pnlElement) {

    pnlElement.textContent =
      formatMoney(
        stats.totalPnl
      );

  }


  const pnlPercentElement =
    document.getElementById(
      "dashboard-pnl-percent"
    );


  const statsStartingCapital =
    filter === "all"
      ? 0
      : activeStartingCapital;


  const pnlPercent =
    statsStartingCapital > 0
      ? (
          stats.totalPnl /
          statsStartingCapital
        ) *
        100
      : 0;


  if (pnlPercentElement) {

    pnlPercentElement.textContent =
      filter === "all"
        ? "Global"
        : formatPercent(
            pnlPercent
          );

  }


  const winRate =
    document.getElementById(
      "dashboard-winrate"
    );


  if (winRate) {

    winRate.textContent =
      formatPercent(
        stats.winRate
      );

  }


  const wl =
    document.getElementById(
      "dashboard-wl"
    );


  if (wl) {

    wl.textContent =
      `${stats.wins} W / ${
        stats.losses
      } L / ${
        stats.breakeven
      } BE`;

  }


  const tradesElement =
    document.getElementById(
      "dashboard-trades"
    );


  if (tradesElement) {

    tradesElement.textContent =
      stats.totalTrades;

  }


  const profitFactor =
    document.getElementById(
      "dashboard-profit-factor"
    );


  if (profitFactor) {

    profitFactor.textContent =
      stats.profitFactor === Infinity
        ? "∞"
        : formatNumber(
            stats.profitFactor,
            2
          );

  }


  const avgR =
    document.getElementById(
      "dashboard-avg-r"
    );


  if (avgR) {

    avgR.textContent =
      `${formatNumber(
        stats.avgR,
        2
      )}R`;

  }


  const dashboardTrades =
    filter === "all"
      ? trades
      : trades.filter(
          trade =>
            trade.capitalId ===
            active.id
        );


  const chartStartingCapital =
    filter === "all"
      ? 0
      : activeStartingCapital;


  const drawdown =
    calculateMaxDrawdown(
      chartStartingCapital,
      dashboardTrades
    );


  const drawdownElement =
    document.getElementById(
      "dashboard-drawdown"
    );


  if (drawdownElement) {

    drawdownElement.textContent =
      formatMoney(
        drawdown
      );

  }


  updateStreak(
    dashboardTrades
  );


  renderEquityChart(
    dashboardTrades,
    chartStartingCapital
  );


  const equityDescription =
    document.getElementById(
      "equity-description"
    );


  if (
    equityDescription
  ) {

    equityDescription.textContent =
      filter === "all"
        ? "Evolution de la performance globale."
        : `Evolution de ${active.name}.`;

  }


  updateGlobalPerformance();

}


document
  .getElementById(
    "dashboard-capital-filter"
  )
  ?.addEventListener(
    "change",
    updateDashboard
  );


function updateGlobalPerformance() {

  const stats =
    calculateGlobalStatistics();


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
      formatMoney(
        stats.totalPnl
      );

  }


  if (globalTrades) {

    globalTrades.textContent =
      stats.totalTrades;

  }


  if (globalWinrate) {

    globalWinrate.textContent =
      formatPercent(
        stats.winRate
      );

  }


  if (globalCapitals) {

    globalCapitals.textContent =
      capitals.length;

  }

}


/* =========================================================
   DRAWDOWN
========================================================= */

function calculateMaxDrawdown(
  startingCapital,
  tradeList
) {

  const ordered =
    [...(
      Array.isArray(
        tradeList
      )
        ? tradeList
        : []
    )].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  let equity =
    Number(
      startingCapital
    ) || 0;


  let peak =
    equity;


  let maxDrawdown =
    0;


  ordered.forEach(
    trade => {

      equity +=
        Number(
          trade.pnl || 0
        );


      if (
        equity > peak
      ) {

        peak =
          equity;

      }


      const drawdown =
        peak -
        equity;


      if (
        drawdown >
        maxDrawdown
      ) {

        maxDrawdown =
          drawdown;

      }

    }
  );


  return maxDrawdown;

}


/* =========================================================
   STREAK
========================================================= */

function updateStreak(
  tradeList
) {

  const element =
    document.getElementById(
      "dashboard-streak"
    );


  const label =
    document.getElementById(
      "dashboard-streak-label"
    );


  if (
    !element ||
    !label
  ) {

    return;

  }


  if (
    !tradeList.length
  ) {

    element.textContent =
      "0";

    label.textContent =
      "Aucune série";

    return;

  }


  const ordered =
    [...tradeList].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  let currentType =
    null;


  let currentCount =
    0;


  for (
    let i =
      ordered.length - 1;
    i >= 0;
    i--
  ) {

    const trade =
      ordered[i];


    let type;


    if (
      trade.result === "TP"
    ) {

      type =
        "win";

    } else if (
      trade.result === "SL"
    ) {

      type =
        "loss";

    } else {

      break;

    }


    if (
      currentType === null
    ) {

      currentType =
        type;

      currentCount =
        1;

    } else if (
      currentType === type
    ) {

      currentCount++;

    } else {

      break;

    }

  }


  element.textContent =
    currentCount;


  if (
    currentType === "win"
  ) {

    label.textContent =
      "Gains consécutifs";

  } else if (
    currentType === "loss"
  ) {

    label.textContent =
      "Pertes consécutives";

  } else {

    label.textContent =
      "Aucune série";

  }

}


/* =========================================================
   EQUITY CHART
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


  if (!tradeList.length) {

    container.innerHTML =
      `
        <div class="empty-chart">
          Aucun trade enregistré.
        </div>
      `;

    return;

  }


  const ordered =
    [...tradeList].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  let equity =
    Number(
      startingCapital
    ) || 0;


  const points = [
    {
      equity
    }
  ];


  ordered.forEach(
    trade => {

      equity +=
        Number(
          trade.pnl || 0
        );


      points.push({
        equity
      });

    }
  );


  const min =
    Math.min(
      ...points.map(
        point =>
          point.equity
      )
    );


  const max =
    Math.max(
      ...points.map(
        point =>
          point.equity
      )
    );


  const range =
    max -
    min ||
    1;


  const width =
    100;


  const height =
    100;


  const coordinates =
    points
      .map(
        (
          point,
          index
        ) => {

          const x =
            points.length === 1
              ? 0
              : (
                  index /
                  (
                    points.length -
                    1
                  )
                ) *
                width;


          const y =
            height -
            (
              (
                point.equity -
                min
              ) /
              range
            ) *
            height;


          return `${x},${y}`;

        }
      )
      .join(" ");


  container.innerHTML =
    `
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        width="100%"
        height="${APP_CONFIG.chartHeight}"
        role="img"
        aria-label="Courbe d'évolution de l'équité"
      >

        <polyline
          points="${coordinates}"
          fill="none"
          stroke="var(--primary)"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />

      </svg>
    `;

}


/* =========================================================
   PLAN DE TRADING
========================================================= */

const PLAN_CHECKLIST_KEYS = [

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

  "fullPlan"

];


function getPlanChecklistElements() {

  return [
    ...document.querySelectorAll(
      "[data-plan-check]"
    )
  ];

}


function getPlanChecklistState() {

  const state = {};


  getPlanChecklistElements()
    .forEach(
      checkbox => {

        const key =
          checkbox.dataset.planCheck;


        if (!key) {

          return;

        }


        state[key] =
          checkbox.checked;

      }
    );


  return state;

}


function applyPlanChecklistState(
  state = {}
) {

  getPlanChecklistElements()
    .forEach(
      checkbox => {

        const key =
          checkbox.dataset.planCheck;


        if (!key) {

          return;

        }


        checkbox.checked =
          Boolean(
            state[key]
          );

      }
    );

}


function updatePlanChecklistProgress() {

  const checkboxes =
    getPlanChecklistElements();


  const total =
    checkboxes.length;


  const completed =
    checkboxes.filter(
      checkbox =>
        checkbox.checked
    ).length;


  const percentage =
    total > 0
      ? (
          completed /
          total
        ) *
        100
      : 0;


  const progress =
    document.getElementById(
      "plan-checklist-progress"
    );


  if (progress) {

    progress.textContent =
      `${completed}/${total} (${Math.round(
        percentage
      )}%)`;

  }


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


  const allCompleted =
    total > 0 &&
    completed === total;


  if (permission) {

    permission.classList.toggle(
      "allowed",
      allCompleted
    );


    permission.classList.toggle(
      "authorized",
      allCompleted
    );


    permission.classList.toggle(
      "blocked",
      !allCompleted
    );

  }


  if (permissionTitle) {

    permissionTitle.textContent =
      allCompleted
        ? "Trade autorisé"
        : "Trade non autorisé";

  }


  if (
    permissionDescription
  ) {

    permissionDescription.textContent =
      allCompleted
        ? "Toutes les conditions du plan sont validées."
        : `${total - completed} condition${
            total - completed > 1
              ? "s"
              : ""
          } restante${
            total - completed > 1
              ? "s"
              : ""
          } avant de pouvoir prendre le trade.`;

  }

}


function loadPlanIntoForm() {

  const plan =
    loadPlan();


  if (
    plan &&
    plan.checklist
  ) {

    applyPlanChecklistState(
      plan.checklist
    );

  } else {

    applyPlanChecklistState(
      plan
    );

  }


  updatePlanChecklistProgress();

}


function saveCurrentPlan() {

  const existingPlan =
    loadPlan();


  const plan = {

    ...existingPlan,

    checklist:
      getPlanChecklistState(),

    updatedAt:
      new Date().toISOString(),

    appVersion:
      APP_CONFIG.version

  };


  if (
    savePlan(
      plan
    )
  ) {

    updatePlanChecklistProgress();


    alert(
      "Plan de trading sauvegardé."
    );

  }

}


const savePlanButton =
  document.getElementById(
    "save-plan"
  );


if (savePlanButton) {

  savePlanButton.addEventListener(
    "click",
    saveCurrentPlan
  );

}


const resetPlanButton =
  document.getElementById(
    "reset-plan-checklist"
  );


if (resetPlanButton) {

  resetPlanButton.addEventListener(
    "click",
    () => {

      const confirmed =
        window.confirm(
          "Réinitialiser toute la checklist du plan de trading ?"
        );


      if (!confirmed) {

        return;

      }


      getPlanChecklistElements()
        .forEach(
          checkbox => {

            checkbox.checked =
              false;

          }
        );


      updatePlanChecklistProgress();

    }
  );

}


getPlanChecklistElements()
  .forEach(
    checkbox => {

      checkbox.addEventListener(
        "change",
        updatePlanChecklistProgress
      );

    }
  );


/* =========================================================
   KEYBOARD / ACCESSIBILITY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {

      return;

    }


    if (
      tradeModal?.classList.contains(
        "active"
      )
    ) {

      closeTradeModal();

      return;

    }


    if (
      capitalModal?.classList.contains(
        "active"
      )
    ) {

      closeCapitalModal();

    }

  }
);


/* =========================================================
   UPDATE ALL
========================================================= */

function updateAll() {

  ensureSingleActiveCapital();

  renderCapitals();

  renderJournal();

  renderRecentTrades();

  updateDashboard();

  updateTradeCalculations();

  updatePlanChecklistProgress();

}


/* =========================================================
   CURRENT DATE
========================================================= */

function setCurrentDate() {

  const element =
    document.getElementById(
      "current-date"
    );


  if (!element) {

    return;

  }


  const date =
    new Date();


  element.textContent =
    date.toLocaleDateString(
      APP_CONFIG.locale,
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

}


/* =========================================================
   DATA VALIDATION / NORMALIZATION
========================================================= */

function normalizeLoadedData() {

  if (
    !Array.isArray(
      trades
    )
  ) {

    trades = [];

  }


  if (
    !Array.isArray(
      capitals
    )
  ) {

    capitals = [];

  }


  trades =
    trades.filter(
      trade =>
        trade &&
        typeof trade ===
        "object"
    );


  capitals =
    capitals.filter(
      capital =>
        capital &&
        typeof capital ===
        "object"
    );


  /*
    Compatibilité avec les données qui pourraient
    avoir été créées avant la V3.
  */

  capitals.forEach(
    capital => {

      if (!capital.id) {

        capital.id =
          createId(
            "capital-"
          );

      }


      if (
        capital.status !==
          "active" &&
        capital.status !==
          "archived"
      ) {

        capital.status =
          "archived";

      }


      if (
        !capital.riskMode
      ) {

        capital.riskMode =
          "percentage";

      }


      if (
        !Number.isFinite(
          Number(
            capital.riskPercent
          )
        )
      ) {

        capital.riskPercent =
          1;

      }


      if (
        !Number.isFinite(
          Number(
            capital.riskAmount
          )
        )
      ) {

        capital.riskAmount =
          0;

      }


      if (
        !Number.isFinite(
          Number(
            capital.defaultRR
          )
        )
      ) {

        capital.defaultRR =
          2;

      }

    }
  );


  trades.forEach(
    trade => {

      if (!trade.id) {

        trade.id =
          createId(
            "trade-"
          );

      }


      if (
        !Number.isFinite(
          Number(
            trade.pnl
          )
        )
      ) {

        trade.pnl =
          0;

      }


      if (
        !Number.isFinite(
          Number(
            trade.r
          )
        )
      ) {

        trade.r =
          0;

      }


      if (
        !Number.isFinite(
          Number(
            trade.lot
          )
        )
      ) {

        trade.lot =
          0;

      }

    }
  );


  ensureSingleActiveCapital();

  ensureActiveCapitalIfPossible();


  saveJSON(
    STORAGE_KEYS.trades,
    trades
  );


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );

}


/* =========================================================
   INITIALIZATION
========================================================= */

function refreshDataFromStorage() {

  trades =
    loadJSON(
      STORAGE_KEYS.trades,
      []
    );


  capitals =
    loadJSON(
      STORAGE_KEYS.capitals,
      []
    );


  normalizeLoadedData();

}


function initializeApplication() {

  refreshDataFromStorage();

  initializeStorageMetadata();

  setCurrentDate();

  loadPlanIntoForm();


  const tradeDate =
    document.getElementById(
      "trade-date"
    );


  if (tradeDate) {

    tradeDate.value =
      getDefaultDateTime();

  }


  updateAll();


  /*
    Le Dashboard est la page par défaut.
  */

  showPage(
    "dashboard"
  );

}


/*
  Le script est normalement chargé à la fin
  du body.

  Cette sécurité permet néanmoins à l'application
  de fonctionner correctement si la position du
  script change plus tard.
*/

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication,
    {
      once: true
    }
  );

} else {

  initializeApplication();

}
