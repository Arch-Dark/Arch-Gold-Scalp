"use strict";

/*
  ==========================================================
  TRADING PLAN - APPLICATION V2
  ==========================================================

  CALCUL DU RISQUE / LOT

  Le lot est toujours calculé à partir de :

  Risque du capital
        ↓
  Distance Entrée → SL
        ↓
  Distance en pips
        ↓
  Valeur du pip pour 1 lot
        ↓
  Taille du lot automatique

  FORMULE GÉNÉRALE :

  Lot brut =
    Risque monétaire /
    (SL en pips × valeur du pip pour 1 lot)

  ==========================================================

  GOLD - XAUUSD

  1 lot    = 100 oz = $1.00 / pip
  0.10 lot = 10 oz  = $0.10 / pip
  0.01 lot = 1 oz   = $0.01 / pip

  Pips Gold :

  BUY  = (Sortie - Entrée) × 100
  SELL = (Entrée - Sortie) × 100

  Exemple :

  2000.00 → 2005.00
  Variation = 5.00 $
  Pips = 5 × 100
       = +500 pips

  ==========================================================

  FOREX NON-JPY

  EURUSD
  USDCAD
  NZDUSD
  AUDUSD
  GBPUSD
  USDCHF

  Pips :

  BUY  = (Sortie - Entrée) × 10000
  SELL = (Entrée - Sortie) × 10000

  ==========================================================

  FOREX JPY

  USDJPY

  Pips :

  BUY  = (Sortie - Entrée) × 100
  SELL = (Entrée - Sortie) × 100

  ==========================================================
*/


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {
  trades: "trading-plan-trades",
  capitals: "trading-plan-capitals",
  plan: "trading-plan-settings"
};


function loadJSON(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}


function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


let trades = loadJSON(STORAGE_KEYS.trades, []);
let capitals = loadJSON(STORAGE_KEYS.capitals, []);


function loadPlan() {
  return loadJSON(STORAGE_KEYS.plan, {});
}


function savePlan(plan) {
  saveJSON(STORAGE_KEYS.plan, plan);
}


/* =========================================================
   DOM
========================================================= */

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-button");

const pageTitle =
  document.getElementById("page-title");

const pageDescription =
  document.getElementById("page-description");

const tradeModal =
  document.getElementById("trade-modal");

const tradeForm =
  document.getElementById("trade-form");

const capitalModal =
  document.getElementById("capital-modal");

const capitalForm =
  document.getElementById("capital-form");


/* =========================================================
   FORMATTERS
========================================================= */

function formatMoney(value) {

  const number =
    Number(value) || 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);

}


function formatPercent(value) {

  return `${(Number(value) || 0).toFixed(2)}%`;

}


function formatNumber(value, decimals = 2) {

  return (Number(value) || 0).toFixed(decimals);

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function formatDate(dateString) {

  if (!dateString) {
    return "—";
  }

  const date =
    new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "fr-FR",
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
    now.getTimezoneOffset() * 60000;

  return new Date(
    now.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);

}


function createId(prefix = "") {

  return (
    prefix +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );

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


function showPage(pageName) {

  pages.forEach(page => {
    page.classList.remove("active");
  });


  navButtons.forEach(button => {
    button.classList.remove("active");
  });


  const page =
    document.getElementById(
      `page-${pageName}`
    );


  const button =
    document.querySelector(
      `.nav-button[data-page="${pageName}"]`
    );


  if (page) {
    page.classList.add("active");
  }


  if (button) {
    button.classList.add("active");
  }


  if (pageInformation[pageName]) {

    pageTitle.textContent =
      pageInformation[pageName].title;

    pageDescription.textContent =
      pageInformation[pageName].description;

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


navButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {
      showPage(button.dataset.page);
    }
  );

});


document
  .querySelectorAll("[data-page-button]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {
        showPage(
          button.dataset.pageButton
        );
      }
    );

  });


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


