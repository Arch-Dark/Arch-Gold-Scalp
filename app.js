"use strict";

/*
  ==========================================
  TRADING PLAN - APPLICATION V1
  ==========================================
*/


/* ==========================================
   STORAGE
   ========================================== */

const STORAGE_KEYS = {
  trades: "trading-plan-trades",
  plan: "trading-plan-settings"
};


function loadTrades() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.trades)
    ) || [];
  } catch {
    return [];
  }
}


function saveTrades(trades) {
  localStorage.setItem(
    STORAGE_KEYS.trades,
    JSON.stringify(trades)
  );
}


function loadPlan() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.plan)
    ) || {};
  } catch {
    return {};
  }
}


function savePlan(plan) {
  localStorage.setItem(
    STORAGE_KEYS.plan,
    JSON.stringify(plan)
  );
}


let trades = loadTrades();


/* ==========================================
   DOM
   ========================================== */

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-button");

const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");

const tradeModal = document.getElementById("trade-modal");
const tradeForm = document.getElementById("trade-form");


/* ==========================================
   FORMATTERS
   ========================================== */

function formatMoney(value) {
  const number = Number(value) || 0;

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


/* ==========================================
   DATE
   ========================================== */

function setCurrentDate() {

  const element = document.getElementById("current-date");

  const date = new Date();

  element.textContent = date.toLocaleDateString(
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

  const now = new Date();

  const offset =
    now.getTimezoneOffset() * 60000;

  return new Date(
    now.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);

}


/* ==========================================
   NAVIGATION
   ========================================== */

const pageInformation = {

  dashboard: {
    title: "Dashboard",
    description: "Vue générale de ta performance."
  },

  journal: {
    title: "Journal",
    description: "Enregistre et analyse chaque opération."
  },

  calculator: {
    title: "Calculateur",
    description: "Calcule ton risque et ta taille de position."
  },

  plan: {
    title: "Plan de trading",
    description: "Définis les règles que tu dois respecter."
  }

};


function showPage(pageName) {

  pages.forEach(page => {
    page.classList.remove("active");
  });

  navButtons.forEach(button => {
    button.classList.remove("active");
  });

  const page = document.getElementById(
    `page-${pageName}`
  );

  const button = document.querySelector(
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

  button.addEventListener("click", () => {

    showPage(
      button.dataset.page
    );

  });

});


document.querySelectorAll(
  "[data-page-button]"
).forEach(button => {

  button.addEventListener("click", () => {

    showPage(
      button.dataset.pageButton
    );

  });

});


/* ==========================================
   MODAL
   ========================================== */

function openTradeModal() {

  tradeModal.classList.add("active");

  document.getElementById(
    "trade-date"
  ).value = getDefaultDateTime();

}


function closeTradeModal() {

  tradeModal.classList.remove("active");

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

  const config = ASSET_CONFIG[asset];

  if (!config) {
    return 0;
  }

  return Math.abs(
    Number(entry) - Number(stop)
  ) * config.multiplier;

}


function getPipValue(
  asset,
  price
) {

  const config = ASSET_CONFIG[asset];

  if (!config) {
    return 0;
  }

  if (!config.dynamicPipValue) {
    return config.pipValue;
  }

  const numericPrice =
    Number(price) || 0;

  if (numericPrice <= 0) {
    return 0;
  }

  if (asset === "USDJPY") {
    return 1000 / numericPrice;
  }

  if (
    asset === "USDCAD" ||
    asset === "USDCHF"
  ) {
    return 10 / numericPrice;
  }

  return 0;

}


/* ==========================================
   CALCULATOR
   ========================================== */

const calcInputs = [

  "calc-capital",
  "calc-risk",
  "calc-asset",
  "calc-entry",
  "calc-sl",
  "calc-rr"

];


calcInputs.forEach(id => {

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

});


function updateCalculator() {

  const capital =
    Number(
      document.getElementById(
        "calc-capital"
      ).value
    ) || 0;

  const riskPercent =
    Number(
      document.getElementById(
        "calc-risk"
      ).value
    ) || 0;

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


  const riskMoney =
    capital * riskPercent / 100;


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
    pipValue > 0
  ) {

    lot =
      riskMoney /
      (distance * pipValue);

  }


  let tp = 0;

  if (entry > 0 && stop > 0) {

    const riskDistance =
      Math.abs(entry - stop);

    if (entry > stop) {

      tp =
        entry +
        riskDistance * rr;

    } else {

      tp =
        entry -
        riskDistance * rr;

    }

  }


  const potentialProfit =
    riskMoney * rr;


  document.getElementById(
    "calc-risk-money"
  ).textContent =
    formatMoney(riskMoney);


  document.getElementById(
    "calc-distance"
  ).textContent =
    `${formatNumber(distance, 1)} pips`;


  document.getElementById(
    "calc-lot"
  ).textContent =
    `${formatNumber(lot, 2)} lot`;


  document.getElementById(
    "calc-tp"
  ).textContent =
    tp > 0
      ? formatNumber(tp, 5)
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
    `-${formatMoney(riskMoney)}`;

}


updateCalculator();


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


tradeCalculationInputs.forEach(id => {

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

});


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
    return;
  }


  const distance =
    Math.abs(entry - stop);


  let tp;


  if (direction === "BUY") {

    tp =
      entry +
      distance * rr;

  } else {

    tp =
      entry -
      distance * rr;

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


    const trade = {

      id:
        Date.now().toString(),

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
        ).value.trim()

    };


    trades.push(trade);

    saveTrades(trades);

    tradeForm.reset();

    document.getElementById(
      "trade-date"
    ).value =
      getDefaultDateTime();

    document.getElementById(
      "trade-rr"
    ).value = "2";


    closeTradeModal();

    updateAll();

    showPage("journal");

  }
);


