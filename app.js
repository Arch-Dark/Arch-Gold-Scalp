"use strict";

/*
  ==========================================================
  TRADING PLAN - APPLICATION V3
  ==========================================================

  APPLICATION :
  - Dashboard
  - Journal
  - Capitaux
  - Plan de trading

  STOCKAGE :
  - localStorage
  - version de données
  - migration automatique des anciennes données

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

  1 lot    = 100 oz
  0.10 lot = 10 oz
  0.01 lot = 1 oz

  1 pip = 0.01

  BUY  = (Sortie - Entrée) × 100
  SELL = (Entrée - Sortie) × 100

  ==========================================================

  FOREX NON-JPY

  EURUSD
  GBPUSD
  AUDUSD
  NZDUSD

  BUY  = (Sortie - Entrée) × 10000
  SELL = (Entrée - Sortie) × 10000

  Pip value = $10 / lot

  ==========================================================

  USDCAD

  multiplier = 10000
  pip value  = 10 / prix

  ==========================================================

  USDCHF

  multiplier = 10000
  pip value  = 10 × prix

  ==========================================================

  USDJPY

  multiplier = 100
  pip value  = 1000 / prix

  ==========================================================
*/


/* =========================================================
   APPLICATION VERSION
========================================================= */

const APP_VERSION = 3;

const STORAGE_KEYS = {

  trades:
    "trading-plan-trades",

  capitals:
    "trading-plan-capitals",

  plan:
    "trading-plan-settings",

  metadata:
    "trading-plan-metadata"

};


/* =========================================================
   SAFE STORAGE
========================================================= */

function loadJSON(
  key,
  fallback = null
) {

  try {

    const raw =
      localStorage.getItem(
        key
      );

    if (
      raw === null ||
      raw === ""
    ) {

      return fallback;

    }


    const value =
      JSON.parse(
        raw
      );


    return value ?? fallback;

  } catch (
    error
  ) {

    console.warn(
      `Impossible de lire "${key}" depuis localStorage.`,
      error
    );


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
      JSON.stringify(
        value
      )
    );


    return true;

  } catch (
    error
  ) {

    console.error(
      `Impossible d'enregistrer "${key}" dans localStorage.`,
      error
    );


    return false;

  }

}


function saveMetadata() {

  saveJSON(
    STORAGE_KEYS.metadata,
    {

      version:
        APP_VERSION,

      updatedAt:
        new Date().toISOString()

    }
  );

}


/* =========================================================
   DATA STATE
========================================================= */

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
        typeof trade === "object"
    );


  capitals =
    capitals.filter(
      capital =>
        capital &&
        typeof capital === "object"
    );


  trades =
    trades.map(
      trade => ({

        ...trade,

        id:
          trade.id ||
          createId(
            "trade-"
          ),

        pnl:
          Number(
            trade.pnl
          ) || 0,

        r:
          Number(
            trade.r
          ) || 0,

        lot:
          Number(
            trade.lot
          ) || 0,

        rr:
          Number(
            trade.rr
          ) || 0

      })
    );


  capitals =
    capitals.map(
      capital => ({

        ...capital,

        id:
          capital.id ||
          createId(
            "capital-"
          ),

        initialCapital:
          Number(
            capital.initialCapital
          ) || 0,

        riskPercent:
          Number(
            capital.riskPercent
          ) || 0,

        riskAmount:
          Number(
            capital.riskAmount
          ) || 0,

        defaultRR:
          Number(
            capital.defaultRR
          ) || 2,

        status:
          capital.status ===
          "active"
            ? "active"
            : "archived"

      })
    );

}


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


/* =========================================================
   PLAN STORAGE
========================================================= */

function loadPlan() {

  return loadJSON(
    STORAGE_KEYS.plan,
    {}
  );

}


