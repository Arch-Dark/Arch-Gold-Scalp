"use strict";

/*
  ==========================================
  TRADING PLAN - APPLICATION V1.1
  ==========================================
  Gestion :
  - Capitaux actifs / archivés
  - Risque en % ou montant fixe
  - Trades liés au capital
  - Calculateur basé sur le capital actif
  - Dashboard basé sur le capital actif
*/


/* ==========================================
   STORAGE
   ========================================== */

const STORAGE_KEYS = {
  trades: "trading-plan-trades",
  capitals: "trading-plan-capitals",
  plan: "trading-plan-settings"
};


function loadJSON(key, fallback) {

  try {

    const data =
      JSON.parse(
        localStorage.getItem(key)
      );

    return data ?? fallback;

  } catch {

    return fallback;

  }

}


function saveJSON(key, value) {

  localStorage.setItem(
    key,
    JSON.stringify(value)
  );

}


function loadTrades() {

  return loadJSON(
    STORAGE_KEYS.trades,
    []
  );

}


function saveTrades(value) {

  saveJSON(
    STORAGE_KEYS.trades,
    value
  );

}


function loadCapitals() {

  return loadJSON(
    STORAGE_KEYS.capitals,
    []
  );

}


function saveCapitals(value) {

  saveJSON(
    STORAGE_KEYS.capitals,
    value
  );

}


function loadPlan() {

  return loadJSON(
    STORAGE_KEYS.plan,
    {}
  );

}


function savePlan(value) {

  saveJSON(
    STORAGE_KEYS.plan,
    value
  );

}


let trades = loadTrades();
let capitals = loadCapitals();


/* ==========================================
   DOM
   ========================================== */

const pages =
  document.querySelectorAll(".page");

const navButtons =
  document.querySelectorAll(".nav-button");

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


/* ==========================================
   FORMATTERS
   ========================================== */

function formatMoney(value) {

  const number =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(number);

}


function formatPercent(value) {

  return `${(
    Number(value) || 0
  ).toFixed(2)}%`;

}


function formatNumber(
  value,
  decimals = 2
) {

  return (
    Number(value) || 0
  ).toFixed(decimals);

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* ==========================================
   DATE
   ========================================== */

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


function formatDate(dateString) {

  if (!dateString) {
    return "—";
  }

  const date =
    new Date(dateString);

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
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );

}


/* ==========================================
   CAPITAL MANAGEMENT
   ========================================== */

function getActiveCapital() {

  return (
    capitals.find(
      capital =>
        capital.status === "active"
    ) || null
  );

}


function getCapitalById(id) {

  return capitals.find(
    capital =>
      capital.id === id
  ) || null;

}


function getCapitalTrades(capitalId) {

  return trades.filter(
    trade =>
      trade.capitalId === capitalId
  );

}


function getCapitalPnl(capitalId) {

  return getCapitalTrades(
    capitalId
  ).reduce(
    (sum, trade) =>
      sum + Number(trade.pnl || 0),
    0
  );

}


function getRiskAmount(capital) {

  if (!capital) {
    return 0;
  }

  const currentBalance =
    Number(
      capital.currentBalance
    ) || 0;

  const riskValue =
    Number(
      capital.riskValue
    ) || 0;

  if (
    capital.riskMode === "fixed"
  ) {

    return riskValue;

  }

  return (
    currentBalance *
    riskValue /
    100
  );

}


function getRiskPercent(capital) {

  if (!capital) {
    return 0;
  }

  const currentBalance =
    Number(
      capital.currentBalance
    ) || 0;

  const riskValue =
    Number(
      capital.riskValue
    ) || 0;

  if (
    capital.riskMode === "percentage"
  ) {

    return riskValue;

  }

  if (currentBalance <= 0) {
    return 0;
  }

  return (
    riskValue /
    currentBalance *
    100
  );

}


function createCapitalObject(data) {

  const initial =
    Number(data.initialCapital);

  const current =
    Number(data.currentBalance);

  return {

    id:
      data.id ||
      Date.now().toString(),

    name:
      data.name.trim(),

    initialCapital:
      Math.max(
        0,
        initial || 0
      ),

    currentBalance:
      Math.max(
        0,
        current || 0
      ),

    riskMode:
      data.riskMode === "fixed"
        ? "fixed"
        : "percentage",

    riskValue:
      Math.max(
        0,
        Number(data.riskValue) || 0
      ),

    defaultRR:
      Math.min(
        10,
        Math.max(
          1,
          Number(data.defaultRR) || 2
        )
      ),

    status:
      data.status === "archived"
        ? "archived"
        : "active",

    createdAt:
      data.createdAt ||
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };

}


