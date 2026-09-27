"use strict";

/* =========================================================
   TRADING PLAN — APP.JS
   Version 3.1
========================================================= */

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {
  trades: "trading-plan-trades",
  capitals: "trading-plan-capitals",
  settings: "trading-plan-settings",
  metadata: "trading-plan-metadata",
};

const APP_VERSION = 3.1;


/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_INFO = {
  dashboard: {
    title: "Dashboard",
    description: "Vue d'ensemble de tes performances",
  },

  journal: {
    title: "Journal",
    description: "Historique et analyse de tes opérations",
  },

  capitals: {
    title: "Capitaux",
    description: "Gestion de ton capital et de ton risque",
  },

  plan: {
    title: "Plan de trading",
    description: "Ton système et ta checklist d'exécution",
  },
};


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


const ASSET_CONFIG = {
  XAUUSD: {
    multiplier: 100,
    pipValuePerLot: 1,
    decimals: 2,
  },

  EURUSD: {
    multiplier: 10000,
    pipValuePerLot: 10,
    decimals: 5,
  },

  GBPUSD: {
    multiplier: 10000,
    pipValuePerLot: 10,
    decimals: 5,
  },

  AUDUSD: {
    multiplier: 10000,
    pipValuePerLot: 10,
    decimals: 5,
  },

  NZDUSD: {
    multiplier: 10000,
    pipValuePerLot: 10,
    decimals: 5,
  },

  USDJPY: {
    multiplier: 100,
    decimals: 3,
  },

  USDCAD: {
    multiplier: 10000,
    decimals: 5,
  },

  USDCHF: {
    multiplier: 10000,
    decimals: 5,
  },
};


/* =========================================================
   STATE
========================================================= */

let capitals = [];
let trades = [];

let settings = {
  activeCapitalId: null,
};

let metadata = {
  version: APP_VERSION,
};

let activePage = "dashboard";
let dashboardFilter = "active";
let journalFilter = "all";


/* =========================================================
   DOM HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}


function $all(selector) {
  return Array.from(
    document.querySelectorAll(selector)
  );
}


function safeText(value) {
  return value === null || value === undefined
    ? ""
    : String(value);
}


function number(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}


function round(value, decimals = 2) {
  const factor = 10 ** decimals;

  return (
    Math.round(
      (number(value) + Number.EPSILON) * factor
    ) / factor
  );
}


function escapeHTML(value) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatMoney(value) {
  const amount = number(value);

  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


function formatNumber(value, decimals = 2) {
  return number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}


function formatPercent(value, decimals = 2) {
  return `${number(value).toFixed(decimals)}%`;
}


function formatR(value) {
  return `${number(value).toFixed(2)}R`;
}


function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function formatDateTime(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

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


function getLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();

  const local = new Date(
    date.getTime() - offset * 60000
  );

  return local.toISOString().slice(0, 16);
}


function getTradeTimestamp(trade) {
  const date = new Date(
    trade?.date || trade?.createdAt || 0
  );

  const timestamp = date.getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}


/* =========================================================
   STORAGE HELPERS
========================================================= */

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);

    return parsed ?? fallback;
  } catch (error) {
    console.error(
      `Erreur lecture localStorage (${key})`,
      error
    );

    return fallback;
  }
}


function writeStorage(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(
      `Erreur écriture localStorage (${key})`,
      error
    );
  }
}


function saveAll() {
  writeStorage(
    STORAGE_KEYS.capitals,
    capitals
  );

  writeStorage(
    STORAGE_KEYS.trades,
    trades
  );

  writeStorage(
    STORAGE_KEYS.settings,
    settings
  );

  metadata.version = APP_VERSION;

  writeStorage(
    STORAGE_KEYS.metadata,
    metadata
  );
}


/* =========================================================
   NORMALISATION DES DONNÉES
========================================================= */

function normalizeCapital(capital) {
  if (
    !capital ||
    typeof capital !== "object"
  ) {
    return null;
  }

  const initialCapital = number(
    capital.initialCapital ??
    capital.initial ??
    capital.balance,
    0
  );

  const riskMode =
    capital.riskMode === "fixed"
      ? "fixed"
      : "percentage";

  return {
    id:
      capital.id ||
      `capital-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,

    name:
      safeText(capital.name).trim() ||
      "Capital sans nom",

    initialCapital,

    riskMode,

    riskPercent: number(
      capital.riskPercent,
      1
    ),

    riskAmount: number(
      capital.riskAmount,
      0
    ),

    defaultRR: Math.min(
      10,
      Math.max(
        1,
        number(capital.defaultRR, 2)
      )
    ),

    status:
      capital.status === "archived"
        ? "archived"
        : "active",

    createdAt:
      capital.createdAt ||
      new Date().toISOString(),
  };
}


function normalizeTrade(trade) {
  if (
    !trade ||
    typeof trade !== "object"
  ) {
    return null;
  }

  const capitalId =
    trade.capitalId ||
    trade.capitalID ||
    trade.accountId ||
    "";

  const capital = capitals.find(
    (item) =>
      item.id === capitalId
  );

  const asset =
    safeText(
      trade.asset ||
      trade.symbol ||
      "XAUUSD"
    ).toUpperCase();

  const entry = number(
    trade.entry ??
    trade.entryPrice,
    0
  );

  const sl = number(
    trade.sl ??
    trade.stopLoss,
    0
  );

  const rr = Math.min(
    10,
    Math.max(
      1,
      number(trade.rr, 2)
    )
  );

  const direction =
    safeText(
      trade.direction ||
      "BUY"
    ).toUpperCase() === "SELL"
      ? "SELL"
      : "BUY";

  const result = [
    "TP",
    "SL",
    "BE",
  ].includes(
    safeText(
      trade.result
    ).toUpperCase()
  )
    ? safeText(
        trade.result
      ).toUpperCase()
    : "TP";

  const normalized = {
    id:
      trade.id ||
      `trade-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,

    capitalId,

    capitalName:
      safeText(
        trade.capitalName ||
        capital?.name ||
        "Capital inconnu"
      ),

    asset,

    direction,

    timeframe:
      safeText(
        trade.timeframe
      ) || "M15",

    setup:
      safeText(
        trade.setup
      ),

    session:
      safeText(
        trade.session
      ) || "New York",

    result,

    entry,

    sl,

    tp: number(
      trade.tp ??
      trade.takeProfit,
      0
    ),

    exitPrice: number(
      trade.exitPrice ??
      trade.exit,
      0
    ),

    rr,

    lot: number(
      trade.lot,
      0
    ),

    lotRaw: number(
      trade.lotRaw ??
      trade.lot,
      0
    ),

    riskMoney: number(
      trade.riskMoney ??
      trade.riskAtStop,
      0
    ),

    riskAtStop: number(
      trade.riskAtStop ??
      trade.riskMoney,
      0
    ),

    slPips: number(
      trade.slPips,
      0
    ),

    realizedPips: number(
      trade.realizedPips ??
      trade.pips,
      0
    ),

    pipValuePerLot: number(
      trade.pipValuePerLot,
      0
    ),

    pnl: number(
      trade.pnl ??
      trade.profit,
      0
    ),

    r: number(
      trade.r,
      0
    ),

    entryReason:
      safeText(
        trade.entryReason
      ),

    exitReason:
      safeText(
        trade.exitReason
      ),

    emotion:
      safeText(
        trade.emotion
      ),

    mistakes:
      safeText(
        trade.mistakes
      ),

    notes:
      safeText(
        trade.notes
      ),

    fees: number(
      trade.fees,
      0
    ),

    swap: number(
      trade.swap,
      0
    ),

    date:
      trade.date ||
      trade.createdAt ||
      new Date().toISOString(),

    createdAt:
      trade.createdAt ||
      trade.date ||
      new Date().toISOString(),
  };

  if (
    normalized.entry > 0 &&
    normalized.sl > 0 &&
    normalized.riskMoney > 0
  ) {
    const calculated =
      calculateTradeValues({
        asset: normalized.asset,
        direction: normalized.direction,
        entry: normalized.entry,
        sl: normalized.sl,
        rr: normalized.rr,
        result: normalized.result,
        beExit:
          normalized.result === "BE"
            ? normalized.exitPrice
            : null,
        riskMoney:
          normalized.riskMoney,
      });

    if (calculated.valid) {
      normalized.tp =
        calculated.tp;

      normalized.slPips =
        calculated.slPips;

      normalized.realizedPips =
        calculated.realizedPips;

      normalized.pnl =
        calculated.pnl;

      normalized.r =
        calculated.r;

      normalized.pipValuePerLot =
        calculated.pipValuePerLot;

      if (
        normalized.lot <= 0
      ) {
        normalized.lot =
          calculated.lot;

        normalized.lotRaw =
          calculated.lot;
      }

      if (
        normalized.result !== "BE" &&
        calculated.exitPrice > 0
      ) {
        normalized.exitPrice =
          calculated.exitPrice;
      }
    }
  }

  return normalized;
}