function getCapitalById(id) {

  return (
    capitals.find(
      capital =>
        capital.id === id
    ) || null
  );

}


function getCapitalBalance(capital) {

  if (!capital) {
    return 0;
  }


  const capitalTrades =
    trades
      .filter(
        trade =>
          trade.capitalId === capital.id
      )
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );


  return (
    Number(capital.initialCapital) +
    capitalTrades.reduce(
      (sum, trade) =>
        sum + Number(trade.pnl || 0),
      0
    )
  );

}


/*
  Risque monétaire actuel du capital.

  Si le capital utilise un pourcentage :

    Balance actuelle × risque %

  Si le capital utilise un montant fixe :

    montant fixe
*/

function getCapitalRisk(capital) {

  if (!capital) {
    return 0;
  }


  const balance =
    getCapitalBalance(capital);


  if (capital.riskMode === "fixed") {

    return Math.max(
      0,
      Number(capital.riskAmount) || 0
    );

  }


  return Math.max(
    0,
    balance *
      (Number(capital.riskPercent) || 0) /
      100
  );

}


function getCapitalRiskPercent(capital) {

  if (!capital) {
    return 0;
  }


  if (capital.riskMode === "percentage") {

    return (
      Number(capital.riskPercent) || 0
    );

  }


  const balance =
    getCapitalBalance(capital);


  if (balance <= 0) {
    return 0;
  }


  return (
    Number(capital.riskAmount || 0) /
    balance
  ) * 100;

}


function ensureSingleActiveCapital() {

  const active =
    capitals.filter(
      capital =>
        capital.status === "active"
    );


  if (active.length <= 1) {
    return;
  }


  active
    .slice(1)
    .forEach(capital => {
      capital.status = "archived";
    });


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );

}


function openCapitalModal(capital = null) {

  capitalModal.classList.add("active");


  document.getElementById(
    "capital-modal-title"
  ).textContent =
    capital
      ? "Modifier le capital"
      : "Nouveau capital";


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

  capitalModal.classList.remove(
    "active"
  );

}