function updateCapitalBalance(
  capitalId,
  amount
) {

  const capital =
    getCapitalById(
      capitalId
    );

  if (!capital) {
    return;
  }

  capital.currentBalance =
    Math.max(
      0,
      Number(
        capital.currentBalance
      ) +
      Number(amount || 0)
    );

  capital.updatedAt =
    new Date().toISOString();

  saveCapitals(capitals);

}


function setActiveCapital(id) {

  const target =
    getCapitalById(id);

  if (!target) {
    return;
  }

  capitals.forEach(
    capital => {

      capital.status =
        capital.id === id
          ? "active"
          : capital.status === "active"
            ? "archived"
            : capital.status;

    }
  );

  saveCapitals(capitals);

  updateAll();

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

  capital.updatedAt =
    new Date().toISOString();

  saveCapitals(capitals);

  updateAll();

}


function deleteCapital(id) {

  const capital =
    getCapitalById(id);

  if (!capital) {
    return;
  }

  const linkedTrades =
    getCapitalTrades(id);

  if (linkedTrades.length > 0) {

    alert(
      "Impossible de supprimer ce capital car des trades lui sont associés. Archive-le plutôt."
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

  saveCapitals(capitals);

  updateAll();

}


function editCapital(id) {

  const capital =
    getCapitalById(id);

  if (!capital) {
    return;
  }

  document.getElementById(
    "capital-id"
  ).value =
    capital.id;

  document.getElementById(
    "capital-name"
  ).value =
    capital.name;

  document.getElementById(
    "capital-initial"
  ).value =
    capital.initialCapital;

  document.getElementById(
    "capital-current"
  ).value =
    capital.currentBalance;

  document.getElementById(
    "capital-risk-mode"
  ).value =
    capital.riskMode;

  document.getElementById(
    "capital-risk-value"
  ).value =
    capital.riskValue;

  document.getElementById(
    "capital-default-rr"
  ).value =
    capital.defaultRR;

  document.getElementById(
    "capital-modal-title"
  ).textContent =
    "Modifier le capital";

  updateCapitalRiskLabel();

  capitalModal.classList.add(
    "active"
  );

}


function renderCapitalCard(
  capital,
  active
) {

  const capitalTrades =
    getCapitalTrades(
      capital.id
    );

  const pnl =
    getCapitalPnl(
      capital.id
    );

  const pnlPercent =
    capital.initialCapital > 0
      ? pnl /
        capital.initialCapital *
        100
      : 0;

  const riskAmount =
    getRiskAmount(
      capital
    );

  const riskPercent =
    getRiskPercent(
      capital
    );

  const riskText =
    capital.riskMode === "fixed"
      ? formatMoney(riskAmount)
      : `${formatNumber(
          riskPercent,
          2
        )}%`;

  return `

    <div class="capital-card ${
      active
        ? "active-capital"
        : ""
    }">

      <div class="capital-card-header">

        <div>

          <div class="capital-title">

            <h4>
              ${escapeHTML(
                capital.name
              )}
            </h4>

            <span class="capital-badge ${
              active
                ? ""
                : "archived-badge"
            }">

              ${
                active
                  ? "ACTIF"
                  : "ARCHIVÉ"
              }

            </span>

          </div>

        </div>


        <div class="capital-actions">

          ${
            !active
              ? `
                <button
                  onclick="activateCapital('${capital.id}')"
                >
                  Activer
                </button>
              `
              : ""
          }

          <button
            onclick="editCapital('${capital.id}')"
          >
            Modifier
          </button>

          ${
            active
              ? `
                <button
                  onclick="archiveCapital('${capital.id}')"
                >
                  Archiver
                </button>
              `
              : ""
          }

          <button
            class="danger-action"
            onclick="deleteCapital('${capital.id}')"
          >
            Supprimer
          </button>

        </div>

      </div>


      <div class="capital-stats">

        <div class="capital-stat">

          <span>Capital initial</span>

          <strong>
            ${formatMoney(
              capital.initialCapital
            )}
          </strong>

        </div>


        <div class="capital-stat">

          <span>Solde actuel</span>

          <strong>
            ${formatMoney(
              capital.currentBalance
            )}
          </strong>

        </div>


        <div class="capital-stat">

          <span>P&L</span>

          <strong class="${
            pnl >= 0
              ? "pnl-positive"
              : "pnl-negative"
          }">

            ${formatMoney(pnl)}

          </strong>

          <small>
            ${formatPercent(
              pnlPercent
            )}
          </small>

        </div>


        <div class="capital-stat">

          <span>Risque / trade</span>

          <strong>
            ${riskText}
          </strong>

          <small>
            RR défaut : ${
              formatNumber(
                capital.defaultRR,
                1
              )
            }R
          </small>

        </div>

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

  const active =
    getActiveCapital();

  const archived =
    capitals.filter(
      capital =>
        capital.status === "archived"
    );


  if (!active) {

    activeContainer.innerHTML = `
      <div class="empty-capital">
        Aucun capital actif.
        <br><br>
        Crée un capital pour commencer.
      </div>
    `;

  } else {

    activeContainer.innerHTML =
      renderCapitalCard(
        active,
        true
      );

  }


  if (!archived.length) {

    archivedContainer.innerHTML = `
      <div class="empty-capital">
        Aucun capital archivé.
      </div>
    `;

  } else {

    archivedContainer.innerHTML =
      archived
        .map(
          capital =>
            renderCapitalCard(
              capital,
              false
            )
        )
        .join("");

  }

}


/* ==========================================
   CAPITAL MODAL
   ========================================== */

function updateCapitalRiskLabel() {

  const mode =
    document.getElementById(
      "capital-risk-mode"
    ).value;

  const label =
    document.getElementById(
      "capital-risk-label"
    );

  if (
    mode === "fixed"
  ) {

    label.textContent =
      "Risque par trade ($)";

  } else {

    label.textContent =
      "Risque par trade (%)";

  }

}


function resetCapitalForm() {

  capitalForm.reset();

  document.getElementById(
    "capital-id"
  ).value = "";

  document.getElementById(
    "capital-risk-mode"
  ).value =
    "percentage";

  document.getElementById(
    "capital-risk-value"
  ).value =
    "1";

  document.getElementById(
    "capital-default-rr"
  ).value =
    "2";

  document.getElementById(
    "capital-modal-title"
  ).textContent =
    "Ajouter un capital";

  updateCapitalRiskLabel();

}


function openCapitalModal() {

  resetCapitalForm();

  capitalModal.classList.add(
    "active"
  );

}


function closeCapitalModal() {

  capitalModal.classList.remove(
    "active"
  );

}


document.getElementById(
  "open-capital-modal"
).addEventListener(
  "click",
  openCapitalModal
);


document.getElementById(
  "close-capital-modal"
).addEventListener(
  "click",
  closeCapitalModal
);


document.getElementById(
  "cancel-capital"
).addEventListener(
  "click",
  closeCapitalModal
);


document.getElementById(
  "capital-risk-mode"
).addEventListener(
  "change",
  updateCapitalRiskLabel
);


document.getElementById(
  "capital-initial"
).addEventListener(
  "input",
  event => {

    const current =
      document.getElementById(
        "capital-current"
      );

    if (
      !current.value ||
      current.dataset.manual !== "true"
    ) {

      current.value =
        event.target.value;

    }

  }
);


document.getElementById(
  "capital-current"
).addEventListener(
  "input",
  event => {

    event.target.dataset.manual =
      "true";

  }
);


capitalModal.addEventListener(
  "click",
  event => {

    if (
      event.target === capitalModal
    ) {

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


    const initial =
      Number(
        document.getElementById(
          "capital-initial"
        ).value
      );


    const current =
      Number(
        document.getElementById(
          "capital-current"
        ).value
      );


    const riskMode =
      document.getElementById(
        "capital-risk-mode"
      ).value;


    const riskValue =
      Number(
        document.getElementById(
          "capital-risk-value"
        ).value
      );


    const defaultRR =
      Number(
        document.getElementById(
          "capital-default-rr"
        ).value
      );


    if (
      !name ||
      !Number.isFinite(initial) ||
      initial < 0 ||
      !Number.isFinite(current) ||
      current < 0 ||
      !Number.isFinite(riskValue) ||
      riskValue < 0
    ) {

      alert(
        "Vérifie les informations du capital."
      );

      return;

    }


    if (
      id
    ) {

      const capital =
        getCapitalById(id);

      if (!capital) {
        return;
      }

      capital.name =
        name;

      capital.initialCapital =
        initial;

      capital.currentBalance =
        current;

      capital.riskMode =
        riskMode;

      capital.riskValue =
        riskValue;

      capital.defaultRR =
        defaultRR;

      capital.updatedAt =
        new Date().toISOString();

    } else {

      const hasActive =
        Boolean(
          getActiveCapital()
        );

      const capital =
        createCapitalObject({

          name,

          initialCapital:
            initial,

          currentBalance:
            current,

          riskMode,

          riskValue,

          defaultRR,

          status:
            hasActive
              ? "archived"
              : "active"

        });


      capitals.push(
        capital
      );

    }


    saveCapitals(
      capitals
    );

    closeCapitalModal();

    updateAll();

  }
);


/* ==========================================
   GLOBAL CAPITAL ACTIONS
   ========================================== */

window.activateCapital =
  function(id) {

    setActiveCapital(id);

  };


window.archiveCapital =
  function(id) {

    archiveCapital(id);

  };


window.deleteCapital =
  function(id) {

    deleteCapital(id);

  };


window.editCapital =
  function(id) {

    editCapital(id);

  };


/* ==========================================
   NAVIGATION
   ========================================== */

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

  capital: {
    title: "Capitaux",
    description:
      "Gère tes capitaux actifs et archivés."
  },

  calculator: {
    title: "Calculateur",
    description:
      "Calcule ton risque et ta taille de position."
  },

  plan: {
    title: "Plan de trading",
    description:
      "Définis les règles que tu dois respecter."
  }

};


function showPage(pageName) {

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


document.querySelectorAll(
  "[data-page-button]"
).forEach(
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


/* ==========================================
   TRADE MODAL
   ========================================== */

function openTradeModal() {

  const active =
    getActiveCapital();


  if (!active) {

    alert(
      "Crée d'abord un capital actif avant d'ajouter un trade."
    );

    showPage("capital");

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
    "trade-capital-name"
  ).textContent =
    active.name;


  document.getElementById(
    "trade-rr"
  ).value =
    String(
      active.defaultRR
    );

  updateTradeTP();

}


function closeTradeModal() {

  tradeModal.classList.remove(
    "active"
  );

}


document.getElementById(
  "open-trade-modal"
).addEventListener(
  "click",
  openTradeModal
);


document.getElementById(
  "close-trade-modal"
).addEventListener(
  "click",
  closeTradeModal
);


document.getElementById(
  "cancel-trade"
).addEventListener(
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


/* ==========================================
   PIP SYSTEM
   ========================================== */

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


function getPipDistance(
  asset,
  entry,
  stop
) {

  const config =
    ASSET_CONFIG[asset];

  if (!config) {
    return 0;
  }

  return Math.abs(
    Number(entry) -
    Number(stop)
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

    return config.pipValue;

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

    return 1000 /
      numericPrice;

  }


  if (
    asset === "USDCAD" ||
    asset === "USDCHF"
  ) {

    return 10 /
      numericPrice;

  }

  return 0;

}


/* ==========================================
   CALCULATOR
   ========================================== */

const calcInputs = [

  "calc-asset",
  "calc-entry",
  "calc-sl",
  "calc-rr"

];


calcInputs.forEach(
  id => {

    document.getElementById(id)
      .addEventListener(
        "input",
        updateCalculator
      );

    document.getElementById(id)
      .addEventListener(
        "change",
        updateCalculator
      );

  }
);


function updateCalculator() {

  const capital =
    getActiveCapital();


  const riskMoney =
    getRiskAmount(
      capital
    );


  const asset =
    document.getElementById(
      "calc-asset"
    ).value;


  const entry =
    Number(
      document.getElementById(
        "calc-entry"
      ).value
    ) || 0;


  const stop =
    Number(
      document.getElementById(
        "calc-sl"
      ).value
    ) || 0;


  const rr =
    Number(
      document.getElementById(
        "calc-rr"
      ).value
    ) || 0;


  document.getElementById(
    "calc-capital-name"
  ).value =
    capital
      ? capital.name
      : "Aucun capital actif";


  document.getElementById(
    "calc-capital"
  ).value =
    capital
      ? Number(
          capital.currentBalance
        ).toFixed(2)
      : "0";


  document.getElementById(
    "calc-risk-mode"
  ).value =
    capital
      ? capital.riskMode === "fixed"
        ? "Montant fixe"
        : "Pourcentage"
      : "Aucun";


  document.getElementById(
    "calc-risk-display"
  ).value =
    capital
      ? capital.riskMode === "fixed"
        ? formatMoney(
            capital.riskValue
          )
        : `${formatNumber(
            capital.riskValue,
            2
          )}%`
      : "0";


  const distance =
    getPipDistance(
      asset,
      entry,
      stop
    );


  const pipValue =
    getPipValue(
      asset,
      entry
    );


  let lot = 0;


  if (
    distance > 0 &&
    pipValue > 0 &&
    riskMoney > 0
  ) {

    lot =
      riskMoney /
      (
        distance *
        pipValue
      );

  }


  let tp = 0;


  if (
    entry > 0 &&
    stop > 0 &&
    rr > 0
  ) {

    const riskDistance =
      Math.abs(
        entry - stop
      );


    if (
      entry > stop
    ) {

      tp =
        entry +
        riskDistance *
        rr;

    } else {

      tp =
        entry -
        riskDistance *
        rr;

    }

  }


  const potentialProfit =
    riskMoney *
    rr;


  document.getElementById(
    "calc-risk-money"
  ).textContent =
    formatMoney(
      riskMoney
    );


  document.getElementById(
    "calc-distance"
  ).textContent =
    `${formatNumber(
      distance,
      1
    )} pips`;


  document.getElementById(
    "calc-lot"
  ).textContent =
    `${formatNumber(
      lot,
      2
    )} lot`;


  document.getElementById(
    "calc-tp"
  ).textContent =
    tp > 0
      ? formatNumber(
          tp,
          5
        )
      : "—";


  document.getElementById(
    "calc-profit"
  ).textContent =
    formatMoney(
      potentialProfit
    );


  document.getElementById(
    "calc-loss"
  ).textContent =
    `-${formatMoney(
      riskMoney
    )}`;

}


/* ==========================================
   TRADE TP AUTOMATIC
   ========================================== */

const tradeCalculationInputs = [

  "trade-asset",
  "trade-direction",
  "trade-entry",
  "trade-sl",
  "trade-rr"

];


tradeCalculationInputs.forEach(
  id => {

    document.getElementById(id)
      .addEventListener(
        "input",
        updateTradeTP
      );

    document.getElementById(id)
      .addEventListener(
        "change",
        updateTradeTP
      );

  }
);


function updateTradeTP() {

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


  const stop =
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


  if (
    entry <= 0 ||
    stop <= 0 ||
    rr <= 0
  ) {

    document.getElementById(
      "trade-tp"
    ).value = "";

    return;

  }


  const distance =
    Math.abs(
      entry - stop
    );


  let tp;


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


  document.getElementById(
    "trade-tp"
  ).value =
    tp.toFixed(5);

}


/* ==========================================
   ADD TRADE
   ========================================== */

tradeForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();


    const activeCapital =
      getActiveCapital();


    if (!activeCapital) {

      alert(
        "Aucun capital actif. Crée ou active un capital avant d'enregistrer un trade."
      );

      closeTradeModal();

      showPage("capital");

      return;

    }


    const trade = {

      id:
        Date.now().toString(),

      capitalId:
        activeCapital.id,

      date:
        document.getElementById(
          "trade-date"
        ).value,

      asset:
        document.getElementById(
          "trade-asset"
        ).value,

      direction:
        document.getElementById(
          "trade-direction"
        ).value,

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
        ).value.trim(),

      entry:
        Number(
          document.getElementById(
            "trade-entry"
          ).value
        ),

      sl:
        Number(
          document.getElementById(
            "trade-sl"
          ).value
        ),

      rr:
        Number(
          document.getElementById(
            "trade-rr"
          ).value
        ),

      tp:
        Number(
          document.getElementById(
            "trade-tp"
          ).value
        ),

      result:
        document.getElementById(
          "trade-result"
        ).value,

      pnl:
        Number(
          document.getElementById(
            "trade-pnl"
          ).value
        ),

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

    saveTrades(
      trades
    );


    updateCapitalBalance(
      activeCapital.id,
      trade.pnl
    );


    tradeForm.reset();


    document.getElementById(
      "trade-date"
    ).value =
      getDefaultDateTime();


    document.getElementById(
      "trade-rr"
    ).value =
      String(
        activeCapital.defaultRR
      );


    closeTradeModal();

    updateAll();

    showPage("journal");

  }
);


/* ==========================================
   DELETE TRADE
   ========================================== */

function deleteTrade(id) {

  const trade =
    trades.find(
      item =>
        item.id === id
    );


  if (!trade) {
    return;
  }


  const confirmed =
    window.confirm(
      "Supprimer ce trade ? Le P&L sera retiré du capital associé."
    );


  if (!confirmed) {
    return;
  }


  const capital =
    getCapitalById(
      trade.capitalId
    );


  if (capital) {

    updateCapitalBalance(
      capital.id,
      -Number(
        trade.pnl || 0
      )
    );

  }


  trades =
    trades.filter(
      item =>
        item.id !== id
    );


  saveTrades(
    trades
  );

  updateAll();

}


window.deleteTrade =
  deleteTrade;


/* ==========================================
   JOURNAL TABLE
   ========================================== */

function renderJournal() {

  const tbody =
    document.getElementById(
      "journal-trades"
    );


  if (!trades.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="empty">
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;

  }


  const sortedTrades =
    [...trades].sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );


  tbody.innerHTML =
    sortedTrades.map(
      trade => {

        const pnlClass =
          Number(
            trade.pnl
          ) >= 0
            ? "pnl-positive"
            : "pnl-negative";


        const resultClass =
          trade.result === "TP"
            ? "result-tp"
            : trade.result === "SL"
              ? "result-sl"
              : "result-be";


        const capital =
          getCapitalById(
            trade.capitalId
          );


        return `
          <tr>

            <td>
              ${formatDate(
                trade.date
              )}
            </td>

            <td>
              ${
                capital
                  ? escapeHTML(
                      capital.name
                    )
                  : "Ancien trade"
              }
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
                trade.entry,
                5
              )}
            </td>

            <td>
              ${formatNumber(
                trade.sl,
                5
              )}
            </td>

            <td>
              ${formatNumber(
                trade.tp,
                5
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
                trade.pnl
              )}
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
    ).join("");

}