function normalizeAllData() {
  const storedCapitals =
    readStorage(
      STORAGE_KEYS.capitals,
      []
    );

  const storedTrades =
    readStorage(
      STORAGE_KEYS.trades,
      []
    );

  const storedSettings =
    readStorage(
      STORAGE_KEYS.settings,
      {}
    );

  const storedMetadata =
    readStorage(
      STORAGE_KEYS.metadata,
      {}
    );

  capitals =
    Array.isArray(
      storedCapitals
    )
      ? storedCapitals
          .map(
            normalizeCapital
          )
          .filter(Boolean)
      : [];

  const activeCapitals =
    capitals.filter(
      (capital) =>
        capital.status !== "archived"
    );

  if (
    activeCapitals.length > 1
  ) {
    const preferredId =
      storedSettings.activeCapitalId ||
      activeCapitals[0].id;

    let foundPreferred = false;

    capitals =
      capitals.map(
        (capital) => {
          if (
            capital.status ===
            "archived"
          ) {
            return capital;
          }

          if (
            capital.id ===
              preferredId &&
            !foundPreferred
          ) {
            foundPreferred = true;

            return {
              ...capital,
              status: "active",
            };
          }

          return {
            ...capital,
            status: "archived",
          };
        }
      );
  }

  let activeCapital =
    capitals.find(
      (capital) =>
        capital.status === "active"
    ) || null;

  settings = {
    ...settings,
    ...storedSettings,
  };

  if (
    settings.activeCapitalId &&
    capitals.some(
      (capital) =>
        capital.id ===
          settings.activeCapitalId &&
        capital.status === "active"
    )
  ) {
    activeCapital =
      capitals.find(
        (capital) =>
          capital.id ===
          settings.activeCapitalId
      );
  }

  if (!activeCapital) {
    activeCapital =
      capitals.find(
        (capital) =>
          capital.status !==
          "archived"
      ) || null;
  }

  settings.activeCapitalId =
    activeCapital?.id || null;

  trades =
    Array.isArray(
      storedTrades
    )
      ? storedTrades
          .map(
            normalizeTrade
          )
          .filter(Boolean)
      : [];

  metadata = {
    ...metadata,
    ...storedMetadata,
    version: APP_VERSION,
  };

  saveAll();
}


/* =========================================================
   CAPITAL HELPERS
========================================================= */

function getActiveCapital() {
  return (
    capitals.find(
      (capital) =>
        capital.status ===
          "active" &&
        capital.id ===
          settings.activeCapitalId
    ) ||
    capitals.find(
      (capital) =>
        capital.status ===
        "active"
    ) ||
    null
  );
}


function getCapitalById(id) {
  return (
    capitals.find(
      (capital) =>
        capital.id === id
    ) || null
  );
}


function getCapitalTrades(
  capitalId
) {
  return trades.filter(
    (trade) =>
      trade.capitalId ===
      capitalId
  );
}


function getCapitalPnl(
  capitalId
) {
  return getCapitalTrades(
    capitalId
  ).reduce(
    (total, trade) =>
      total +
      number(trade.pnl),
    0
  );
}


function getCapitalBalance(
  capital
) {
  if (!capital) {
    return 0;
  }

  return (
    number(
      capital.initialCapital
    ) +
    getCapitalPnl(
      capital.id
    )
  );
}


function getCapitalRisk(
  capital
) {
  if (!capital) {
    return 0;
  }

  if (
    capital.riskMode ===
    "fixed"
  ) {
    return Math.max(
      0,
      number(
        capital.riskAmount
      )
    );
  }

  const balance =
    getCapitalBalance(
      capital
    );

  return Math.max(
    0,
    (
      balance *
      number(
        capital.riskPercent,
        1
      )
    ) / 100
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
    return number(
      capital.riskPercent
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
    getCapitalRisk(
      capital
    ) /
    balance
  ) *
    100;
}


function ensureOnlyOneActiveCapital(
  activeId
) {
  capitals =
    capitals.map(
      (capital) => {
        if (
          capital.id ===
          activeId
        ) {
          return {
            ...capital,
            status: "active",
          };
        }

        if (
          capital.status !==
          "archived"
        ) {
          return {
            ...capital,
            status: "archived",
          };
        }

        return capital;
      }
    );

  settings.activeCapitalId =
    activeId;
}


/* =========================================================
   PIP / LOT CALCULATIONS
========================================================= */

function getAssetConfig(
  asset
) {
  return (
    ASSET_CONFIG[asset] ||
    ASSET_CONFIG.XAUUSD
  );
}


function getPipValuePerLot(
  asset,
  price
) {
  const config =
    getAssetConfig(
      asset
    );

  if (
    asset === "USDJPY"
  ) {
    const currentPrice =
      number(price);

    if (
      currentPrice <= 0
    ) {
      return 0;
    }

    return (
      1000 /
      currentPrice
    );
  }

  if (
    asset === "USDCAD" ||
    asset === "USDCHF"
  ) {
    const currentPrice =
      number(price);

    if (
      currentPrice <= 0
    ) {
      return 0;
    }

    return (
      10 /
      currentPrice
    );
  }

  return number(
    config.pipValuePerLot,
    0
  );
}


function getPipMultiplier(
  asset
) {
  return number(
    getAssetConfig(
      asset
    ).multiplier,
    100
  );
}


function getPriceDecimals(
  asset
) {
  return number(
    getAssetConfig(
      asset
    ).decimals,
    2
  );
}


function calculateSlPips(
  asset,
  entry,
  sl
) {
  const difference =
    Math.abs(
      number(entry) -
      number(sl)
    );

  return (
    difference *
    getPipMultiplier(
      asset
    )
  );
}


function calculateTP(
  direction,
  entry,
  sl,
  rr
) {
  const riskDistance =
    Math.abs(
      number(entry) -
      number(sl)
    );

  if (
    riskDistance <= 0 ||
    number(entry) <= 0
  ) {
    return 0;
  }

  if (
    safeText(
      direction
    ).toUpperCase() ===
    "SELL"
  ) {
    return (
      number(entry) -
      riskDistance *
        number(rr, 1)
    );
  }

  return (
    number(entry) +
    riskDistance *
      number(rr, 1)
  );
}


function calculateExitPrice(
  direction,
  entry,
  sl,
  tp,
  result,
  beExit
) {
  if (
    result === "SL"
  ) {
    return number(sl);
  }

  if (
    result === "TP"
  ) {
    return number(tp);
  }

  if (
    result === "BE"
  ) {
    return number(beExit);
  }

  return 0;
}


function calculateTradeValues({
  asset,
  direction,
  entry,
  sl,
  rr,
  result,
  beExit,
  riskMoney,
}) {
  const entryPrice =
    number(entry);

  const stopPrice =
    number(sl);

  const rewardRatio =
    number(rr, 1);

  const risk =
    number(riskMoney);

  if (
    entryPrice <= 0 ||
    stopPrice <= 0 ||
    risk <= 0
  ) {
    return {
      valid: false,
      tp: 0,
      slPips: 0,
      lot: 0,
      realizedPips: 0,
      pnl: 0,
      r: 0,
      exitPrice: 0,
      pipValuePerLot: 0,
    };
  }

  const slPips =
    calculateSlPips(
      asset,
      entryPrice,
      stopPrice
    );

  const pipValuePerLot =
    getPipValuePerLot(
      asset,
      entryPrice
    );

  if (
    slPips <= 0 ||
    pipValuePerLot <= 0
  ) {
    return {
      valid: false,
      tp: 0,
      slPips,
      lot: 0,
      realizedPips: 0,
      pnl: 0,
      r: 0,
      exitPrice: 0,
      pipValuePerLot,
    };
  }

  const lot =
    risk /
    (
      slPips *
      pipValuePerLot
    );

  const tp =
    calculateTP(
      direction,
      entryPrice,
      stopPrice,
      rewardRatio
    );

  const exitPrice =
    calculateExitPrice(
      direction,
      entryPrice,
      stopPrice,
      tp,
      result,
      beExit
    );

  let realizedPips = 0;

  if (
    exitPrice > 0
  ) {
    if (
      safeText(
        direction
      ).toUpperCase() ===
      "SELL"
    ) {
      realizedPips =
        (
          entryPrice -
          exitPrice
        ) *
        getPipMultiplier(
          asset
        );
    } else {
      realizedPips =
        (
          exitPrice -
          entryPrice
        ) *
        getPipMultiplier(
          asset
        );
    }
  }

  const pnl =
    realizedPips *
    pipValuePerLot *
    lot;

  const r =
    risk > 0
      ? pnl / risk
      : 0;

  return {
    valid: true,
    tp,
    slPips,
    lot,
    realizedPips,
    pnl,
    r,
    exitPrice,
    pipValuePerLot,
  };
}


/* =========================================================
   STATISTICS
========================================================= */

/*
 * Les statistiques sont calculées à partir du résultat
 * réel du trade.
 *
 * TP = victoire
 * SL = perte
 * BE = break-even
 *
 * Le Win Rate utilise :
 *
 *       W
 *  -------------
 *     W + L
 *
 * Les BE ne sont donc PAS inclus dans le dénominateur.
 */

function getTradeStats(
  tradeList
) {
  const list =
    Array.isArray(tradeList)
      ? tradeList.filter(Boolean)
      : [];

  const wins =
    list.filter(
      (trade) =>
        trade.result === "TP"
    );

  const losses =
    list.filter(
      (trade) =>
        trade.result === "SL"
    );

  const breakevens =
    list.filter(
      (trade) =>
        trade.result === "BE"
    );

  const pnl =
    list.reduce(
      (sum, trade) =>
        sum +
        number(trade.pnl),
      0
    );

  /*
   * Gross Profit / Gross Loss
   *
   * On utilise le P&L réel plutôt que le type
   * de résultat. Cela permet de rester correct
   * même si un ancien trade possède un résultat
   * inhabituel ou un BE légèrement positif/négatif.
   */

  const grossProfit =
    list.reduce(
      (sum, trade) => {
        const tradePnl =
          number(trade.pnl);

        return (
          sum +
          Math.max(
            0,
            tradePnl
          )
        );
      },
      0
    );

  const grossLoss =
    Math.abs(
      list.reduce(
        (sum, trade) => {
          const tradePnl =
            number(trade.pnl);

          return (
            sum +
            Math.min(
              0,
              tradePnl
            )
          );
        },
        0
      )
    );

  let profitFactor = 0;

  if (
    grossLoss > 0
  ) {
    profitFactor =
      grossProfit /
      grossLoss;
  } else if (
    grossProfit > 0
  ) {
    profitFactor =
      Infinity;
  }

  const avgR =
    list.length > 0
      ? list.reduce(
          (sum, trade) =>
            sum +
            number(trade.r),
          0
        ) /
        list.length
      : 0;

  const avgWin =
    wins.length > 0
      ? wins.reduce(
          (sum, trade) =>
            sum +
            number(trade.pnl),
          0
        ) /
        wins.length
      : 0;

  const avgLoss =
    losses.length > 0
      ? losses.reduce(
          (sum, trade) =>
            sum +
            number(trade.pnl),
          0
        ) /
        losses.length
      : 0;

  /*
   * Win Rate :
   *
   * BE exclus.
   */
  const decidedTrades =
    wins.length +
    losses.length;

  const winRate =
    decidedTrades > 0
      ? (
          wins.length /
          decidedTrades
        ) *
        100
      : 0;

  /*
   * Drawdown :
   *
   * On reconstruit une equity curve à partir
   * du P&L chronologique.
   *
   * Exemple :
   *
   * +100
   * -50
   * -100
   *
   * Peak = +100
   * Equity = -50
   * Drawdown = 150
   */

  const chronological =
    sortTradesChronologically(
      list
    );

  const drawdownStats =
    calculateDrawdown(
      chronological
    );

  const streak =
    calculateCurrentStreak(
      chronological
    );

  const winStreak =
    getMaxStreak(
      chronological,
      "TP"
    );

  const lossStreak =
    getMaxStreak(
      chronological,
      "SL"
    );

  return {
    total: list.length,

    wins:
      wins.length,

    losses:
      losses.length,

    breakevens:
      breakevens.length,

    decidedTrades,

    pnl,

    grossProfit,

    grossLoss,

    profitFactor,

    winRate,

    avgR,

    avgWin,

    avgLoss,

    maxDrawdown:
      drawdownStats.maxDrawdown,

    maxDrawdownPercent:
      drawdownStats.maxDrawdownPercent,

    currentStreak:
      streak.value,

    currentStreakType:
      streak.type,

    maxWinStreak:
      winStreak,

    maxLossStreak:
      lossStreak,
  };
}


function sortTradesChronologically(
  list
) {
  return [...list].sort(
    (a, b) =>
      getTradeTimestamp(a) -
      getTradeTimestamp(b)
  );
}


function calculateDrawdown(
  chronological
) {
  if (
    !chronological.length
  ) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
    };
  }

  let equity = 0;
  let peak = 0;

  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  chronological.forEach(
    (trade) => {
      equity +=
        number(trade.pnl);

      if (
        equity > peak
      ) {
        peak = equity;
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

      /*
       * Pourcentage de drawdown.
       *
       * Si le peak est positif, on peut
       * calculer le pourcentage directement.
       */
      if (
        peak > 0
      ) {
        const drawdownPercent =
          (
            drawdown /
            peak
          ) *
          100;

        if (
          drawdownPercent >
          maxDrawdownPercent
        ) {
          maxDrawdownPercent =
            drawdownPercent;
        }
      }
    }
  );

  return {
    maxDrawdown,
    maxDrawdownPercent,
  };
}