/* ==========================================
   DELETE TRADE
   ========================================== */

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
      trade => trade.id !== id
    );


  saveTrades(trades);

  updateAll();

}


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
        <td colspan="10" class="empty">
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
          Number(trade.pnl) >= 0
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
              ${formatDate(trade.date)}
            </td>

            <td>
              ${escapeHTML(trade.asset)}
            </td>

            <td>
              ${escapeHTML(trade.direction)}
            </td>

            <td>
              ${formatNumber(trade.entry, 5)}
            </td>

            <td>
              ${formatNumber(trade.sl, 5)}
            </td>

            <td>
              ${formatNumber(trade.tp, 5)}
            </td>

            <td>
              ${formatNumber(trade.rr, 1)}R
            </td>

            <td class="${resultClass}">
              ${escapeHTML(trade.result)}
            </td>

            <td class="${pnlClass}">
              ${formatMoney(trade.pnl)}
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


/* ==========================================
   RECENT TRADES
   ========================================== */

function renderRecentTrades() {

  const tbody =
    document.getElementById(
      "recent-trades"
    );


  if (!trades.length) {

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
    [...trades]
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
          Number(trade.pnl) >= 0
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
              ${formatDate(trade.date)}
            </td>

            <td>
              ${escapeHTML(trade.asset)}
            </td>

            <td>
              ${escapeHTML(trade.direction)}
            </td>

            <td>
              ${formatNumber(trade.rr, 1)}R
            </td>

            <td class="${resultClass}">
              ${escapeHTML(trade.result)}
            </td>

            <td class="${pnlClass}">
              ${formatMoney(trade.pnl)}
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

  const totalTrades =
    trades.length;


  const wins =
    trades.filter(
      trade => trade.result === "TP"
    ).length;


  const losses =
    trades.filter(
      trade => trade.result === "SL"
    ).length;


  const breakeven =
    trades.filter(
      trade => trade.result === "BE"
    ).length;


  const totalPnl =
    trades.reduce(
      (sum, trade) =>
        sum + Number(trade.pnl || 0),
      0
    );


  const startingCapital = 10000;


  const currentCapital =
    startingCapital + totalPnl;


  const winRate =
    wins + losses > 0
      ? wins /
        (wins + losses) *
        100
      : 0;


  const grossProfit =
    trades
      .filter(
        trade =>
          Number(trade.pnl) > 0
      )
      .reduce(
        (sum, trade) =>
          sum + Number(trade.pnl),
        0
      );


  const grossLoss =
    Math.abs(
      trades
        .filter(
          trade =>
            Number(trade.pnl) < 0
        )
        .reduce(
          (sum, trade) =>
            sum + Number(trade.pnl),
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
      ? trades.reduce(
          (sum, trade) => {

            const result =
              trade.result;

            let r = 0;

            if (result === "TP") {
              r = Number(trade.rr || 0);
            }

            if (result === "SL") {
              r = -1;
            }

            return sum + r;

          },
          0
        ) / totalTrades
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


  document.getElementById(
    "dashboard-capital"
  ).textContent =
    formatMoney(
      stats.currentCapital
    );


  document.getElementById(
    "dashboard-start-capital"
  ).textContent =
    formatMoney(
      stats.startingCapital
    );


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
    `${formatNumber(stats.avgR, 2)}R`;


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

  const orderedTrades =
    [...trades].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  let equity =
    startingCapital;

  let peak =
    startingCapital;

  let maxDrawdown =
    0;


  orderedTrades.forEach(
    trade => {

      equity +=
        Number(trade.pnl || 0);


      if (equity > peak) {
        peak = equity;
      }


      const drawdown =
        peak - equity;


      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
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


  if (!trades.length) {

    element.textContent = "0";
    label.textContent =
      "Aucune série";

    return;

  }


  const ordered =
    [...trades].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  let currentType = null;
  let currentCount = 0;


  for (
    let i = ordered.length - 1;
    i >= 0;
    i--
  ) {

    const trade =
      ordered[i];


    let type;


    if (trade.result === "TP") {
      type = "win";
    } else if (
      trade.result === "SL"
    ) {
      type = "loss";
    } else {
      break;
    }


    if (currentType === null) {

      currentType = type;
      currentCount = 1;

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


  if (currentType === "win") {

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


  if (!trades.length) {

    container.innerHTML = `
      <div class="empty-chart">
        Aucun trade enregistré.
      </div>
    `;

    return;

  }


  const ordered =
    [...trades].sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  const startingCapital = 10000;

  let equity =
    startingCapital;


  const points = [
    {
      equity
    }
  ];


  ordered.forEach(
    trade => {

      equity +=
        Number(trade.pnl || 0);

      points.push({
        equity
      });

    }
  );


  const min =
    Math.min(
      ...points.map(
        point => point.equity
      )
    );


  const max =
    Math.max(
      ...points.map(
        point => point.equity
      )
    );


  const range =
    max - min || 1;


  const width = 100;
  const height = 100;


  const coordinates =
    points.map(
      (point, index) => {

        const x =
          points.length === 1
            ? 0
            : index /
              (points.length - 1) *
              width;


        const y =
          height -
          (
            (point.equity - min) /
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
    Boolean(plan.checkTrend);


  document.getElementById(
    "check-setup"
  ).checked =
    Boolean(plan.checkSetup);


  document.getElementById(
    "check-risk"
  ).checked =
    Boolean(plan.checkRisk);


  document.getElementById(
    "check-news"
  ).checked =
    Boolean(plan.checkNews);


  document.getElementById(
    "check-emotion"
  ).checked =
    Boolean(plan.checkEmotion);

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


    savePlan(plan);


    alert(
      "Plan de trading sauvegardé."
    );

  }
);


/* ==========================================
   INITIALISATION
   ========================================== */

function updateAll() {

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

updateAll();