/* ==========================================
   RECENT TRADES
   ========================================== */

function getActiveTrades() {

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


function renderRecentTrades() {

  const tbody =
    document.getElementById(
      "recent-trades"
    );


  const activeTrades =
    getActiveTrades();


  if (!activeTrades.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;

  }


  const sortedTrades =
    [...activeTrades]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 5);


  tbody.innerHTML =
    sortedTrades.map(
      trade => {

        const pnlClass =
          Number(
            trade.pnl
          ) >= 0
            ? "pnl-positive"
            : "pnl-negative";


        const resultClass =
          trade.result === "TP"
            ? "result-tp"
            : trade.result === "SL"
              ? "result-sl"
              : "result-be";


        return `
          <tr>

            <td>
              ${formatDate(
                trade.date
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
                trade.pnl
              )}
            </td>

          </tr>
        `;

      }
    ).join("");

}


/* ==========================================
   STATISTICS
   ========================================== */

function calculateStatistics() {

  const activeCapital =
    getActiveCapital();


  if (!activeCapital) {

    return {

      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      totalPnl: 0,
      startingCapital: 0,
      currentCapital: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      avgR: 0

    };

  }


  const activeTrades =
    getCapitalTrades(
      activeCapital.id
    );


  const totalTrades =
    activeTrades.length;


  const wins =
    activeTrades.filter(
      trade =>
        trade.result === "TP"
    ).length;


  const losses =
    activeTrades.filter(
      trade =>
        trade.result === "SL"
    ).length;


  const breakeven =
    activeTrades.filter(
      trade =>
        trade.result === "BE"
    ).length;


  const totalPnl =
    activeTrades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.pnl || 0
        ),
      0
    );


  const startingCapital =
    Number(
      activeCapital.initialCapital
    ) || 0;


  const currentCapital =
    Number(
      activeCapital.currentBalance
    ) || 0;


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
    activeTrades
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
      activeTrades
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
      ? activeTrades.reduce(
          (
            sum,
            trade
          ) => {

            let r = 0;

            if (
              trade.result === "TP"
            ) {

              r =
                Number(
                  trade.rr || 0
                );

            }

            if (
              trade.result === "SL"
            ) {

              r = -1;

            }

            return sum + r;

          },
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
    startingCapital,
    currentCapital,
    winRate,
    grossProfit,
    grossLoss,
    profitFactor,
    avgR

  };

}