function calculateCurrentStreak(
  list
) {
  if (
    !list.length
  ) {
    return {
      value: 0,
      type: "none",
    };
  }

  let type = null;
  let count = 0;

  for (
    let index =
      list.length - 1;
    index >= 0;
    index--
  ) {
    const result =
      list[index].result;

    const currentType =
      result === "TP"
        ? "win"
        : result === "SL"
          ? "loss"
          : "be";

    if (
      type === null
    ) {
      type =
        currentType;

      count = 1;

      continue;
    }

    if (
      currentType ===
      type
    ) {
      count++;
    } else {
      break;
    }
  }

  return {
    value: count,
    type:
      type || "none",
  };
}


function getMaxStreak(
  list,
  resultType
) {
  let current = 0;
  let maximum = 0;

  list.forEach(
    (trade) => {
      if (
        trade.result ===
        resultType
      ) {
        current++;

        if (
          current >
          maximum
        ) {
          maximum =
            current;
        }
      } else {
        current = 0;
      }
    }
  );

  return maximum;
}


function getTradesForPeriod(
  tradeList,
  period
) {
  const now =
    new Date();

  let start;

  if (
    period === "today"
  ) {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }

  if (
    period === "week"
  ) {
    const day =
      now.getDay() === 0
        ? 7
        : now.getDay();

    start =
      new Date(now);

    start.setHours(
      0,
      0,
      0,
      0
    );

    start.setDate(
      now.getDate() -
        day +
        1
    );
  }

  if (
    period === "month"
  ) {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  }

  if (!start) {
    return [];
  }

  return tradeList.filter(
    (trade) => {
      const date =
        new Date(
          trade.date
        );

      return (
        !Number.isNaN(
          date.getTime()
        ) &&
        date >= start &&
        date <= now
      );
    }
  );
}


/* =========================================================
   MODALS
========================================================= */

function openModal(
  modal
) {
  if (!modal) {
    return;
  }

  modal.classList.add(
    "active"
  );

  modal.classList.add(
    "open"
  );

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  modal.style.display =
    "flex";

  modal.style.visibility =
    "visible";

  modal.style.opacity =
    "1";

  modal.style.pointerEvents =
    "auto";

  document.body.classList.add(
    "modal-open"
  );

  const firstInput =
    modal.querySelector(
      "input:not([type='hidden']), select, textarea"
    );

  if (firstInput) {
    setTimeout(
      () => {
        firstInput.focus();
      },
      50
    );
  }
}