function savePlan(
  plan
) {

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
   FORMATTERS
========================================================= */

function formatMoney(
  value
) {

  const number =
    Number(
      value
    ) || 0;


  return new Intl.NumberFormat(
    "en-US",
    {

      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2

    }
  ).format(
    number
  );

}


function formatPercent(
  value
) {

  return `${(
    Number(
      value
    ) || 0
  ).toFixed(2)}%`;

}


function formatNumber(
  value,
  decimals = 2
) {

  return (
    Number(
      value
    ) || 0
  ).toFixed(
    decimals
  );

}


function escapeHTML(
  value
) {

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


function formatDate(
  dateString
) {

  if (
    !dateString
  ) {

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
    "fr-FR",
    {

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric"

    }
  );

}


function formatPrice(
  asset,
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    ) ||
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
      .slice(
        2,
        8
      )
  );

}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

const pageInformation = {

  dashboard: {

    title:
      "Dashboard",

    description:
      "Vue générale de ta performance."

  },

  journal: {

    title:
      "Journal",

    description:
      "Enregistre et analyse chaque opération."

  },

  capitals: {

    title:
      "Capitaux",

    description:
      "Gère tes capitaux actifs et archivés."

  },

  plan: {

    title:
      "Plan de trading",

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


  if (
    page
  ) {

    page.classList.add(
      "active"
    );

  }


  if (
    button
  ) {

    button.classList.add(
      "active"
    );

  }


  if (
    pageInformation[
      pageName
    ]
  ) {

    if (
      pageTitle
    ) {

      pageTitle.textContent =
        pageInformation[
          pageName
        ].title;

    }


    if (
      pageDescription
    ) {

      pageDescription.textContent =
        pageInformation[
          pageName
        ].description;

    }

  }


  window.scrollTo(
    {

      top:
        0,

      behavior:
        "smooth"

    }
  );

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
   MODAL HELPERS
========================================================= */

let activeModal =
  null;


function openModal(
  modal
) {

  if (
    !modal
  ) {

    return;

  }


  modal.classList.add(
    "active"
  );


  activeModal =
    modal;


  document.body.classList.add(
    "modal-open"
  );

}


function closeModal(
  modal
) {

  if (
    !modal
  ) {

    return;

  }


  modal.classList.remove(
    "active"
  );


  if (
    activeModal ===
    modal
  ) {

    activeModal =
      null;

  }


  if (
    !document.querySelector(
      ".modal.active"
    )
  ) {

    document.body.classList.remove(
      "modal-open"
    );

  }

}


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
   CAPITAL MANAGEMENT
========================================================= */

function getActiveCapital() {

  return (
    capitals.find(
      capital =>
        capital.status ===
        "active"
    ) || null
  );

}


function getCapitalById(
  id
) {

  return (
    capitals.find(
      capital =>
        capital.id ===
        id
    ) || null
  );

}


function getCapitalBalance(
  capital
) {

  if (
    !capital
  ) {

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
          new Date(
            a.date
          ) -
          new Date(
            b.date
          )
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
    balance actuelle × risque %

  Fixed :
    montant fixe
*/

function getCapitalRisk(
  capital
) {

  if (
    !capital
  ) {

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

  if (
    !capital
  ) {

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
      capital.riskAmount
    ) /
    balance
  ) *
  100;

}


/*
  Garantit qu'il n'existe jamais plusieurs
  capitaux actifs simultanément.
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
  Si le capital actif est archivé et qu'un
  autre capital existe, on active automatiquement
  le capital archivé le plus récemment créé.
*/

function ensureActiveCapitalExists() {

  const active =
    getActiveCapital();


  if (
    active
  ) {

    return active;

  }


  if (
    !capitals.length
  ) {

    return null;

  }


  const candidate =
    [...capitals]
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
      )[0];


  if (
    !candidate
  ) {

    return null;

  }


  candidate.status =
    "active";


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  return candidate;

}


function openCapitalModal(
  capital = null
) {

  if (
    !capitalModal
  ) {

    return;

  }


  openModal(
    capitalModal
  );


  const title =
    document.getElementById(
      "capital-modal-title"
    );


  if (
    title
  ) {

    title.textContent =
      capital
        ? "Modifier le capital"
        : "Nouveau capital";

  }


  document.getElementById(
    "capital-id"
  ).value =
    capital?.id || "";


  document.getElementById(
    "capital-name"
  ).value =
    capital?.name || "";


  document.getElementById(
    "capital-initial"
  ).value =
    capital?.initialCapital ?? "";


  document.getElementById(
    "capital-risk-mode"
  ).value =
    capital?.riskMode ||
    "percentage";


  document.getElementById(
    "capital-risk-percent"
  ).value =
    capital?.riskPercent ?? 1;


  document.getElementById(
    "capital-risk-amount"
  ).value =
    capital?.riskAmount ?? "";


  document.getElementById(
    "capital-default-rr"
  ).value =
    capital?.defaultRR ?? 2;


  updateCapitalRiskMode();

}


function closeCapitalModal() {

  closeModal(
    capitalModal
  );

}


function updateCapitalRiskMode() {

  const mode =
    document.getElementById(
      "capital-risk-mode"
    )?.value;


  const percentGroup =
    document.getElementById(
      "capital-risk-percent-group"
    );


  const amountGroup =
    document.getElementById(
      "capital-risk-amount-group"
    );


  if (
    percentGroup
  ) {

    percentGroup.classList.toggle(
      "hidden",
      mode !==
      "percentage"
    );

  }


  if (
    amountGroup
  ) {

    amountGroup.classList.toggle(
      "hidden",
      mode !==
      "fixed"
    );

  }

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


    if (
      !name
    ) {

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
      riskPercent <= 0
    ) {

      alert(
        "Le risque en pourcentage doit être supérieur à 0."
      );

      return;

    }


    if (
      riskMode ===
      "fixed" &&
      riskAmount <= 0
    ) {

      alert(
        "Le risque fixe doit être supérieur à 0."
      );

      return;

    }


    if (
      id
    ) {

      const capital =
        getCapitalById(
          id
        );


      if (
        !capital
      ) {

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


    saveJSON(
      STORAGE_KEYS.capitals,
      capitals
    );


    saveMetadata();


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
);


function editCapital(
  id
) {

  const capital =
    getCapitalById(
      id
    );


  if (
    !capital
  ) {

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


  if (
    !capital
  ) {

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


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  ensureActiveCapitalExists();

  updateAll();

}


function activateCapital(
  id
) {

  const capital =
    getCapitalById(
      id
    );


  if (
    !capital
  ) {

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


  if (
    !capital
  ) {

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


  if (
    !confirmed
  ) {

    return;

  }


  capitals =
    capitals.filter(
      item =>
        item.id !== id
    );


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  ensureActiveCapitalExists();

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


  const active =
    getActiveCapital();


  const archived =
    capitals.filter(
      capital =>
        capital.status ===
        "archived"
    );


  if (
    !active
  ) {

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


  if (
    !archived.length
  ) {

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


  if (
    activeName
  ) {

    activeName.textContent =
      active
        ? active.name
        : "Aucun";

  }


  if (
    activeBalance
  ) {

    activeBalance.textContent =
      active
        ? formatMoney(
            getCapitalBalance(
              active
            )
          )
        : "$0.00";

  }


  if (
    archivedCount
  ) {

    archivedCount.textContent =
      archived.length;

  }


  const globalStats =
    calculateGlobalStatistics();


  const globalPnl =
    document.getElementById(
      "capitals-global-pnl"
    );


  if (
    globalPnl
  ) {

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
    capital.initialCapital;


  const risk =
    getCapitalRisk(
      capital
    );


  const pnlClass =
    pnl >= 0
      ? "pnl-positive"
      : "pnl-negative";


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
  0.01;


const ASSET_CONFIG = {

  XAUUSD: {

    multiplier:
      100,

    pipValue:
      1

  },

  EURUSD: {

    multiplier:
      10000,

    pipValue:
      10

  },

  GBPUSD: {

    multiplier:
      10000,

    pipValue:
      10

  },

  AUDUSD: {

    multiplier:
      10000,

    pipValue:
      10

  },

  NZDUSD: {

    multiplier:
      10000,

    pipValue:
      10

  },

  USDJPY: {

    multiplier:
      100,

    dynamicPipValue:
      true

  },

  USDCAD: {

    multiplier:
      10000,

    dynamicPipValue:
      true

  },

  USDCHF: {

    multiplier:
      10000,

    dynamicPipValue:
      true

  }

};


function normalizeLot(
  lot
) {

  const numericLot =
    Number(
      lot
    ) || 0;


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
    normalized.toFixed(
      2
    )
  );

}


function getPipDistance(
  asset,
  price1,
  price2
) {

  const config =
    ASSET_CONFIG[
      asset
    ];


  if (
    !config
  ) {

    return 0;

  }


  const p1 =
    Number(
      price1
    ) || 0;


  const p2 =
    Number(
      price2
    ) || 0;


  if (
    p1 <= 0 ||
    p2 <= 0
  ) {

    return 0;

  }


  return Math.abs(
    p1 -
    p2
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
    ASSET_CONFIG[
      asset
    ];


  if (
    !config
  ) {

    return 0;

  }


  const entryPrice =
    Number(
      entry
    ) || 0;


  const exitPrice =
    Number(
      exit
    ) || 0;


  if (
    entryPrice <= 0 ||
    exitPrice <= 0
  ) {

    return 0;

  }


  if (
    direction ===
    "BUY"
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
    ASSET_CONFIG[
      asset
    ];


  if (
    !config
  ) {

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
    Number(
      price
    ) || 0;


  if (
    numericPrice <= 0
  ) {

    return 0;

  }


  if (
    asset ===
    "USDJPY"
  ) {

    return (
      1000 /
      numericPrice
    );

  }


  if (
    asset ===
    "USDCAD"
  ) {

    return (
      10 /
      numericPrice
    );

  }


  if (
    asset ===
    "USDCHF"
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
      Number(
        lot
      ) || 0
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
    Number(
      lot
    ) || 0;


  return (
    slPips *
    pipValue *
    numericLot
  );

}


/* =========================================================
   TRADE MODAL
========================================================= */

function openTradeModal() {

  const active =
    getActiveCapital();


  if (
    !active
  ) {

    alert(
      "Aucun capital actif. Crée ou active un capital avant d'ajouter un trade."
    );


    showPage(
      "capitals"
    );


    return;

  }


  openModal(
    tradeModal
  );


  document.getElementById(
    "trade-date"
  ).value =
    getDefaultDateTime();


  document.getElementById(
    "trade-active-capital-name"
  ).textContent =
    active.name;


  document.getElementById(
    "trade-balance-display"
  ).textContent =
    formatMoney(
      getCapitalBalance(
        active
      )
    );


  document.getElementById(
    "trade-risk-display"
  ).textContent =
    formatMoney(
      getCapitalRisk(
        active
      )
    );


  document.getElementById(
    "trade-rr"
  ).value =
    String(
      active.defaultRR ||
      2
    );


  document.getElementById(
    "trade-result"
  ).value =
    "TP";


  document.getElementById(
    "trade-be-exit"
  ).value =
    "";


  document
    .getElementById(
      "be-exit-group"
    )
    .classList.add(
      "hidden"
    );


  updateTradeCalculations();

}


function closeTradeModal() {

  closeModal(
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
    )?.value;


  const direction =
    document.getElementById(
      "trade-direction"
    )?.value;


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
    )?.value;


  const beExit =
    Number(
      document.getElementById(
        "trade-be-exit"
      )?.value
    ) || 0;


  if (
    !capital
  ) {

    return {

      riskMoney:
        0,

      slPips:
        0,

      pipValuePerLot:
        0,

      lotRaw:
        0,

      lot:
        0,

      riskAtStop:
        0,

      riskDifference:
        0,

      riskPercentOfCapital:
        0,

      tp:
        0,

      exitPrice:
        0,

      realizedPips:
        0,

      pnl:
        0,

      r:
        0

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


  let lotRaw =
    0;


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


  let tp =
    0;


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
      direction ===
      "BUY"
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


  let exitPrice =
    0;


  if (
    result ===
    "TP"
  ) {

    exitPrice =
      tp;

  }


  if (
    result ===
    "SL"
  ) {

    exitPrice =
      sl;

  }


  if (
    result ===
    "BE"
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


  const riskMoneyElement =
    document.getElementById(
      "trade-risk-money"
    );


  if (
    riskMoneyElement
  ) {

    riskMoneyElement.textContent =
      formatMoney(
        values.riskMoney
      );

  }


  const slPipsElement =
    document.getElementById(
      "trade-sl-pips"
    );


  if (
    slPipsElement
  ) {

    slPipsElement.textContent =
      `${formatNumber(
        values.slPips,
        1
      )} pips`;

  }


  const lotElement =
    document.getElementById(
      "trade-lot"
    );


  if (
    lotElement
  ) {

    lotElement.textContent =
      `${formatNumber(
        values.lot,
        2
      )} lot`;

  }


  const lotValueElement =
    document.getElementById(
      "trade-lot-value"
    );


  if (
    lotValueElement
  ) {

    lotValueElement.value =
      values.lot.toFixed(
        4
      );

  }


  const asset =
    document.getElementById(
      "trade-asset"
    )?.value;


  const priceDecimals =
    asset === "XAUUSD" ||
    asset === "USDJPY"
      ? 2
      : 5;


  const tpDisplay =
    document.getElementById(
      "trade-tp-display"
    );


  if (
    tpDisplay
  ) {

    tpDisplay.textContent =
      values.tp > 0
        ? formatNumber(
            values.tp,
            priceDecimals
          )
        : "—";

  }


  const tpInput =
    document.getElementById(
      "trade-tp"
    );


  if (
    tpInput
  ) {

    tpInput.value =
      values.tp > 0
        ? values.tp
        : "";

  }


  const exitDisplay =
    document.getElementById(
      "trade-exit-display"
    );


  if (
    exitDisplay
  ) {

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


  if (
    realizedPips
  ) {

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


  if (
    pnlElement
  ) {

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


  if (
    rElement
  ) {

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


  if (
    riskCheckElement
  ) {

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


  if (
    group
  ) {

    group.classList.toggle(
      "hidden",
      result !==
      "BE"
    );

  }

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


    if (
      !element
    ) {

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


    if (
      !capital
    ) {

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


    if (
      !Number.isFinite(
        entry
      ) ||
      entry <= 0 ||
      !Number.isFinite(
        sl
      ) ||
      sl <= 0
    ) {

      alert(
        "Entre un prix d'entrée et un Stop Loss valides."
      );

      return;

    }


    if (
      direction ===
      "BUY" &&
      sl >= entry
    ) {

      alert(
        "Pour un BUY, le Stop Loss doit être inférieur au prix d'entrée."
      );

      return;

    }


    if (
      direction ===
      "SELL" &&
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
        0.01,
        values.riskMoney *
        0.000001
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
      result ===
      "BE" &&
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
        document.getElementById(
          "trade-date"
        ).value,

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


    if (
      !saveJSON(
        STORAGE_KEYS.trades,
        trades
      )
    ) {

      trades.pop();

      alert(
        "Impossible d'enregistrer le trade. Vérifie l'espace disponible du navigateur."
      );

      return;

    }


    saveMetadata();


    tradeForm.reset();


    document.getElementById(
      "trade-date"
    ).value =
      getDefaultDateTime();


    document.getElementById(
      "be-exit-group"
    )
      ?.classList.add(
        "hidden"
      );


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


  if (
    !confirmed
  ) {

    return;

  }


  trades =
    trades.filter(
      trade =>
        trade.id !==
        id
    );


  saveJSON(
    STORAGE_KEYS.trades,
    trades
  );


  saveMetadata();


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
    )?.value;


  if (
    filter ===
    "active"
  ) {

    const active =
      getActiveCapital();


    if (
      !active
    ) {

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


  if (
    !tbody
  ) {

    return;

  }


  const noCapital =
    document.getElementById(
      "journal-no-capital"
    );


  const active =
    getActiveCapital();


  if (
    noCapital
  ) {

    noCapital.classList.toggle(
      "hidden",
      Boolean(
        active
      )
    );

  }


  const filtered =
    getFilteredJournalTrades();


  const summary =
    document.getElementById(
      "journal-summary"
    );


  if (
    summary
  ) {

    summary.textContent =
      `${filtered.length} trade${
        filtered.length >
        1
          ? "s"
          : ""
      }`;

  }


  if (
    !filtered.length
  ) {

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
    [
      ...filtered
    ].sort(
      (a, b) =>
        new Date(
          b.date
        ) -
        new Date(
          a.date
        )
    );


  tbody.innerHTML =
    sortedTrades
      .map(
        trade => {

          const pnl =
            Number(
              trade.pnl ||
              0
            );


          const pnlClass =
            pnl >= 0
              ? "pnl-positive"
              : "pnl-negative";


          const resultClass =
            trade.result ===
            "TP"
              ? "result-tp"
              : trade.result ===
                "SL"
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
                  onclick="deleteTrade('${escapeHTML(
                    trade.id
                  )}')"
                  title="Supprimer"
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


  if (
    !tbody
  ) {

    return;

  }


  if (
    !trades.length
  ) {

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
    [
      ...trades
    ]
      .sort(
        (a, b) =>
          new Date(
            b.date
          ) -
          new Date(
            a.date
          )
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
              trade.pnl ||
              0
            );


          const pnlClass =
            pnl >= 0
              ? "pnl-positive"
              : "pnl-negative";


          const resultClass =
            trade.result ===
            "TP"
              ? "result-tp"
              : trade.result ===
                "SL"
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

  const totalTrades =
    tradeList.length;


  const wins =
    tradeList.filter(
      trade =>
        trade.result ===
        "TP"
    ).length;


  const losses =
    tradeList.filter(
      trade =>
        trade.result ===
        "SL"
    ).length;


  const breakeven =
    tradeList.filter(
      trade =>
        trade.result ===
        "BE"
    ).length;


  const totalPnl =
    tradeList.reduce(
      (
        sum,
        trade
      ) =>
        sum +
        Number(
          trade.pnl ||
          0
        ),
      0
    );


  const currentCapital =
    Number(
      startingCapital
    ) +
    totalPnl;


  const winRate =
    wins + losses >
    0
      ? wins /
        (
          wins +
          losses
        ) *
        100
      : 0;


  const grossProfit =
    tradeList
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
      tradeList
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
      ? tradeList.reduce(
          (
            sum,
            trade
          ) =>
            sum +
            Number(
              trade.r ||
              0
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

  if (
    !capital
  ) {

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
  IMPORTANT :

  La performance globale ne doit PAS considérer
  l'ensemble des capitaux initiaux comme un seul
  compte.

  On additionne uniquement les performances
  réalisées par les trades.

  Cela permet de mesurer correctement :

  P&L global =
    P&L Capital A
    +
    P&L Capital B
    +
    ...

  Le nombre total de capitaux reste affiché
  séparément.
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
          trade.pnl ||
          0
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
      Boolean(
        active
      )
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


  if (
    !active
  ) {

    updateGlobalPerformance();

    return;

  }


  const filter =
    document.getElementById(
      "dashboard-capital-filter"
    )?.value ||
    "active";


  let stats;


  let dashboardStartingCapital;


  let dashboardTrades;


  if (
    filter ===
    "all"
  ) {

    stats =
      calculateGlobalStatistics();


    dashboardTrades =
      [
        ...trades
      ];


    /*
      Pour la vue globale, on affiche le
      P&L cumulé des trades.

      Le capital de départ n'est pas présenté
      comme la somme des capitaux initiaux,
      car plusieurs capitaux indépendants
      peuvent avoir existé à des périodes
      différentes.
    */

    dashboardStartingCapital =
      0;

  } else {

    stats =
      calculateCapitalStatistics(
        active
      );


    dashboardTrades =
      trades.filter(
        trade =>
          trade.capitalId ===
          active.id
      );


    dashboardStartingCapital =
      active.initialCapital;

  }


  const dashboardCapital =
    document.getElementById(
      "dashboard-capital"
    );


  if (
    dashboardCapital
  ) {

    dashboardCapital.textContent =
      filter === "all"
        ? formatMoney(
            stats.totalPnl
          )
        : formatMoney(
            stats.currentCapital
          );

  }


  const startingElement =
    document.getElementById(
      "dashboard-start-capital"
    );


  if (
    startingElement
  ) {

    startingElement.textContent =
      filter === "all"
        ? "—"
        : formatMoney(
            dashboardStartingCapital
          );

  }


  const pnlElement =
    document.getElementById(
      "dashboard-pnl"
    );


  if (
    pnlElement
  ) {

    pnlElement.textContent =
      formatMoney(
        stats.totalPnl
      );

  }


  const pnlPercentElement =
    document.getElementById(
      "dashboard-pnl-percent"
    );


  if (
    pnlPercentElement
  ) {

    const pnlPercent =
      dashboardStartingCapital >
      0
        ? (
            stats.totalPnl /
            dashboardStartingCapital
          ) *
          100
        : 0;


    pnlPercentElement.textContent =
      filter === "all"
        ? "Performance cumulée"
        : formatPercent(
            pnlPercent
          );

  }


  const winRateElement =
    document.getElementById(
      "dashboard-winrate"
    );


  if (
    winRateElement
  ) {

    winRateElement.textContent =
      formatPercent(
        stats.winRate
      );

  }


  const wlElement =
    document.getElementById(
      "dashboard-wl"
    );


  if (
    wlElement
  ) {

    wlElement.textContent =
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


  if (
    tradesElement
  ) {

    tradesElement.textContent =
      stats.totalTrades;

  }


  const profitFactorElement =
    document.getElementById(
      "dashboard-profit-factor"
    );


  if (
    profitFactorElement
  ) {

    profitFactorElement.textContent =
      stats.profitFactor ===
      Infinity
        ? "∞"
        : formatNumber(
            stats.profitFactor,
            2
          );

  }


  const avgRElement =
    document.getElementById(
      "dashboard-avg-r"
    );


  if (
    avgRElement
  ) {

    avgRElement.textContent =
      `${formatNumber(
        stats.avgR,
        2
      )}R`;

  }


  const drawdown =
    calculateMaxDrawdown(
      dashboardStartingCapital,
      dashboardTrades
    );


  const drawdownElement =
    document.getElementById(
      "dashboard-drawdown"
    );


  if (
    drawdownElement
  ) {

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
    dashboardStartingCapital
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
        ? "Performance cumulée de tous les trades."
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


  if (
    globalPnl
  ) {

    globalPnl.textContent =
      formatMoney(
        stats.totalPnl
      );

  }


  const globalTrades =
    document.getElementById(
      "global-trades"
    );


  if (
    globalTrades
  ) {

    globalTrades.textContent =
      stats.totalTrades;

  }


  const globalWinrate =
    document.getElementById(
      "global-winrate"
    );


  if (
    globalWinrate
  ) {

    globalWinrate.textContent =
      formatPercent(
        stats.winRate
      );

  }


  const globalCapitals =
    document.getElementById(
      "global-capitals"
    );


  if (
    globalCapitals
  ) {

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
    [
      ...tradeList
    ].sort(
      (a, b) =>
        new Date(
          a.date
        ) -
        new Date(
          b.date
        )
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
          trade.pnl ||
          0
        );


      if (
        equity >
        peak
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
    [
      ...tradeList
    ].sort(
      (a, b) =>
        new Date(
          a.date
        ) -
        new Date(
          b.date
        )
    );


  let currentType =
    null;


  let currentCount =
    0;


  for (
    let i =
      ordered.length -
      1;

    i >= 0;

    i--
  ) {

    const trade =
      ordered[i];


    let type;


    if (
      trade.result ===
      "TP"
    ) {

      type =
        "win";

    } else if (
      trade.result ===
      "SL"
    ) {

      type =
        "loss";

    } else {

      break;

    }


    if (
      currentType ===
      null
    ) {

      currentType =
        type;

      currentCount =
        1;

    } else if (
      currentType ===
      type
    ) {

      currentCount++;

    } else {

      break;

    }

  }


  element.textContent =
    currentCount;


  if (
    currentType ===
    "win"
  ) {

    label.textContent =
      "Gains consécutifs";

  } else if (
    currentType ===
    "loss"
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


  if (
    !container
  ) {

    return;

  }


  if (
    !tradeList.length
  ) {

    container.innerHTML =
      `
        <div class="empty-chart">
          Aucun trade enregistré.
        </div>
      `;

    return;

  }


  const ordered =
    [
      ...tradeList
    ].sort(
      (a, b) =>
        new Date(
          a.date
        ) -
        new Date(
          b.date
        )
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
          trade.pnl ||
          0
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
            points.length ===
            1
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
      .join(
        " "
      );


  container.innerHTML =
    `
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        width="100%"
        height="220"
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


        if (
          !key
        ) {

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


        if (
          !key
        ) {

          return;

        }


        checkbox.checked =
          Boolean(
            state[
              key
            ]
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


  if (
    progress
  ) {

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
    completed ===
      total;


  if (
    permission
  ) {

    permission.classList.toggle(
      "allowed",
      allCompleted
    );


    permission.classList.toggle(
      "blocked",
      !allCompleted
    );

  }


  if (
    permissionTitle
  ) {

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
            total - completed >
            1
              ? "s"
              : ""
          } restante${
            total - completed >
            1
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

    version:
      APP_VERSION

  };


  savePlan(
    plan
  );


  updatePlanChecklistProgress();


  alert(
    "Plan de trading sauvegardé."
  );

}


const savePlanButton =
  document.getElementById(
    "save-plan"
  );


if (
  savePlanButton
) {

  savePlanButton.addEventListener(
    "click",
    saveCurrentPlan
  );

}


const resetPlanButton =
  document.getElementById(
    "reset-plan-checklist"
  );


if (
  resetPlanButton
) {

  resetPlanButton.addEventListener(
    "click",
    () => {

      const confirmed =
        window.confirm(
          "Réinitialiser toute la checklist du plan de trading ?"
        );


      if (
        !confirmed
      ) {

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


  if (
    !element
  ) {

    return;

  }


  const date =
    new Date();


  element.textContent =
    date.toLocaleDateString(
      "fr-FR",
      {

        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric"

      }
    );

}


/* =========================================================
   APPLICATION METADATA
========================================================= */

function initializeMetadata() {

  const metadata =
    loadJSON(
      STORAGE_KEYS.metadata,
      null
    );


  if (
    !metadata ||
    metadata.version !==
    APP_VERSION
  ) {

    saveMetadata();

  }

}


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeApplication() {

  refreshDataFromStorage();

  initializeMetadata();

  ensureSingleActiveCapital();

  ensureActiveCapitalExists();

  setCurrentDate();

  loadPlanIntoForm();


  const tradeDate =
    document.getElementById(
      "trade-date"
    );


  if (
    tradeDate
  ) {

    tradeDate.value =
      getDefaultDateTime();

  }


  updateAll();

}


/*
  Le script est normalement chargé à la fin
  du <body>.

  Cette sécurité permet également son utilisation
  si sa position est déplacée dans index.html.
*/

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication,
    {
      once:
        true
    }
  );

} else {

  initializeApplication();

}