/* ==========================================
   DASHBOARD
   ========================================== */

function updateDashboard() {

  const stats =
    calculateStatistics();


  const active =
    getActiveCapital();


  document.getElementById(
    "dashboard-capital"
  ).textContent =
    active
      ? formatMoney(
          stats.currentCapital
        )
      : "—";


  document.getElementById(
    "dashboard-capital-name"
  ).textContent =
    active
      ? active.name
      : "Aucun";


  document.getElementById(
    "dashboard-pnl"
  ).textContent =
    formatMoney(
      stats.totalPnl
    );


  const pnlPercent =
    stats.startingCapital > 0
      ? stats.totalPnl /
        stats.startingCapital *
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
    `${stats.wins} W / ${stats.losses} L / ${stats.breakeven} BE`;


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


  const drawdown =
    calculateMaxDrawdown(
      stats.startingCapital
    );


  document.getElementById(
    "dashboard-drawdown"
  ).textContent =
    formatMoney(
      drawdown
    );


  updateStreak();

  renderEquityChart();

}


/* ==========================================
   DRAWDOWN
   ========================================== */

function calculateMaxDrawdown(
  startingCapital
) {

  const active =
    getActiveCapital();


  if (!active) {
    return 0;
  }


  const orderedTrades =
    getActiveTrades().sort(
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


  orderedTrades.forEach(
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


/* ==========================================
   STREAK
   ========================================== */

function updateStreak() {

  const element =
    document.getElementById(
      "dashboard-streak"
    );


  const label =
    document.getElementById(
      "dashboard-streak-label"
    );


  const activeTrades =
    getActiveTrades();


  if (!activeTrades.length) {

    element.textContent =
      "0";

    label.textContent =
      "Aucune série";

    return;

  }


  const ordered =
    [...activeTrades].sort(
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

      type = "win";

    } else if (
      trade.result === "SL"
    ) {

      type = "loss";

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


/* ==========================================
   EQUITY CHART
   ========================================== */

function renderEquityChart() {

  const container =
    document.getElementById(
      "equity-chart"
    );


  const active =
    getActiveCapital();


  if (!active) {

    container.innerHTML = `
      <div class="empty-chart">
        Aucun capital actif.
      </div>
    `;

    return;

  }


  const activeTrades =
    getActiveTrades();


  if (!activeTrades.length) {

    container.innerHTML = `
      <div class="empty-chart">
        Aucun trade enregistré.
      </div>
    `;

    return;

  }


  const ordered =
    [...activeTrades].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  let equity =
    Number(
      active.initialCapital
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


  const width = 100;
  const height = 100;


  const coordinates =
    points.map(
      (
        point,
        index
      ) => {

        const x =
          points.length === 1
            ? 0
            : index /
              (
                points.length -
                1
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
    ).join(" ");


  container.innerHTML = `
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


/* ==========================================
   PLAN
   ========================================== */

function loadPlanIntoForm() {

  const plan =
    loadPlan();


  document.getElementById(
    "plan-strategy"
  ).value =
    plan.strategy || "";


  document.getElementById(
    "plan-entry"
  ).value =
    plan.entry || "";


  document.getElementById(
    "plan-exit"
  ).value =
    plan.exit || "";


  document.getElementById(
    "plan-risk"
  ).value =
    plan.risk ?? 1;


  document.getElementById(
    "plan-min-rr"
  ).value =
    plan.minRR ?? 2;


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


document.getElementById(
  "save-plan"
).addEventListener(
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


/* ==========================================
   INITIALISATION
   ========================================== */

function updateAll() {

  renderCapitals();

  renderJournal();

  renderRecentTrades();

  updateDashboard();

  updateCalculator();

}


setCurrentDate();

loadPlanIntoForm();

document.getElementById(
  "trade-date"
).value =
  getDefaultDateTime();

updateCapitalRiskLabel();

updateAll();