function closeModal(
  modal
) {
  if (!modal) {
    return;
  }

  modal.classList.remove(
    "active"
  );

  modal.classList.remove(
    "open"
  );

  modal.classList.remove(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  modal.style.visibility =
    "";

  modal.style.opacity =
    "";

  modal.style.pointerEvents =
    "";

  modal.style.display =
    "";

  if (
    !$all(
      ".modal-overlay.active, .modal-overlay.open, .modal-overlay.show"
    ).length
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}


function closeAllModals() {
  closeModal(
    $("capital-modal")
  );

  closeModal(
    $("trade-modal")
  );
}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(
  pageName
) {
  if (
    !PAGE_INFO[pageName]
  ) {
    return;
  }

  activePage =
    pageName;

  $all(".page").forEach(
    (page) => {
      const isActive =
        page.dataset.pageContent ===
        pageName;

      page.classList.toggle(
        "active",
        isActive
      );

      page.hidden =
        !isActive;
    }
  );

  $all(".nav-button").forEach(
    (button) => {
      const isActive =
        button.dataset.page ===
        pageName;

      button.classList.toggle(
        "active",
        isActive
      );

      if (isActive) {
        button.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        button.removeAttribute(
          "aria-current"
        );
      }
    }
  );

  const info =
    PAGE_INFO[pageName];

  if (
    $("page-title")
  ) {
    $("page-title").textContent =
      info.title;
  }

  if (
    $("page-description")
  ) {
    $("page-description").textContent =
      info.description;
  }

  closeMobileSidebar();

  if (
    pageName ===
    "dashboard"
  ) {
    renderDashboard();
  }

  if (
    pageName ===
    "journal"
  ) {
    renderJournal();
  }

  if (
    pageName ===
    "capitals"
  ) {
    renderCapitals();
  }

  if (
    pageName ===
    "plan"
  ) {
    updatePlanChecklist();
  }
}


function setupNavigation() {
  $all(
    ".nav-button"
  ).forEach(
    (button) => {
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

  $all(
    "[data-page-button]"
  ).forEach(
    (button) => {
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
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function openMobileSidebar() {
  const sidebar =
    $("sidebar");

  const overlay =
    $("sidebar-overlay");

  const button =
    $("mobile-menu-button");

  if (sidebar) {
    sidebar.classList.add(
      "open"
    );

    sidebar.classList.add(
      "active"
    );
  }

  if (overlay) {
    overlay.classList.add(
      "open"
    );

    overlay.classList.add(
      "active"
    );

    overlay.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  if (button) {
    button.setAttribute(
      "aria-expanded",
      "true"
    );
  }
}


function closeMobileSidebar() {
  const sidebar =
    $("sidebar");

  const overlay =
    $("sidebar-overlay");

  const button =
    $("mobile-menu-button");

  if (sidebar) {
    sidebar.classList.remove(
      "open"
    );

    sidebar.classList.remove(
      "active"
    );
  }

  if (overlay) {
    overlay.classList.remove(
      "open"
    );

    overlay.classList.remove(
      "active"
    );

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  if (button) {
    button.setAttribute(
      "aria-expanded",
      "false"
    );
  }
}


function setupMobileSidebar() {
  const button =
    $("mobile-menu-button");

  const overlay =
    $("sidebar-overlay");

  if (button) {
    button.addEventListener(
      "click",
      () => {
        const sidebar =
          $("sidebar");

        const isOpen =
          sidebar?.classList.contains(
            "open"
          ) ||
          sidebar?.classList.contains(
            "active"
          );

        if (isOpen) {
          closeMobileSidebar();
        } else {
          openMobileSidebar();
        }
      }
    );
  }

  if (overlay) {
    overlay.addEventListener(
      "click",
      closeMobileSidebar
    );
  }
}


/* =========================================================
   DATE HEADER
========================================================= */

function updateCurrentDate() {
  const element =
    $("current-date");

  if (!element) {
    return;
  }

  const now =
    new Date();

  element.textContent =
    now.toLocaleDateString(
      "fr-FR",
      {
        weekday:
          "long",

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    );
}


/* =========================================================
   CAPITAL MODAL
========================================================= */

function resetCapitalForm() {
  const form =
    $("capital-form");

  if (form) {
    form.reset();
  }

  if (
    $("capital-id")
  ) {
    $("capital-id").value =
      "";
  }

  if (
    $("capital-risk-mode")
  ) {
    $("capital-risk-mode").value =
      "percentage";
  }

  if (
    $("capital-risk-percent")
  ) {
    $("capital-risk-percent").value =
      "1";
  }

  if (
    $("capital-risk-amount")
  ) {
    $("capital-risk-amount").value =
      "";
  }

  if (
    $("capital-default-rr")
  ) {
    $("capital-default-rr").value =
      "2";
  }

  updateCapitalRiskModeUI();
}


function updateCapitalRiskModeUI() {
  const mode =
    $("capital-risk-mode")
      ?.value ||
    "percentage";

  const percentGroup =
    $("capital-risk-percent-group");

  const amountGroup =
    $("capital-risk-amount-group");

  if (percentGroup) {
    percentGroup.classList.toggle(
      "hidden",
      mode !==
        "percentage"
    );
  }

  if (amountGroup) {
    amountGroup.classList.toggle(
      "hidden",
      mode !==
        "fixed"
    );
  }
}


function openNewCapitalModal() {
  resetCapitalForm();

  if (
    $("capital-modal-title")
  ) {
    $("capital-modal-title").textContent =
      "Nouveau capital";
  }

  openModal(
    $("capital-modal")
  );
}


function openEditCapitalModal(
  capital
) {
  if (!capital) {
    return;
  }

  if (
    $("capital-modal-title")
  ) {
    $("capital-modal-title").textContent =
      "Modifier le capital";
  }

  if (
    $("capital-id")
  ) {
    $("capital-id").value =
      capital.id;
  }

  if (
    $("capital-name")
  ) {
    $("capital-name").value =
      capital.name;
  }

  if (
    $("capital-initial")
  ) {
    $("capital-initial").value =
      capital.initialCapital;
  }

  if (
    $("capital-risk-mode")
  ) {
    $("capital-risk-mode").value =
      capital.riskMode;
  }

  if (
    $("capital-risk-percent")
  ) {
    $("capital-risk-percent").value =
      capital.riskPercent;
  }

  if (
    $("capital-risk-amount")
  ) {
    $("capital-risk-amount").value =
      capital.riskAmount;
  }

  if (
    $("capital-default-rr")
  ) {
    $("capital-default-rr").value =
      capital.defaultRR;
  }

  updateCapitalRiskModeUI();

  openModal(
    $("capital-modal")
  );
}


function saveCapitalFromForm(
  event
) {
  event.preventDefault();

  const id =
    safeText(
      $("capital-id")
        ?.value
    ).trim();

  const name =
    safeText(
      $("capital-name")
        ?.value
    ).trim();

  const initialCapital =
    number(
      $("capital-initial")
        ?.value
    );

  const riskMode =
    $("capital-risk-mode")
      ?.value === "fixed"
      ? "fixed"
      : "percentage";

  const riskPercent =
    number(
      $("capital-risk-percent")
        ?.value,
      1
    );

  const riskAmount =
    number(
      $("capital-risk-amount")
        ?.value,
      0
    );

  const defaultRR =
    Math.min(
      10,
      Math.max(
        1,
        number(
          $("capital-default-rr")
            ?.value,
          2
        )
      )
    );

  if (!name) {
    alert(
      "Veuillez donner un nom au capital."
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

  if (id) {
    const index =
      capitals.findIndex(
        (capital) =>
          capital.id ===
          id
      );

    if (
      index !== -1
    ) {
      capitals[index] = {
        ...capitals[index],

        name,

        initialCapital,

        riskMode,

        riskPercent,

        riskAmount,

        defaultRR,
      };
    }
  } else {
    const capital = {
      id:
        `capital-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`,

      name,

      initialCapital,

      riskMode,

      riskPercent,

      riskAmount,

      defaultRR,

      status:
        capitals.length === 0
          ? "active"
          : "archived",

      createdAt:
        new Date().toISOString(),
    };

    capitals.push(
      capital
    );

    if (
      capitals.length ===
      1
    ) {
      ensureOnlyOneActiveCapital(
        capital.id
      );
    }
  }

  saveAll();

  closeModal(
    $("capital-modal")
  );

  renderAll();
}


/* =========================================================
   CAPITAL ACTIONS
========================================================= */

function activateCapital(
  capitalId
) {
  const capital =
    getCapitalById(
      capitalId
    );

  if (!capital) {
    return;
  }

  ensureOnlyOneActiveCapital(
    capitalId
  );

  saveAll();

  renderAll();
}


function archiveCapital(
  capitalId
) {
  const capital =
    getCapitalById(
      capitalId
    );

  if (!capital) {
    return;
  }

  if (
    capital.id ===
    settings.activeCapitalId
  ) {
    capital.status =
      "archived";

    settings.activeCapitalId =
      null;

    const nextCapital =
      capitals.find(
        (item) =>
          item.id !==
            capitalId &&
          item.status !==
            "archived"
      );

    if (nextCapital) {
      ensureOnlyOneActiveCapital(
        nextCapital.id
      );
    }
  } else {
    capital.status =
      "archived";
  }

  saveAll();

  renderAll();
}


function deleteCapital(
  capitalId
) {
  const capital =
    getCapitalById(
      capitalId
    );

  if (!capital) {
    return;
  }

  const linkedTrades =
    getCapitalTrades(
      capitalId
    );

  const confirmed =
    window.confirm(
      linkedTrades.length
        ? `Ce capital contient ${linkedTrades.length} trade(s). Supprimer le capital supprimera aussi ces trades. Continuer ?`
        : "Supprimer ce capital ?"
    );

  if (!confirmed) {
    return;
  }

  capitals =
    capitals.filter(
      (item) =>
        item.id !==
        capitalId
    );

  trades =
    trades.filter(
      (trade) =>
        trade.capitalId !==
        capitalId
    );

  if (
    settings.activeCapitalId ===
    capitalId
  ) {
    const next =
      capitals.find(
        (item) =>
          item.status ===
          "active"
      );

    settings.activeCapitalId =
      next?.id ||
      null;
  }

  saveAll();

  renderAll();
}


/* =========================================================
   CAPITAL RENDERING
========================================================= */

function renderCapitals() {
  const activeCapital =
    getActiveCapital();

  const archived =
    capitals.filter(
      (capital) =>
        capital.status ===
        "archived"
    );

  if (
    $("active-capital-name")
  ) {
    $("active-capital-name").textContent =
      activeCapital
        ? activeCapital.name
        : "Aucun capital";
  }

  if (
    $("active-capital-balance")
  ) {
    $("active-capital-balance").textContent =
      formatMoney(
        getCapitalBalance(
          activeCapital
        )
      );
  }

  if (
    $("archived-capitals-count")
  ) {
    $("archived-capitals-count").textContent =
      archived.length;
  }

  if (
    $("capitals-global-pnl")
  ) {
    const globalPnl =
      trades.reduce(
        (sum, trade) =>
          sum +
          number(
            trade.pnl
          ),
        0
      );

    $("capitals-global-pnl").textContent =
      `P&L global : ${formatMoney(
        globalPnl
      )}`;
  }

  renderActiveCapitalCard(
    activeCapital
  );

  renderArchivedCapitalCards(
    archived
  );
}


function renderActiveCapitalCard(
  capital
) {
  const container =
    $("active-capital-container");

  if (!container) {
    return;
  }

  if (!capital) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Aucun capital actif</strong>
        <p>
          Crée ton premier capital pour commencer.
        </p>
      </div>
    `;

    return;
  }

  const capitalTrades =
    getCapitalTrades(
      capital.id
    );

  const stats =
    getTradeStats(
      capitalTrades
    );

  const balance =
    getCapitalBalance(
      capital
    );

  const risk =
    getCapitalRisk(
      capital
    );

  container.innerHTML = `
    <article class="capital-card">

      <div class="capital-card-header">

        <div>

          <span class="capital-status active">
            ACTIF
          </span>

          <h4>
            ${escapeHTML(
              capital.name
            )}
          </h4>

          <p>
            Créé le ${formatDate(
              capital.createdAt
            )}
          </p>

        </div>

        <div class="capital-card-balance">

          <span>Balance</span>

          <strong>
            ${formatMoney(
              balance
            )}
          </strong>

        </div>

      </div>

      <div class="capital-card-stats">

        <div>
          <span>Initial</span>

          <strong>
            ${formatMoney(
              capital.initialCapital
            )}
          </strong>
        </div>

        <div>
          <span>Risque / trade</span>

          <strong>
            ${formatMoney(
              risk
            )}
          </strong>
        </div>

        <div>
          <span>Risque</span>

          <strong>
            ${formatPercent(
              getCapitalRiskPercent(
                capital
              )
            )}
          </strong>
        </div>

        <div>
          <span>RR défaut</span>

          <strong>
            RR${capital.defaultRR}
          </strong>
        </div>

        <div>
          <span>Trades</span>

          <strong>
            ${stats.total}
          </strong>
        </div>

        <div>
          <span>P&L</span>

          <strong class="${
            stats.pnl >= 0
              ? "positive"
              : "negative"
          }">
            ${formatMoney(
              stats.pnl
            )}
          </strong>
        </div>

      </div>

      <div class="capital-card-actions">

        <button
          type="button"
          class="secondary-button"
          data-capital-action="edit"
          data-capital-id="${escapeHTML(
            capital.id
          )}"
        >
          Modifier
        </button>

        <button
          type="button"
          class="secondary-button"
          data-capital-action="archive"
          data-capital-id="${escapeHTML(
            capital.id
          )}"
        >
          Archiver
        </button>

      </div>

    </article>
  `;

  setupCapitalCardActions();
}


function renderArchivedCapitalCards(
  archived
) {
  const container =
    $("archived-capitals-container");

  if (!container) {
    return;
  }

  if (!archived.length) {
    container.innerHTML = `
      <div class="empty-state">

        <strong>
          Aucun capital archivé
        </strong>

        <p>
          Tes anciens capitaux apparaîtront ici.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    archived
      .map(
        (capital) => {
          const capitalTrades =
            getCapitalTrades(
              capital.id
            );

          const stats =
            getTradeStats(
              capitalTrades
            );

          const balance =
            getCapitalBalance(
              capital
            );

          return `
            <article class="capital-card archived">

              <div class="capital-card-header">

                <div>

                  <span class="capital-status archived">
                    ARCHIVÉ
                  </span>

                  <h4>
                    ${escapeHTML(
                      capital.name
                    )}
                  </h4>

                  <p>
                    Créé le ${formatDate(
                      capital.createdAt
                    )}
                  </p>

                </div>

                <div class="capital-card-balance">

                  <span>
                    Balance finale
                  </span>

                  <strong>
                    ${formatMoney(
                      balance
                    )}
                  </strong>

                </div>

              </div>

              <div class="capital-card-stats">

                <div>
                  <span>Initial</span>

                  <strong>
                    ${formatMoney(
                      capital.initialCapital
                    )}
                  </strong>
                </div>

                <div>
                  <span>P&L</span>

                  <strong class="${
                    stats.pnl >= 0
                      ? "positive"
                      : "negative"
                  }">
                    ${formatMoney(
                      stats.pnl
                    )}
                  </strong>
                </div>

                <div>
                  <span>Trades</span>

                  <strong>
                    ${stats.total}
                  </strong>
                </div>

                <div>
                  <span>Win Rate</span>

                  <strong>
                    ${formatPercent(
                      stats.winRate,
                      1
                    )}
                  </strong>
                </div>

                <div>
                  <span>Risque</span>

                  <strong>
                    ${formatMoney(
                      getCapitalRisk(
                        capital
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>RR défaut</span>

                  <strong>
                    RR${capital.defaultRR}
                  </strong>
                </div>

              </div>

              <div class="capital-card-actions">

                <button
                  type="button"
                  class="primary-button"
                  data-capital-action="activate"
                  data-capital-id="${escapeHTML(
                    capital.id
                  )}"
                >
                  Activer
                </button>

                <button
                  type="button"
                  class="secondary-button"
                  data-capital-action="edit"
                  data-capital-id="${escapeHTML(
                    capital.id
                  )}"
                >
                  Modifier
                </button>

                <button
                  type="button"
                  class="secondary-button"
                  data-capital-action="delete"
                  data-capital-id="${escapeHTML(
                    capital.id
                  )}"
                >
                  Supprimer
                </button>

              </div>

            </article>
          `;
        }
      )
      .join("");

  setupCapitalCardActions();
}


function setupCapitalCardActions() {
  $all(
    "[data-capital-action]"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const action =
            button.dataset
              .capitalAction;

          const id =
            button.dataset
              .capitalId;

          const capital =
            getCapitalById(
              id
            );

          if (!capital) {
            return;
          }

          if (
            action ===
            "edit"
          ) {
            openEditCapitalModal(
              capital
            );
          }

          if (
            action ===
            "activate"
          ) {
            activateCapital(
              id
            );
          }

          if (
            action ===
            "archive"
          ) {
            archiveCapital(
              id
            );
          }

          if (
            action ===
            "delete"
          ) {
            deleteCapital(
              id
            );
          }
        }
      );
    }
  );
}


/* =========================================================
   TRADE MODAL
========================================================= */

function resetTradeForm() {
  const form =
    $("trade-form");

  if (form) {
    form.reset();
  }

  if (
    $("trade-date")
  ) {
    $("trade-date").value =
      getLocalDateTimeValue();
  }

  if (
    $("trade-asset")
  ) {
    $("trade-asset").value =
      "XAUUSD";
  }

  if (
    $("trade-direction")
  ) {
    $("trade-direction").value =
      "BUY";
  }

  if (
    $("trade-session")
  ) {
    $("trade-session").value =
      "New York";
  }

  if (
    $("trade-timeframe")
  ) {
    $("trade-timeframe").value =
      "M15";
  }

  if (
    $("trade-rr")
  ) {
    $("trade-rr").value =
      String(
        getActiveCapital()
          ?.defaultRR ||
        2
      );
  }

  if (
    $("trade-result")
  ) {
    $("trade-result").value =
      "TP";
  }

  if (
    $("trade-setup")
  ) {
    $("trade-setup").value =
      "";
  }

  if (
    $("trade-entry")
  ) {
    $("trade-entry").value =
      "";
  }

  if (
    $("trade-sl")
  ) {
    $("trade-sl").value =
      "";
  }

  if (
    $("trade-be-exit")
  ) {
    $("trade-be-exit").value =
      "";
  }

  updateTradeCapitalBanner();

  updateBreakEvenVisibility();

  updateTradeCalculation();
}


function updateTradeCapitalBanner() {
  const capital =
    getActiveCapital();

  if (
    $("trade-active-capital-name")
  ) {
    $("trade-active-capital-name").textContent =
      capital
        ? capital.name
        : "Aucun capital";
  }

  if (
    $("trade-risk-display")
  ) {
    $("trade-risk-display").textContent =
      capital
        ? `${formatMoney(
            getCapitalRisk(
              capital
            )
          )} (${formatPercent(
            getCapitalRiskPercent(
              capital
            )
          )})`
        : "—";
  }

  if (
    $("trade-balance-display")
  ) {
    $("trade-balance-display").textContent =
      capital
        ? formatMoney(
            getCapitalBalance(
              capital
            )
          )
        : "—";
  }
}


function openNewTradeModal() {
  const capital =
    getActiveCapital();

  if (!capital) {
    alert(
      "Crée d'abord un capital actif avant d'ajouter un trade."
    );

    showPage(
      "capitals"
    );

    return;
  }

  resetTradeForm();

  openModal(
    $("trade-modal")
  );
}


function updateBreakEvenVisibility() {
  const result =
    $("trade-result")
      ?.value;

  const group =
    $("be-exit-group");

  const input =
    $("trade-be-exit");

  if (!group) {
    return;
  }

  const isBE =
    result === "BE";

  group.classList.toggle(
    "hidden",
    !isBE
  );

  if (input) {
    input.required =
      isBE;
  }
}


function updateTradeCalculation() {
  const capital =
    getActiveCapital();

  const asset =
    $("trade-asset")
      ?.value ||
    "XAUUSD";

  const direction =
    $("trade-direction")
      ?.value ||
    "BUY";

  const entry =
    number(
      $("trade-entry")
        ?.value
    );

  const sl =
    number(
      $("trade-sl")
        ?.value
    );

  const rr =
    number(
      $("trade-rr")
        ?.value,
      2
    );

  const result =
    $("trade-result")
      ?.value ||
    "TP";

  const beExit =
    number(
      $("trade-be-exit")
        ?.value
    );

  const riskMoney =
    capital
      ? getCapitalRisk(
          capital
        )
      : 0;

  const values =
    calculateTradeValues({
      asset,
      direction,
      entry,
      sl,
      rr,
      result,
      beExit,
      riskMoney,
    });

  if (
    $("trade-risk-money")
  ) {
    $("trade-risk-money").textContent =
      formatMoney(
        riskMoney
      );
  }

  if (
    $("trade-sl-pips")
  ) {
    $("trade-sl-pips").textContent =
      values.slPips > 0
        ? formatNumber(
            values.slPips,
            1
          )
        : "0";
  }

  if (
    $("trade-lot")
  ) {
    $("trade-lot").textContent =
      values.lot > 0
        ? formatNumber(
            values.lot,
            4
          )
        : "0.00";
  }

  if (
    $("trade-tp-display")
  ) {
    $("trade-tp-display").textContent =
      values.tp > 0
        ? values.tp.toFixed(
            getPriceDecimals(
              asset
            )
          )
        : "—";
  }

  if (
    $("trade-tp")
  ) {
    $("trade-tp").value =
      values.tp > 0
        ? values.tp
        : "";
  }

  if (
    $("trade-lot-value")
  ) {
    $("trade-lot-value").value =
      values.lot > 0
        ? values.lot
        : "";
  }

  if (
    $("trade-exit-display")
  ) {
    $("trade-exit-display").textContent =
      values.exitPrice > 0
        ? values.exitPrice.toFixed(
            getPriceDecimals(
              asset
            )
          )
        : "—";
  }

  if (
    $("trade-realized-pips")
  ) {
    $("trade-realized-pips").textContent =
      values.valid
        ? formatNumber(
            values.realizedPips,
            1
          )
        : "0";
  }

  if (
    $("trade-pnl-display")
  ) {
    $("trade-pnl-display").textContent =
      values.valid
        ? formatMoney(
            values.pnl
          )
        : "$0.00";
  }

  if (
    $("trade-r-display")
  ) {
    $("trade-r-display").textContent =
      values.valid
        ? formatR(
            values.r
          )
        : "0.00R";
  }

  updateBreakEvenVisibility();
}


function saveTradeFromForm(
  event
) {
  event.preventDefault();

  const capital =
    getActiveCapital();

  if (!capital) {
    alert(
      "Aucun capital actif."
    );

    return;
  }

  const date =
    $("trade-date")
      ?.value;

  const asset =
    $("trade-asset")
      ?.value ||
    "XAUUSD";

  const direction =
    $("trade-direction")
      ?.value ||
    "BUY";

  const session =
    $("trade-session")
      ?.value ||
    "";

  const timeframe =
    $("trade-timeframe")
      ?.value ||
    "M15";

  const setup =
    $("trade-setup")
      ?.value ||
    "";

  const entry =
    number(
      $("trade-entry")
        ?.value
    );

  const sl =
    number(
      $("trade-sl")
        ?.value
    );

  const rr =
    number(
      $("trade-rr")
        ?.value,
      2
    );

  const result =
    $("trade-result")
      ?.value ||
    "TP";

  const beExit =
    number(
      $("trade-be-exit")
        ?.value
    );

  const entryReason =
    safeText(
      $("trade-entry-reason")
        ?.value
    ).trim();

  const notes =
    safeText(
      $("trade-notes")
        ?.value
    ).trim();

  if (!date) {
    alert(
      "Veuillez renseigner la date du trade."
    );

    return;
  }

  if (
    entry <= 0 ||
    sl <= 0
  ) {
    alert(
      "L'entrée et le Stop Loss doivent être supérieurs à 0."
    );

    return;
  }

  if (
    direction === "BUY" &&
    sl >= entry
  ) {
    alert(
      "Pour un BUY, le Stop Loss doit être sous le prix d'entrée."
    );

    return;
  }

  if (
    direction === "SELL" &&
    sl <= entry
  ) {
    alert(
      "Pour un SELL, le Stop Loss doit être au-dessus du prix d'entrée."
    );

    return;
  }

  if (
    result === "BE" &&
    beExit <= 0
  ) {
    alert(
      "Veuillez renseigner le prix de sortie BE."
    );

    return;
  }

  const riskMoney =
    getCapitalRisk(
      capital
    );

  if (
    riskMoney <= 0
  ) {
    alert(
      "Le risque par trade du capital doit être supérieur à 0."
    );

    return;
  }

  const calculated =
    calculateTradeValues({
      asset,
      direction,
      entry,
      sl,
      rr,
      result,
      beExit,
      riskMoney,
    });

  if (
    !calculated.valid
  ) {
    alert(
      "Impossible de calculer le trade. Vérifie l'entrée, le SL et le capital."
    );

    return;
  }

  const trade = {
    id:
      `trade-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,

    capitalId:
      capital.id,

    capitalName:
      capital.name,

    asset,

    direction,

    timeframe,

    setup,

    session,

    result,

    entry,

    sl,

    tp:
      calculated.tp,

    exitPrice:
      calculated.exitPrice,

    rr,

    lot:
      round(
        calculated.lot,
        4
      ),

    lotRaw:
      calculated.lot,

    riskMoney,

    riskAtStop:
      riskMoney,

    slPips:
      calculated.slPips,

    realizedPips:
      calculated.realizedPips,

    pipValuePerLot:
      calculated.pipValuePerLot,

    pnl:
      calculated.pnl,

    r:
      calculated.r,

    entryReason,

    exitReason:
      "",

    emotion:
      "",

    mistakes:
      "",

    notes,

    fees: 0,

    swap: 0,

    date:
      new Date(
        date
      ).toISOString(),

    createdAt:
      new Date().toISOString(),
  };

  trades.push(
    trade
  );

  saveAll();

  closeModal(
    $("trade-modal")
  );

  renderAll();

  showPage(
    "journal"
  );
}


/* =========================================================
   JOURNAL
========================================================= */

function getJournalTrades() {
  let list =
    [...trades];

  if (
    journalFilter ===
    "active"
  ) {
    const active =
      getActiveCapital();

    list = active
      ? list.filter(
          (trade) =>
            trade.capitalId ===
            active.id
        )
      : [];
  }

  list.sort(
    (a, b) =>
      getTradeTimestamp(
        b
      ) -
      getTradeTimestamp(
        a
      )
  );

  return list;
}


function renderJournal() {
  const activeCapital =
    getActiveCapital();

  const noCapital =
    $("journal-no-capital");

  const summary =
    $("journal-summary");

  /*
   * Le journal "Tous" doit pouvoir afficher
   * les anciens capitaux même lorsqu'il n'existe
   * actuellement aucun capital actif.
   */
  if (
    !activeCapital &&
    journalFilter === "active"
  ) {
    if (noCapital) {
      noCapital.classList.remove(
        "hidden"
      );
    }

    if (summary) {
      summary.classList.add(
        "hidden"
      );
    }

    renderJournalRows(
      []
    );

    return;
  }

  if (
    !activeCapital &&
    journalFilter === "all"
  ) {
    if (noCapital) {
      noCapital.classList.add(
        "hidden"
      );
    }

    if (summary) {
      summary.classList.remove(
        "hidden"
      );
    }

    renderJournalRows(
      getJournalTrades()
    );

    return;
  }

  if (noCapital) {
    noCapital.classList.add(
      "hidden"
    );
  }

  if (summary) {
    summary.classList.remove(
      "hidden"
    );
  }

  renderJournalRows(
    getJournalTrades()
  );
}


function renderJournalRows(
  list
) {
  const tbody =
    $("journal-trades");

  if (!tbody) {
    return;
  }

  if (!list.length) {
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

  tbody.innerHTML =
    list
      .map(
        createJournalRow
      )
      .join("");

  $all(
    "[data-trade-action='delete']"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          deleteTrade(
            button.dataset
              .tradeId
          );
        }
      );
    }
  );
}


function createJournalRow(
  trade
) {
  const resultClass =
    trade.result ===
    "TP"
      ? "positive"
      : trade.result ===
        "SL"
        ? "negative"
        : "";

  const pnlClass =
    number(
      trade.pnl
    ) > 0
      ? "positive"
      : number(
          trade.pnl
        ) < 0
        ? "negative"
        : "";

  const directionClass =
    trade.direction ===
    "BUY"
      ? "positive"
      : "negative";

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
        ${escapeHTML(
          trade.capitalName
        )}
      </td>

      <td>
        <strong>
          ${escapeHTML(
            trade.asset
          )}
        </strong>
      </td>

      <td>
        <span class="${directionClass}">
          ${escapeHTML(
            trade.direction
          )}
        </span>
      </td>

      <td>
        ${formatPriceForTrade(
          trade.asset,
          trade.entry
        )}
      </td>

      <td>
        ${formatPriceForTrade(
          trade.asset,
          trade.sl
        )}
      </td>

      <td>
        ${formatPriceForTrade(
          trade.asset,
          trade.tp
        )}
      </td>

      <td>
        ${formatNumber(
          trade.lot,
          4
        )}
      </td>

      <td>
        RR${formatNumber(
          trade.rr,
          0
        )}
      </td>

      <td>
        <strong class="${resultClass}">
          ${escapeHTML(
            trade.result
          )}
        </strong>
      </td>

      <td>
        ${formatNumber(
          trade.realizedPips,
          1
        )}
      </td>

      <td>
        <strong class="${pnlClass}">
          ${formatMoney(
            trade.pnl
          )}
        </strong>
      </td>

      <td>
        ${formatR(
          trade.r
        )}
      </td>

      <td>
        <button
          type="button"
          class="secondary-button"
          data-trade-action="delete"
          data-trade-id="${escapeHTML(
            trade.id
          )}"
        >
          Supprimer
        </button>
      </td>

    </tr>
  `;
}


function formatPriceForTrade(
  asset,
  value
) {
  if (
    number(value) <= 0
  ) {
    return "—";
  }

  return number(
    value
  ).toFixed(
    getPriceDecimals(
      asset
    )
  );
}


function deleteTrade(
  tradeId
) {
  const trade =
    trades.find(
      (item) =>
        item.id ===
        tradeId
    );

  if (!trade) {
    return;
  }

  const confirmed =
    window.confirm(
      `Supprimer le trade ${trade.asset} ${trade.direction} ?`
    );

  if (!confirmed) {
    return;
  }

  trades =
    trades.filter(
      (item) =>
        item.id !==
        tradeId
    );

  saveAll();

  renderAll();
}


/* =========================================================
   DASHBOARD
========================================================= */

function getDashboardTrades() {
  if (
    dashboardFilter ===
    "all"
  ) {
    return [...trades];
  }

  const active =
    getActiveCapital();

  if (!active) {
    return [];
  }

  return trades.filter(
    (trade) =>
      trade.capitalId ===
      active.id
  );
}


function getTotalInitialCapital() {
  return capitals.reduce(
    (sum, capital) =>
      sum +
      number(
        capital.initialCapital
      ),
    0
  );
}


function renderDashboard() {
  const activeCapital =
    getActiveCapital();

  const noCapital =
    $("dashboard-no-capital");

  const content =
    $("dashboard-content");

  if (!activeCapital) {
    if (noCapital) {
      noCapital.classList.remove(
        "hidden"
      );
    }

    if (content) {
      content.classList.add(
        "hidden"
      );
    }

    renderGlobalPerformance();

    return;
  }

  if (noCapital) {
    noCapital.classList.add(
      "hidden"
    );
  }

  if (content) {
    content.classList.remove(
      "hidden"
    );
  }

  const list =
    getDashboardTrades();

  const stats =
    getTradeStats(
      list
    );

  const activeBalance =
    getCapitalBalance(
      activeCapital
    );

  const globalInitial =
    getTotalInitialCapital();

  const globalPnl =
    getTradeStats(
      trades
    ).pnl;

  /*
   * Le solde principal reste toujours
   * le solde du capital actif.
   *
   * Le filtre "Tous les capitaux" agit
   * sur les statistiques de performance,
   * mais ne transforme pas le solde actif
   * en somme de tous les capitaux.
   */
  const balance =
    activeBalance;

  const start =
    dashboardFilter ===
    "all"
      ? globalInitial
      : activeCapital.initialCapital;

  if (
    $("dashboard-capital")
  ) {
    $("dashboard-capital").textContent =
      formatMoney(
        balance
      );
  }

  if (
    $("dashboard-start-capital")
  ) {
    $("dashboard-start-capital").textContent =
      formatMoney(
        start
      );
  }

  if (
    $("dashboard-pnl")
  ) {
    $("dashboard-pnl").textContent =
      formatMoney(
        stats.pnl
      );

    $("dashboard-pnl").classList.toggle(
      "positive",
      stats.pnl > 0
    );

    $("dashboard-pnl").classList.toggle(
      "negative",
      stats.pnl < 0
    );
  }

  if (
    $("dashboard-pnl-percent")
  ) {
    const percent =
      start > 0
        ? (
            stats.pnl /
            start
          ) *
          100
        : 0;

    $("dashboard-pnl-percent").textContent =
      formatPercent(
        percent
      );
  }

  if (
    $("dashboard-winrate")
  ) {
    $("dashboard-winrate").textContent =
      formatPercent(
        stats.winRate,
        1
      );
  }

  if (
    $("dashboard-wl")
  ) {
    $("dashboard-wl").textContent =
      `${stats.wins} W / ${stats.losses} L / ${stats.breakevens} BE`;
  }

  if (
    $("dashboard-trades")
  ) {
    $("dashboard-trades").textContent =
      stats.total;
  }

  if (
    $("dashboard-profit-factor")
  ) {
    $("dashboard-profit-factor").textContent =
      stats.profitFactor ===
      Infinity
        ? "∞"
        : stats.profitFactor > 0
          ? stats.profitFactor.toFixed(
              2
            )
          : "—";
  }

  if (
    $("dashboard-avg-r")
  ) {
    $("dashboard-avg-r").textContent =
      formatR(
        stats.avgR
      );
  }

  if (
    $("dashboard-drawdown")
  ) {
    $("dashboard-drawdown").textContent =
      formatMoney(
        stats.maxDrawdown
      );
  }

  if (
    $("dashboard-streak")
  ) {
    $("dashboard-streak").textContent =
      stats.currentStreak;
  }

  if (
    $("dashboard-streak-label")
  ) {
    const labels = {
      win:
        "Victoires consécutives",

      loss:
        "Pertes consécutives",

      be:
        "Break-even consécutifs",

      none:
        "Aucun trade",
    };

    $("dashboard-streak-label").textContent =
      labels[
        stats.currentStreakType
      ] ||
      "Aucun trade";
  }

  if (
    $("equity-description")
  ) {
    $("equity-description").textContent =
      dashboardFilter ===
      "all"
        ? "Évolution cumulée des performances de tous les capitaux."
        : `Évolution de ${activeCapital.name}.`;
  }

  renderEquityChart(
    list,
    dashboardFilter ===
      "all"
      ? null
      : activeCapital
  );

  renderRecentTrades(
    list
  );

  renderGlobalPerformance();
}


function renderGlobalPerformance() {
  const stats =
    getTradeStats(
      trades
    );

  if (
    $("global-pnl")
  ) {
    $("global-pnl").textContent =
      formatMoney(
        stats.pnl
      );
  }

  if (
    $("global-trades")
  ) {
    $("global-trades").textContent =
      stats.total;
  }

  if (
    $("global-winrate")
  ) {
    $("global-winrate").textContent =
      formatPercent(
        stats.winRate,
        1
      );
  }

  if (
    $("global-capitals")
  ) {
    $("global-capitals").textContent =
      capitals.length;
  }
}


function renderRecentTrades(
  list
) {
  const tbody =
    $("recent-trades");

  if (!tbody) {
    return;
  }

  const recent =
    [...list]
      .sort(
        (a, b) =>
          getTradeTimestamp(
            b
          ) -
          getTradeTimestamp(
            a
          )
      )
      .slice(
        0,
        8
      );

  if (!recent.length) {
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
    recent
      .map(
        (trade) => {
          const resultClass =
            trade.result ===
            "TP"
              ? "positive"
              : trade.result ===
                "SL"
                ? "negative"
                : "";

          const pnlClass =
            trade.pnl > 0
              ? "positive"
              : trade.pnl < 0
                ? "negative"
                : "";

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
                  trade.capitalName
                )}
              </td>

              <td>
                <strong>
                  ${escapeHTML(
                    trade.asset
                  )}
                </strong>
              </td>

              <td>
                <span class="${
                  trade.direction ===
                  "BUY"
                    ? "positive"
                    : "negative"
                }">
                  ${escapeHTML(
                    trade.direction
                  )}
                </span>
              </td>

              <td>
                RR${formatNumber(
                  trade.rr,
                  0
                )}
              </td>

              <td>
                <strong class="${resultClass}">
                  ${escapeHTML(
                    trade.result
                  )}
                </strong>
              </td>

              <td>
                <strong class="${pnlClass}">
                  ${formatMoney(
                    trade.pnl
                  )}
                </strong>
              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   EQUITY CHART
========================================================= */

function renderEquityChart(
  list,
  capital
) {
  const container =
    $("equity-chart");

  if (!container) {
    return;
  }

  const chronological =
    sortTradesChronologically(
      list
    );

  if (!chronological.length) {
    container.innerHTML = `
      <div class="empty-chart">
        Aucun trade enregistré.
      </div>
    `;

    return;
  }

  let startingBalance;

  if (capital) {
    startingBalance =
      number(
        capital.initialCapital
      );
  } else {
    startingBalance =
      getTotalInitialCapital();
  }

  let balance =
    startingBalance;

  const points =
    chronological.map(
      (
        trade,
        index
      ) => {
        balance +=
          number(
            trade.pnl
          );

        return {
          index:
            index + 1,

          balance,

          trade,
        };
      }
    );

  const values =
    points.map(
      (point) =>
        point.balance
    );

  const minValue =
    Math.min(
      startingBalance,
      ...values
    );

  const maxValue =
    Math.max(
      startingBalance,
      ...values
    );

  const range =
    maxValue -
      minValue ||
    1;

  const width =
    1000;

  const height =
    280;

  const paddingX =
    30;

  const paddingY =
    30;

  const usableWidth =
    width -
    paddingX * 2;

  const usableHeight =
    height -
    paddingY * 2;

  const coords = [
    {
      x:
        paddingX,

      y:
        height -
        paddingY -
        (
          (
            startingBalance -
            minValue
          ) /
          range
        ) *
          usableHeight,
    },

    ...points.map(
      (
        point,
        index
      ) => {
        const x =
          paddingX +
          (
            (index + 1) /
            Math.max(
              1,
              points.length
            )
          ) *
            usableWidth;

        const y =
          height -
          paddingY -
          (
            (
              point.balance -
              minValue
            ) /
            range
          ) *
            usableHeight;

        return {
          x,
          y,
        };
      }
    ),
  ];

  const linePoints =
    coords
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  const areaPoints = [
    `${paddingX},${
      height - paddingY
    }`,

    linePoints,

    `${
      coords[
        coords.length - 1
      ].x
    },${
      height - paddingY
    }`,
  ].join(" ");

  const firstPoint =
    coords[0];

  const lastPoint =
    coords[
      coords.length - 1
    ];

  const finalBalance =
    points[
      points.length - 1
    ].balance;

  const finalPnl =
    finalBalance -
    startingBalance;

  container.innerHTML = `
    <div class="equity-chart-inner">

      <div class="equity-chart-summary">

        <div>
          <span>Départ</span>

          <strong>
            ${formatMoney(
              startingBalance
            )}
          </strong>
        </div>

        <div>
          <span>Actuel</span>

          <strong>
            ${formatMoney(
              finalBalance
            )}
          </strong>
        </div>

        <div>
          <span>Variation</span>

          <strong class="${
            finalPnl >= 0
              ? "positive"
              : "negative"
          }">
            ${formatMoney(
              finalPnl
            )}
          </strong>
        </div>

      </div>

      <svg
        viewBox="0 0 ${width} ${height}"
        class="equity-svg"
        role="img"
        aria-label="Courbe d'équité"
        preserveAspectRatio="none"
      >

        <defs>

          <linearGradient
            id="equity-gradient"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >

            <stop
              offset="0%"
              stop-opacity="0.35"
            />

            <stop
              offset="100%"
              stop-opacity="0"
            />

          </linearGradient>

        </defs>

        <line
          x1="${paddingX}"
          y1="${
            height - paddingY
          }"
          x2="${
            width - paddingX
          }"
          y2="${
            height - paddingY
          }"
          stroke="currentColor"
          stroke-opacity="0.15"
        />

        <line
          x1="${paddingX}"
          y1="${paddingY}"
          x2="${paddingX}"
          y2="${
            height - paddingY
          }"
          stroke="currentColor"
          stroke-opacity="0.15"
        />

        <polygon
          points="${areaPoints}"
          fill="url(#equity-gradient)"
        />

        <polyline
          points="${linePoints}"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <circle
          cx="${firstPoint.x}"
          cy="${firstPoint.y}"
          r="5"
          fill="currentColor"
        />

        <circle
          cx="${lastPoint.x}"
          cy="${lastPoint.y}"
          r="6"
          fill="currentColor"
        />

      </svg>

    </div>
  `;
}


/* =========================================================
   PLAN CHECKLIST
========================================================= */

function loadPlanChecklist() {
  const stored =
    readStorage(
      `${STORAGE_KEYS.settings}-checklist`,
      {}
    );

  PLAN_CHECKS.forEach(
    (key) => {
      const input =
        document.querySelector(
          `[data-plan-check="${key}"]`
        );

      if (input) {
        input.checked =
          Boolean(
            stored[key]
          );
      }
    }
  );

  updatePlanChecklist();
}


function savePlanChecklist() {
  const checklist =
    {};

  PLAN_CHECKS.forEach(
    (key) => {
      const input =
        document.querySelector(
          `[data-plan-check="${key}"]`
        );

      checklist[key] =
        Boolean(
          input?.checked
        );
    }
  );

  writeStorage(
    `${STORAGE_KEYS.settings}-checklist`,
    checklist
  );

  updatePlanChecklist();

  setAppStatus(
    "Checklist sauvegardée."
  );
}


function resetPlanChecklist() {
  const confirmed =
    window.confirm(
      "Réinitialiser toute la checklist ?"
    );

  if (!confirmed) {
    return;
  }

  PLAN_CHECKS.forEach(
    (key) => {
      const input =
        document.querySelector(
          `[data-plan-check="${key}"]`
        );

      if (input) {
        input.checked =
          false;
      }
    }
  );

  savePlanChecklist();
}


function updatePlanChecklist() {
  const inputs =
    $all(
      "[data-plan-check]"
    );

  const checked =
    inputs.filter(
      (input) =>
        input.checked
    ).length;

  const total =
    inputs.length;

  if (
    $("plan-checklist-progress")
  ) {
    $("plan-checklist-progress").textContent =
      `${checked} / ${total}`;
  }

  const permission =
    $("trade-permission");

  const title =
    $("trade-permission-title");

  const description =
    $("trade-permission-description");

  if (
    checked === total &&
    total > 0
  ) {
    if (permission) {
      permission.classList.remove(
        "blocked"
      );

      permission.classList.add(
        "allowed"
      );

      permission.classList.add(
        "authorized"
      );
    }

    if (title) {
      title.textContent =
        "TRADE AUTORISÉ";
    }

    if (description) {
      description.textContent =
        "Toutes les conditions de la checklist sont validées.";
    }
  } else {
    if (permission) {
      permission.classList.add(
        "blocked"
      );

      permission.classList.remove(
        "allowed"
      );

      permission.classList.remove(
        "authorized"
      );
    }

    if (title) {
      title.textContent =
        "TRADE NON AUTORISÉ";
    }

    if (description) {
      description.textContent =
        "Toutes les conditions doivent être validées avant l'entrée.";
    }
  }
}


function setupPlanChecklist() {
  $all(
    "[data-plan-check]"
  ).forEach(
    (input) => {
      input.addEventListener(
        "change",
        updatePlanChecklist
      );
    }
  );

  if (
    $("save-plan")
  ) {
    $("save-plan").addEventListener(
      "click",
      savePlanChecklist
    );
  }

  if (
    $("reset-plan-checklist")
  ) {
    $("reset-plan-checklist").addEventListener(
      "click",
      resetPlanChecklist
    );
  }

  loadPlanChecklist();
}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModalEvents() {
  const openCapital =
    $("open-capital-modal");

  const closeCapital =
    $("close-capital-modal");

  const cancelCapital =
    $("cancel-capital");

  const capitalModal =
    $("capital-modal");

  if (openCapital) {
    openCapital.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        openNewCapitalModal();
      }
    );
  }

  if (closeCapital) {
    closeCapital.addEventListener(
      "click",
      () => {
        closeModal(
          capitalModal
        );
      }
    );
  }

  if (cancelCapital) {
    cancelCapital.addEventListener(
      "click",
      () => {
        closeModal(
          capitalModal
        );
      }
    );
  }

  if (capitalModal) {
    capitalModal.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          capitalModal
        ) {
          closeModal(
            capitalModal
          );
        }
      }
    );
  }

  const openTrade =
    $("open-trade-modal");

  const closeTrade =
    $("close-trade-modal");

  const cancelTrade =
    $("cancel-trade");

  const tradeModal =
    $("trade-modal");

  if (openTrade) {
    openTrade.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        openNewTradeModal();
      }
    );
  }

  if (closeTrade) {
    closeTrade.addEventListener(
      "click",
      () => {
        closeModal(
          tradeModal
        );
      }
    );
  }

  if (cancelTrade) {
    cancelTrade.addEventListener(
      "click",
      () => {
        closeModal(
          tradeModal
        );
      }
    );
  }

  if (tradeModal) {
    tradeModal.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          tradeModal
        ) {
          closeModal(
            tradeModal
          );
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "Escape"
      ) {
        closeAllModals();

        closeMobileSidebar();
      }
    }
  );
}