function updateCapitalRiskMode() {

  const mode =
    document.getElementById(
      "capital-risk-mode"
    ).value;


  const percentGroup =
    document.getElementById(
      "capital-risk-percent-group"
    );


  const amountGroup =
    document.getElementById(
      "capital-risk-amount-group"
    );


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
  .getElementById("open-capital-modal")
  .addEventListener(
    "click",
    () => {
      openCapitalModal();
    }
  );


document
  .getElementById("close-capital-modal")
  .addEventListener(
    "click",
    closeCapitalModal
  );


document
  .getElementById("cancel-capital")
  .addEventListener(
    "click",
    closeCapitalModal
  );


document
  .getElementById("capital-risk-mode")
  .addEventListener(
    "change",
    updateCapitalRiskMode
  );


capitalModal.addEventListener(
  "click",
  event => {

    if (event.target === capitalModal) {
      closeCapitalModal();
    }

  }
);


capitalForm.addEventListener(
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
      !Number.isFinite(initialCapital) ||
      initialCapital <= 0
    ) {

      alert(
        "Le capital initial doit être supérieur à 0."
      );

      return;
    }


    if (
      riskMode === "percentage" &&
      riskPercent <= 0
    ) {

      alert(
        "Le risque en pourcentage doit être supérieur à 0."
      );

      return;
    }


    if (
      riskMode === "fixed" &&
      riskAmount <= 0
    ) {

      alert(
        "Le risque fixe doit être supérieur à 0."
      );

      return;
    }


    if (id) {

      const capital =
        getCapitalById(id);


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
          createId("capital-"),

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


function editCapital(id) {

  const capital =
    getCapitalById(id);


  if (!capital) {
    return;
  }


  openCapitalModal(
    capital
  );

}


function archiveCapital(id) {

  const capital =
    getCapitalById(id);


  if (!capital) {
    return;
  }


  if (
    capital.status !== "active"
  ) {
    return;
  }


  capital.status =
    "archived";


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  updateAll();

}


function activateCapital(id) {

  const capital =
    getCapitalById(id);


  if (!capital) {
    return;
  }


  capitals.forEach(
    item => {

      if (item.id !== id) {
        item.status =
          "archived";
      }

    }
  );


  capital.status =
    "active";


  saveJSON(
    STORAGE_KEYS.capitals,
    capitals
  );


  updateAll();

}


function deleteCapital(id) {

  const capital =
    getCapitalById(id);


  if (!capital) {
    return;
  }


  const linkedTrades =
    trades.filter(
      trade =>
        trade.capitalId === id
    );


  if (linkedTrades.length > 0) {

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


  const active =
    getActiveCapital();


  const archived =
    capitals.filter(
      capital =>
        capital.status === "archived"
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


  document.getElementById(
    "active-capital-name"
  ).textContent =
    active
      ? active.name
      : "Aucun";


  document.getElementById(
    "active-capital-balance"
  ).textContent =
    active
      ? formatMoney(
          getCapitalBalance(active)
        )
      : "$0.00";


  document.getElementById(
    "archived-capitals-count"
  ).textContent =
    archived.length;


  const globalStats =
    calculateGlobalStatistics();


  document.getElementById(
    "capitals-global-pnl"
  ).textContent =
    formatMoney(
      globalStats.totalPnl
    );

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

/*
  LOT_STEP

  Le calcul peut produire une taille très précise.

  Exemple :
    0.203847...

  Comme le journal utilise des tailles de lot
  par incrément de 0.01, on arrondit vers le bas.

  Pourquoi vers le bas ?

  Pour ne JAMAIS dépasser le risque maximum
  défini par le capital.

  Exemple :

    Risque autorisé = $100
    Lot théorique   = 0.2038

    Lot utilisé     = 0.20

  Le risque réel sera inférieur ou égal
  au risque maximum.
*/

const LOT_STEP = 0.01;


/*
  Configuration des instruments.

  pipMultiplier :

  Gold  : 100
  JPY   : 100
  Forex : 10000

  pipValue :

  Valeur d'un pip pour 1.00 lot.
*/

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


/*
  Normalisation du lot.

  On arrondit vers le bas au pas de 0.01
  afin de ne jamais dépasser le risque demandé.
*/

function normalizeLot(lot) {

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


/*
  Distance en pips.

  Cette fonction retourne une distance POSITIVE.

  Elle est utilisée pour le calcul du lot.

  Exemple Gold :

    2000 → 1995
    |2000 - 1995| × 100
    = 500 pips
*/

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
  ) * config.multiplier;

}


/*
  Pips SIGNÉS.

  Cette fonction est utilisée pour le résultat du trade.

  BUY :

    sortie > entrée = gain
    sortie < entrée = perte

  SELL :

    sortie < entrée = gain
    sortie > entrée = perte
*/

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


/*
  Valeur d'un pip pour 1 LOT.

  GOLD :

    1.00 lot = $1 / pip

  EURUSD / GBPUSD / AUDUSD / NZDUSD :

    1.00 lot = $10 / pip

  USDJPY :

    1 pip = 1000 JPY pour 1 lot
    conversion en USD :
    1000 / USDJPY

  USDCAD :

    1 pip = 10 CAD pour 1 lot
    conversion en USD :
    10 / USDCAD

  USDCHF :

    1 pip = 10 CHF pour 1 lot
    conversion en USD :
    10 × USDCHF

  Important :

  Ces valeurs sont utilisées avec le prix
  d'entrée pour déterminer la taille de position.
*/

function getPipValue(
  asset,
  price
) {

  const config =
    ASSET_CONFIG[asset];


  if (!config) {
    return 0;
  }


  if (!config.dynamicPipValue) {

    return (
      Number(config.pipValue) || 0
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


/*
  Valeur d'un pip pour le LOT réellement utilisé.

  Exemple Gold :

    lot = 0.20
    pipValuePerLot = $1

    valeur réelle =
    $1 × 0.20
    = $0.20 / pip
*/

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


/*
  Risque théorique au SL.

  C'est la vérification principale :

    SL pips × valeur pip × lot

  Le résultat doit être <= au risque autorisé.
*/

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


  tradeModal.classList.add(
    "active"
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
      getCapitalBalance(active)
    );


  document.getElementById(
    "trade-risk-display"
  ).textContent =
    formatMoney(
      getCapitalRisk(active)
    );


  document.getElementById(
    "trade-rr"
  ).value =
    String(
      active.defaultRR || 2
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

  tradeModal.classList.remove(
    "active"
  );

}


document
  .getElementById(
    "open-trade-modal"
  )
  .addEventListener(
    "click",
    openTradeModal
  );


document
  .getElementById(
    "close-trade-modal"
  )
  .addEventListener(
    "click",
    closeTradeModal
  );


document
  .getElementById(
    "cancel-trade"
  )
  .addEventListener(
    "click",
    closeTradeModal
  );


tradeModal.addEventListener(
  "click",
  event => {

    if (
      event.target === tradeModal
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
    ) || 0;


  const sl =
    Number(
      document.getElementById(
        "trade-sl"
      ).value
    ) || 0;


  const rr =
    Number(
      document.getElementById(
        "trade-rr"
      ).value
    ) || 0;


  const result =
    document.getElementById(
      "trade-result"
    ).value;


  const beExit =
    Number(
      document.getElementById(
        "trade-be-exit"
      ).value
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


  /*
    ========================================================
    1. RISQUE DU CAPITAL
    ========================================================
  */

  const riskMoney =
    getCapitalRisk(
      capital
    );


  /*
    ========================================================
    2. DISTANCE ENTRE ENTRÉE ET SL
    ========================================================

    La distance est toujours positive.

    Exemple Gold :

      2000 → 1995
      = 5 $
      = 500 pips
  */

  const slPips =
    getPipDistance(
      asset,
      entry,
      sl
    );


  /*
    ========================================================
    3. VALEUR DU PIP POUR 1 LOT
    ========================================================
  */

  const pipValuePerLot =
    getPipValue(
      asset,
      entry
    );


  /*
    ========================================================
    4. LOT THÉORIQUE
    ========================================================

    FORMULE :

    Lot =
      Risque $
      /
      (SL pips × valeur pip / lot)

    Exemple Gold :

      $100
      /
      (500 × $1)

      = 0.20 lot
  */

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


  /*
    ========================================================
    5. LOT UTILISÉ
    ========================================================

    On arrondit vers le bas à 0.01 lot.

    Cela garantit que le risque ne dépasse
    jamais le risque défini.
  */

  const lot =
    normalizeLot(
      lotRaw
    );


  /*
    ========================================================
    6. RISQUE RÉEL AU SL
    ========================================================
  */

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


  /*
    ========================================================
    7. TP AUTOMATIQUE
    ========================================================
  */

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


  /*
    ========================================================
    8. PRIX DE SORTIE
    ========================================================
  */

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


  /*
    ========================================================
    9. PIPS RÉALISÉS
    ========================================================

    BUY :

      sortie > entrée = positif
      sortie < entrée = négatif

    SELL :

      sortie < entrée = positif
      sortie > entrée = négatif
  */

  const realizedPips =
    getSignedPips(
      asset,
      direction,
      entry,
      exitPrice
    );


  /*
    ========================================================
    10. P&L
    ========================================================

    P&L =
      pips réalisés
      × valeur pip / lot
      × lot
  */

  const pnl =
    realizedPips *
    pipValuePerLot *
    lot;


  /*
    ========================================================
    11. R
    ========================================================
  */

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


  document.getElementById(
    "trade-risk-money"
  ).textContent =
    formatMoney(
      values.riskMoney
    );


  document.getElementById(
    "trade-sl-pips"
  ).textContent =
    `${formatNumber(
      values.slPips,
      1
    )} pips`;


  document.getElementById(
    "trade-lot"
  ).textContent =
    `${formatNumber(
      values.lot,
      2
    )} lot`;


  document.getElementById(
    "trade-lot-value"
  ).value =
    values.lot.toFixed(4);


  const asset =
    document.getElementById(
      "trade-asset"
    ).value;


  const priceDecimals =
    asset === "XAUUSD" ||
    asset === "USDJPY"
      ? 2
      : 5;


  document.getElementById(
    "trade-tp-display"
  ).textContent =
    values.tp > 0
      ? formatNumber(
          values.tp,
          priceDecimals
        )
      : "—";


  document.getElementById(
    "trade-tp"
  ).value =
    values.tp > 0
      ? values.tp
      : "";


  document.getElementById(
    "trade-exit-display"
  ).textContent =
    values.exitPrice > 0
      ? formatNumber(
          values.exitPrice,
          priceDecimals
        )
      : "—";


  document.getElementById(
    "trade-realized-pips"
  ).textContent =
    `${formatNumber(
      values.realizedPips,
      1
    )} pips`;


  document.getElementById(
    "trade-pnl-display"
  ).textContent =
    formatMoney(
      values.pnl
    );


  document.getElementById(
    "trade-r-display"
  ).textContent =
    `${formatNumber(
      values.r,
      2
    )}R`;


  /*
    Affichage éventuel de la vérification du risque.

    L'élément n'est pas obligatoire dans le HTML.
    S'il existe, on le met à jour.
  */

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


  const pnlElement =
    document.getElementById(
      "trade-pnl-display"
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


  updateBEVisibility();

}


function updateBEVisibility() {

  const result =
    document.getElementById(
      "trade-result"
    ).value;


  const group =
    document.getElementById(
      "be-exit-group"
    );


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
      document.getElementById(id);


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

tradeForm.addEventListener(
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


    /*
      ======================================================
      VALIDATION DE BASE
      ======================================================
    */

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


    /*
      ======================================================
      VALIDATION DU CÔTÉ DU STOP LOSS
      ======================================================

      BUY :

        SL doit être inférieur à l'entrée.

      SELL :

        SL doit être supérieur à l'entrée.
    */

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


    /*
      ======================================================
      VALIDATION DE LA DISTANCE
      ======================================================
    */

    if (
      values.slPips <= 0
    ) {

      alert(
        "La distance entre l'entrée et le Stop Loss doit être supérieure à 0."
      );

      return;
    }


    /*
      ======================================================
      VALIDATION DU LOT
      ======================================================
    */

    if (
      values.lot <= 0
    ) {

      alert(
        "Impossible de calculer une taille de lot valide pour ce risque et cette distance de Stop Loss."
      );

      return;
    }


    /*
      ======================================================
      VALIDATION DU RISQUE
      ======================================================

      Le risque réel doit rester inférieur ou égal
      au risque autorisé.

      Une très petite différence numérique est acceptée.
    */

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


    /*
      ======================================================
      BE
      ======================================================
    */

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


    /*
      ======================================================
      TP / SL
      ======================================================
    */

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


    /*
      ======================================================
      TRADE
      ======================================================
    */

    const trade = {

      id:
        createId("trade-"),

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

      /*
        On conserve également le lot théorique
        pour garder une trace du calcul avant
        normalisation à 0.01.
      */

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


    saveJSON(
      STORAGE_KEYS.trades,
      trades
    );


    tradeForm.reset();


    document.getElementById(
      "trade-date"
    ).value =
      getDefaultDateTime();


    document.getElementById(
      "be-exit-group"
    )
      .classList.add(
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

function deleteTrade(id) {

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
    ).value;


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


  const active =
    getActiveCapital();


  noCapital.classList.toggle(
    "hidden",
    Boolean(active)
  );


  const filtered =
    getFilteredJournalTrades();


  document.getElementById(
    "journal-summary"
  ).textContent =
    `${filtered.length} trade${
      filtered.length > 1
        ? "s"
        : ""
    }`;


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


  if (!number) {
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
  .addEventListener(
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

  const totalTrades =
    tradeList.length;


  const wins =
    tradeList.filter(
      trade =>
        trade.result === "TP"
    ).length;


  const losses =
    tradeList.filter(
      trade =>
        trade.result === "SL"
    ).length;


  const breakeven =
    tradeList.filter(
      trade =>
        trade.result === "BE"
    ).length;


  const totalPnl =
    tradeList.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.pnl || 0
        ),
      0
    );


  const currentCapital =
    Number(startingCapital) +
    totalPnl;


  const winRate =
    wins + losses > 0
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
        (sum, trade) =>
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
          (sum, trade) =>
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
          (sum, trade) =>
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


function calculateGlobalStatistics() {

  const totalInitialCapital =
    capitals.reduce(
      (sum, capital) =>
        sum +
        Number(
          capital.initialCapital ||
          0
        ),
      0
    );


  return calculateStatistics(
    trades,
    totalInitialCapital
  );

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


  noCapital.classList.toggle(
    "hidden",
    Boolean(active)
  );


  content.classList.toggle(
    "hidden",
    !active
  );


  if (!active) {

    updateGlobalPerformance();

    return;
  }


  const filter =
    document.getElementById(
      "dashboard-capital-filter"
    ).value;


  let stats;


  if (
    filter === "all"
  ) {

    stats =
      calculateGlobalStatistics();

  } else {

    stats =
      calculateCapitalStatistics(
        active
      );

  }


  document.getElementById(
    "dashboard-capital"
  ).textContent =
    formatMoney(
      stats.currentCapital
    );


  const dashboardStartingCapital =
    filter === "all"
      ? (
          stats.currentCapital -
          stats.totalPnl
        )
      : active.initialCapital;


  document.getElementById(
    "dashboard-start-capital"
  ).textContent =
    formatMoney(
      dashboardStartingCapital
    );


  document.getElementById(
    "dashboard-pnl"
  ).textContent =
    formatMoney(
      stats.totalPnl
    );


  const pnlPercent =
    dashboardStartingCapital > 0
      ? (
          stats.totalPnl /
          dashboardStartingCapital
        ) *
        100
      : 0;


  document.getElementById(
    "dashboard-pnl-percent"
  ).textContent =
    formatPercent(
      pnlPercent
    );


  document.getElementById(
    "dashboard-winrate"
  ).textContent =
    formatPercent(
      stats.winRate
    );


  document.getElementById(
    "dashboard-wl"
  ).textContent =
    `${stats.wins} W / ${
      stats.losses
    } L / ${
      stats.breakeven
    } BE`;


  document.getElementById(
    "dashboard-trades"
  ).textContent =
    stats.totalTrades;


  document.getElementById(
    "dashboard-profit-factor"
  ).textContent =
    stats.profitFactor === Infinity
      ? "∞"
      : formatNumber(
          stats.profitFactor,
          2
        );


  document.getElementById(
    "dashboard-avg-r"
  ).textContent =
    `${formatNumber(
      stats.avgR,
      2
    )}R`;


  const dashboardTrades =
    filter === "all"
      ? trades
      : trades.filter(
          trade =>
            trade.capitalId ===
            active.id
        );


  const drawdown =
    calculateMaxDrawdown(
      dashboardStartingCapital,
      dashboardTrades
    );


  document.getElementById(
    "dashboard-drawdown"
  ).textContent =
    formatMoney(
      drawdown
    );


  updateStreak(
    dashboardTrades
  );


  renderEquityChart(
    dashboardTrades,
    dashboardStartingCapital
  );


  document.getElementById(
    "equity-description"
  ).textContent =
    filter === "all"
      ? "Evolution de tous les capitaux."
      : `Evolution de ${active.name}.`;


  updateGlobalPerformance();

}


document
  .getElementById(
    "dashboard-capital-filter"
  )
  .addEventListener(
    "change",
    updateDashboard
  );


function updateGlobalPerformance() {

  const stats =
    calculateGlobalStatistics();


  document.getElementById(
    "global-pnl"
  ).textContent =
    formatMoney(
      stats.totalPnl
    );


  document.getElementById(
    "global-trades"
  ).textContent =
    stats.totalTrades;


  document.getElementById(
    "global-winrate"
  ).textContent =
    formatPercent(
      stats.winRate
    );


  document.getElementById(
    "global-capitals"
  ).textContent =
    capitals.length;

}


/* =========================================================
   DRAWDOWN
========================================================= */

function calculateMaxDrawdown(
  startingCapital,
  tradeList
) {

  const ordered =
    [...tradeList].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  let equity =
    Number(startingCapital) ||
    0;


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


  if (!tradeList.length) {

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
    Number(startingCapital) ||
    0;


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
        (point, index) => {

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
   PLAN
========================================================= */

function loadPlanIntoForm() {

  const plan =
    loadPlan();


  document.getElementById(
    "plan-strategy"
  ).value =
    plan.strategy ||
    "";


  document.getElementById(
    "plan-entry"
  ).value =
    plan.entry ||
    "";


  document.getElementById(
    "plan-exit"
  ).value =
    plan.exit ||
    "";


  document.getElementById(
    "plan-risk"
  ).value =
    plan.risk ??
    1;


  document.getElementById(
    "plan-min-rr"
  ).value =
    plan.minRR ??
    2;


  document.getElementById(
    "check-trend"
  ).checked =
    Boolean(
      plan.checkTrend
    );


  document.getElementById(
    "check-setup"
  ).checked =
    Boolean(
      plan.checkSetup
    );


  document.getElementById(
    "check-risk"
  ).checked =
    Boolean(
      plan.checkRisk
    );


  document.getElementById(
    "check-news"
  ).checked =
    Boolean(
      plan.checkNews
    );


  document.getElementById(
    "check-emotion"
  ).checked =
    Boolean(
      plan.checkEmotion
    );

}


document
  .getElementById(
    "save-plan"
  )
  .addEventListener(
    "click",
    () => {

      const plan = {

        strategy:
          document.getElementById(
            "plan-strategy"
          ).value,

        entry:
          document.getElementById(
            "plan-entry"
          ).value,

        exit:
          document.getElementById(
            "plan-exit"
          ).value,

        risk:
          Number(
            document.getElementById(
              "plan-risk"
            ).value
          ),

        minRR:
          Number(
            document.getElementById(
              "plan-min-rr"
            ).value
          ),

        checkTrend:
          document.getElementById(
            "check-trend"
          ).checked,

        checkSetup:
          document.getElementById(
            "check-setup"
          ).checked,

        checkRisk:
          document.getElementById(
            "check-risk"
          ).checked,

        checkNews:
          document.getElementById(
            "check-news"
          ).checked,

        checkEmotion:
          document.getElementById(
            "check-emotion"
          ).checked

      };


      savePlan(
        plan
      );


      alert(
        "Plan de trading sauvegardé."
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

}


/* =========================================================
   CURRENT DATE
========================================================= */

function setCurrentDate() {

  const element =
    document.getElementById(
      "current-date"
    );


  const date =
    new Date();


  element.textContent =
    date.toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

setCurrentDate();

loadPlanIntoForm();

document.getElementById(
  "trade-date"
).value =
  getDefaultDateTime();

updateAll();