/* =========================================================
   FORM EVENTS
========================================================= */

function setupFormEvents() {
  const capitalForm =
    $("capital-form");

  if (capitalForm) {
    capitalForm.addEventListener(
      "submit",
      saveCapitalFromForm
    );
  }

  const tradeForm =
    $("trade-form");

  if (tradeForm) {
    tradeForm.addEventListener(
      "submit",
      saveTradeFromForm
    );
  }

  const riskMode =
    $("capital-risk-mode");

  if (riskMode) {
    riskMode.addEventListener(
      "change",
      updateCapitalRiskModeUI
    );
  }

  [
    "trade-asset",
    "trade-direction",
    "trade-entry",
    "trade-sl",
    "trade-rr",
    "trade-result",
    "trade-be-exit",
  ].forEach(
    (id) => {
      const element =
        $(id);

      if (!element) {
        return;
      }

      element.addEventListener(
        "input",
        updateTradeCalculation
      );

      element.addEventListener(
        "change",
        updateTradeCalculation
      );
    }
  );

  const journalFilterElement =
    $("journal-capital-filter");

  if (
    journalFilterElement
  ) {
    journalFilterElement.addEventListener(
      "change",
      () => {
        journalFilter =
          journalFilterElement.value;

        renderJournal();
      }
    );
  }

  const dashboardFilterElement =
    $("dashboard-capital-filter");

  if (
    dashboardFilterElement
  ) {
    dashboardFilterElement.addEventListener(
      "change",
      () => {
        dashboardFilter =
          dashboardFilterElement.value;

        renderDashboard();
      }
    );
  }
}


/* =========================================================
   APP STATUS
========================================================= */

function setAppStatus(
  message
) {
  const status =
    $("app-status");

  if (status) {
    status.textContent =
      message;
  }
}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {
  renderDashboard();

  renderJournal();

  renderCapitals();

  updatePlanChecklist();

  updateCurrentDate();
}


/* =========================================================
   LEGACY DATA REPAIR
========================================================= */

function repairExistingTrades() {
  let changed =
    false;

  trades =
    trades.map(
      (trade) => {
        const capital =
          getCapitalById(
            trade.capitalId
          );

        if (
          capital &&
          trade.capitalName !==
            capital.name
        ) {
          changed = true;

          return {
            ...trade,

            capitalName:
              capital.name,
          };
        }

        if (
          capital &&
          trade.entry > 0 &&
          trade.sl > 0
        ) {
          const risk =
            number(
              trade.riskMoney
            ) > 0
              ? number(
                  trade.riskMoney
                )
              : getCapitalRisk(
                  capital
                );

          const calculated =
            calculateTradeValues({
              asset:
                trade.asset,

              direction:
                trade.direction,

              entry:
                trade.entry,

              sl:
                trade.sl,

              rr:
                trade.rr,

              result:
                trade.result,

              beExit:
                trade.result ===
                "BE"
                  ? trade.exitPrice
                  : null,

              riskMoney:
                risk,
            });

          if (
            calculated.valid
          ) {
            const next = {
              ...trade,

              riskMoney:
                risk,

              riskAtStop:
                risk,

              tp:
                calculated.tp,

              slPips:
                calculated.slPips,

              realizedPips:
                calculated.realizedPips,

              pnl:
                calculated.pnl,

              r:
                calculated.r,

              exitPrice:
                calculated.exitPrice,

              pipValuePerLot:
                calculated.pipValuePerLot,
            };

            /*
             * On conserve le lot historique
             * s'il est valide.
             */
            if (
              number(
                trade.lot
              ) <= 0
            ) {
              next.lot =
                calculated.lot;

              next.lotRaw =
                calculated.lot;
            }

            if (
              JSON.stringify(
                next
              ) !==
              JSON.stringify(
                trade
              )
            ) {
              changed = true;
            }

            return next;
          }
        }

        return trade;
      }
    );

  if (changed) {
    saveAll();
  }
}


/* =========================================================
   INITIALISATION
========================================================= */

function initApp() {
  try {
    normalizeAllData();

    repairExistingTrades();

    setupNavigation();

    setupMobileSidebar();

    setupModalEvents();

    setupFormEvents();

    setupPlanChecklist();

    updateCurrentDate();

    showPage(
      "dashboard"
    );

    renderAll();

    console.log(
      "Trading Plan V3.1 initialisé.",
      {
        capitals,

        trades,

        activeCapital:
          getActiveCapital(),
      }
    );
  } catch (error) {
    console.error(
      "Erreur critique lors de l'initialisation de Trading Plan :",
      error
    );

    setAppStatus(
      "Une erreur est survenue lors du chargement de l'application."
    );
  }
}


/* =========================================================
   START
========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initApp
  );
} else {
  initApp();
}
