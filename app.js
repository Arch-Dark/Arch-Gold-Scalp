"use strict";

/* =========================================================
   PLAN DE TRADING — APP.JS
   Version 3.2
========================================================= */

/* =========================================================
   STOCKAGE
========================================================= */

const STORAGE_KEYS = {
  trades: "trading-plan-trades",
  capitals: "trading-plan-capitals",
  settings: "trading-plan-settings",
  metadata: "trading-plan-metadata",
};

const APP_VERSION = 3.2;

/* =========================================================
   CONSTANTES
========================================================= */

const PAGE_INFO = {
  dashboard: {
    title: "Tableau de bord",
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
    pipValuePerLot: null,
    decimals: 3,
  },

  USDCAD: {
    multiplier: 10000,
    pipValuePerLot: null,
    decimals: 5,
  },

  USDCHF: {
    multiplier: 10000,
    pipValuePerLot: null,
    decimals: 5,
  },
};

const RR_OPTIONS = Array.from(
  { length: 10 },
  (_, index) => index + 1
);

const DEFAULT_TRADE = {
  asset: "XAUUSD",
  direction: "BUY",
  session: "New York",
  timeframe: "M15",
  result: "TP",
  rr: 2,
};

/* =========================================================
   ÉTAT
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
  return Array.from(document.querySelectorAll(selector));
}

function safeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function number(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;

  return (
    Math.round((number(value) + Number.EPSILON) * factor) /
    factor
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

function formatPips(value) {
  return `${number(value).toFixed(1)} pips`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
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
    trade?.date ||
      trade?.createdAt ||
      0
  );

  const timestamp = date.getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/* =========================================================
   STOCKAGE
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
      `Erreur de lecture localStorage (${key})`,
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
      `Erreur d'écriture localStorage (${key})`,
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
   NORMALISATION CAPITAL
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
      generateId("capital"),

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

/* =========================================================
   NORMALISATION TRADE
========================================================= */

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
    (item) => item.id === capitalId
  );

  const asset = safeText(
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

  const rawResult =
    safeText(
      trade.result
    ).toUpperCase();

  const result = [
    "TP",
    "SL",
    "BE",
  ].includes(rawResult)
    ? rawResult
    : "TP";

  const normalized = {
    id:
      trade.id ||
      generateId("trade"),

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
        trade.realizedPips,
      0
    ),

    pipValuePerLot: number(
      trade.pipValuePerLot,
      0
    ),

    pnl: number(
      trade.pnl,
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

  return normalized;
}

/* =========================================================
   CHARGEMENT DES DONNÉES
========================================================= */

function normalizeAllData() {
  const storedCapitals = readStorage(
    STORAGE_KEYS.capitals,
    []
  );

  const storedTrades = readStorage(
    STORAGE_KEYS.trades,
    []
  );

  const storedSettings = readStorage(
    STORAGE_KEYS.settings,
    {}
  );

  const storedMetadata = readStorage(
    STORAGE_KEYS.metadata,
    {}
  );

  capitals = Array.isArray(
    storedCapitals
  )
    ? storedCapitals
        .map(normalizeCapital)
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

    capitals = capitals.map(
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
        capital.status ===
        "active"
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
      ) || activeCapital;
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

  trades = Array.isArray(
    storedTrades
  )
    ? storedTrades
        .map(normalizeTrade)
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
   CAPITAUX
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
      trade.capitalId === capitalId
  );
}

function getCapitalPnl(
  capitalId
) {
  return getCapitalTrades(
    capitalId
  ).reduce(
    (total, trade) =>
      total + number(trade.pnl),
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
  ) * 100;
}

function ensureOnlyOneActiveCapital(
  activeId
) {
  capitals = capitals.map(
    (capital) => {
      if (
        capital.id === activeId
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
   CALCULS PIP / LOT
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
    getAssetConfig(asset);

  const currentPrice =
    number(price);

  if (
    asset === "USDJPY"
  ) {
    if (
      currentPrice <= 0
    ) {
      return 0;
    }

    return 1000 / currentPrice;
  }

  if (
    asset === "USDCAD" ||
    asset === "USDCHF"
  ) {
    if (
      currentPrice <= 0
    ) {
      return 0;
    }

    return 10 / currentPrice;
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
    safeText(direction)
      .toUpperCase() ===
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
      safeText(direction)
        .toUpperCase() ===
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
   STATISTIQUES
========================================================= */

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
  chronological,
  startingBalance = 0
) {
  if (
    !chronological.length
  ) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
    };
  }

  let equity =
    number(startingBalance);

  let peak = equity;

  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  chronological.forEach(
    (trade) => {
      equity += number(
        trade.pnl
      );

      if (
        equity > peak
      ) {
        peak = equity;
      }

      const drawdown =
        peak - equity;

      if (
        drawdown >
        maxDrawdown
      ) {
        maxDrawdown =
          drawdown;
      }

      if (
        peak > 0
      ) {
        const drawdownPercent =
          (
            drawdown /
            peak
          ) * 100;

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

  const chronological =
    sortTradesChronologically(
      list
    );

  let type = null;
  let count = 0;

  for (
    let index =
      chronological.length - 1;
    index >= 0;
    index--
  ) {
    const result =
      chronological[index]
        .result;

    const currentType =
      result === "TP"
        ? "win"
        : result === "SL"
          ? "loss"
          : "be";

    if (
      type === null
    ) {
      type = currentType;
      count = 1;
      continue;
    }

    if (
      currentType === type
    ) {
      count++;
    } else {
      break;
    }
  }

  return {
    value: count,
    type: type || "none",
  };
}

function getMaxStreak(
  list,
  resultType
) {
  const chronological =
    sortTradesChronologically(
      list
    );

  let current = 0;
  let maximum = 0;

  chronological.forEach(
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
          maximum = current;
        }
      } else {
        current = 0;
      }
    }
  );

  return maximum;
}

function getTradeStats(
  tradeList,
  startingBalance = 0
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
        sum + number(trade.pnl),
      0
    );

  const grossProfit =
    list.reduce(
      (sum, trade) =>
        sum +
        Math.max(
          0,
          number(trade.pnl)
        ),
      0
    );

  const grossLoss =
    Math.abs(
      list.reduce(
        (sum, trade) =>
          sum +
          Math.min(
            0,
            number(trade.pnl)
          ),
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
    profitFactor = Infinity;
  }

  const avgR =
    list.length > 0
      ? list.reduce(
          (sum, trade) =>
            sum + number(trade.r),
          0
        ) / list.length
      : 0;

  const avgWin =
    wins.length > 0
      ? wins.reduce(
          (sum, trade) =>
            sum + number(trade.pnl),
          0
        ) / wins.length
      : 0;

  const avgLoss =
    losses.length > 0
      ? losses.reduce(
          (sum, trade) =>
            sum + number(trade.pnl),
          0
        ) / losses.length
      : 0;

  const decidedTrades =
    wins.length +
    losses.length;

  const winRate =
    decidedTrades > 0
      ? (
          wins.length /
          decidedTrades
        ) * 100
      : 0;

  const chronological =
    sortTradesChronologically(
      list
    );

  const drawdownStats =
    calculateDrawdown(
      chronological,
      startingBalance
    );

  const currentStreak =
    calculateCurrentStreak(
      chronological
    );

  return {
    total: list.length,

    wins: wins.length,

    losses: losses.length,

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
      currentStreak.value,

    currentStreakType:
      currentStreak.type,

    maxWinStreak:
      getMaxStreak(
        chronological,
        "TP"
      ),

    maxLossStreak:
      getMaxStreak(
        chronological,
        "SL"
      ),
  };
}

/* =========================================================
   PÉRIODES
========================================================= */

function getTradesForPeriod(
  tradeList,
  period
) {
  const now = new Date();

  let start = null;

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

    start = new Date(now);

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
          trade.date ||
            trade.createdAt
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return false;
      }

      return (
        date >= start &&
        date <= now
      );
    }
  );
}

/* =========================================================
   MODALES
========================================================= */

function openModal(
  modal
) {
  if (!modal) {
    return;
  }

  modal.classList.add("active");
  modal.classList.add("open");
  modal.classList.add("show");

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
      () => firstInput.focus(),
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

  activePage = pageName;

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
   SIDEBAR MOBILE
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
   DATE EN-TÊTE
========================================================= */

function updateCurrentDate() {
  const element =
    $("current-date");

  if (!element) {
    return;
  }

  element.textContent =
    new Date().toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
}

/* =========================================================
   MODALE CAPITAL
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
      mode !== "percentage"
    );
  }

  if (amountGroup) {
    amountGroup.classList.toggle(
      "hidden",
      mode !== "fixed"
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
      $("capital-id")?.value
    ).trim();

  const name =
    safeText(
      $("capital-name")?.value
    ).trim();

  const initialCapital =
    number(
      $("capital-initial")?.value
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
    riskMode === "fixed" &&
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
          capital.id === id
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
      id: generateId("capital"),
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
      capitals.length === 1
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
   ACTIONS CAPITAL
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
        ? `Ce capital contient ${linkedTrades.length} trade(s). Supprimer ce capital supprimera également ces trades. Continuer ?`
        : "Supprimer ce capital ?"
    );

  if (!confirmed) {
    return;
  }

  capitals =
    capitals.filter(
      (item) =>
        item.id !== capitalId
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
      next?.id || null;
  }

  if (
    !settings.activeCapitalId &&
    capitals.length
  ) {
    ensureOnlyOneActiveCapital(
      capitals[0].id
    );
  }

  saveAll();

  renderAll();
}

/* =========================================================
   RENDU CAPITAUX
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
      activeCapital
        ? formatMoney(
            getCapitalBalance(
              activeCapital
            )
          )
        : "$0.00";
  }

  if (
    $("archived-capitals-count")
  ) {
    $("archived-capitals-count").textContent =
      String(
        archived.length
      );
  }

  const globalPnl =
    trades.reduce(
      (sum, trade) =>
        sum + number(trade.pnl),
      0
    );

  if (
    $("capitals-global-pnl")
  ) {
    $("capitals-global-pnl").textContent =
      formatMoney(
        globalPnl
      );
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
        <p>Crée un capital pour commencer ton journal.</p>
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
      capitalTrades,
      capital.initialCapital
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
    <div class="capital-card active-capital-card">
      <div class="capital-card-header">
        <div>
          <span class="status-badge active">ACTIF</span>
          <h3>${escapeHTML(
            capital.name
          )}</h3>
        </div>

        <div class="capital-card-actions">
          <button
            type="button"
            class="btn-secondary"
            data-edit-capital="${escapeHTML(
              capital.id
            )}"
          >
            Modifier
          </button>

          <button
            type="button"
            class="btn-secondary"
            data-archive-capital="${escapeHTML(
              capital.id
            )}"
          >
            Archiver
          </button>
        </div>
      </div>

      <div class="capital-main-value">
        ${formatMoney(balance)}
      </div>

      <div class="capital-card-grid">
        <div>
          <span>Capital initial</span>
          <strong>${formatMoney(
            capital.initialCapital
          )}</strong>
        </div>

        <div>
          <span>P&L</span>
          <strong class="${
            stats.pnl >= 0
              ? "positive"
              : "negative"
          }">
            ${formatMoney(stats.pnl)}
          </strong>
        </div>

        <div>
          <span>Risque / trade</span>
          <strong>
            ${formatMoney(risk)}
            (${formatPercent(
              getCapitalRiskPercent(
                capital
              ),
              2
            )})
          </strong>
        </div>

        <div>
          <span>RR par défaut</span>
          <strong>
            ${capital.defaultRR.toFixed(
              1
            )}R
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
      </div>
    </div>
  `;

  bindCapitalActionButtons();
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
        <strong>Aucun capital archivé</strong>
        <p>Les anciens capitaux apparaîtront ici.</p>
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
              capitalTrades,
              capital.initialCapital
            );

          const balance =
            getCapitalBalance(
              capital
            );

          return `
            <div class="capital-card archived-capital-card">
              <div class="capital-card-header">
                <div>
                  <span class="status-badge archived">
                    ARCHIVÉ
                  </span>

                  <h3>${escapeHTML(
                    capital.name
                  )}</h3>
                </div>

                <div class="capital-card-actions">
                  <button
                    type="button"
                    class="btn-secondary"
                    data-activate-capital="${escapeHTML(
                      capital.id
                    )}"
                  >
                    Activer
                  </button>

                  <button
                    type="button"
                    class="btn-secondary"
                    data-edit-capital="${escapeHTML(
                      capital.id
                    )}"
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    class="btn-danger"
                    data-delete-capital="${escapeHTML(
                      capital.id
                    )}"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div class="capital-main-value">
                ${formatMoney(balance)}
              </div>

              <div class="capital-card-grid">
                <div>
                  <span>Capital initial</span>
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
              </div>
            </div>
          `;
        }
      )
      .join("");

  bindCapitalActionButtons();
}

function bindCapitalActionButtons() {
  $all(
    "[data-edit-capital]"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          openEditCapitalModal(
            getCapitalById(
              button.dataset.editCapital
            )
          );
        }
      );
    }
  );

  $all(
    "[data-activate-capital]"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          activateCapital(
            button.dataset
              .activateCapital
          );
        }
      );
    }
  );

  $all(
    "[data-archive-capital]"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          archiveCapital(
            button.dataset
              .archiveCapital
          );
        }
      );
    }
  );

  $all(
    "[data-delete-capital]"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          deleteCapital(
            button.dataset
              .deleteCapital
          );
        }
      );
    }
  );
}

/* =========================================================
   DASHBOARD — FILTRE
========================================================= */

function getDashboardTrades() {
  if (
    dashboardFilter === "all"
  ) {
    return trades;
  }

  const activeCapital =
    getActiveCapital();

  if (!activeCapital) {
    return [];
  }

  return getCapitalTrades(
    activeCapital.id
  );
}

function getDashboardStartingBalance() {
  if (
    dashboardFilter === "all"
  ) {
    return capitals.reduce(
      (sum, capital) =>
        sum +
        number(
          capital.initialCapital
        ),
      0
    );
  }

  const activeCapital =
    getActiveCapital();

  return activeCapital
    ? number(
        activeCapital.initialCapital
      )
    : 0;
}

function updateDashboardFilterUI() {
  const select =
    $("dashboard-capital-filter");

  if (
    select &&
    select.value !==
      dashboardFilter
  ) {
    select.value =
      dashboardFilter;
  }
}

/* =========================================================
   DASHBOARD — KPI
========================================================= */

function renderDashboard() {
  const noCapital =
    $("dashboard-no-capital");

  const content =
    $("dashboard-content");

  const activeCapital =
    getActiveCapital();

  updateDashboardFilterUI();

  if (
    !activeCapital &&
    !capitals.length
  ) {
    if (noCapital) {
      noCapital.hidden = false;
    }

    if (content) {
      content.hidden = true;
    }

    renderGlobalPerformance();

    return;
  }

  if (noCapital) {
    noCapital.hidden = true;
  }

  if (content) {
    content.hidden = false;
  }

  const selectedTrades =
    getDashboardTrades();

  const startingBalance =
    getDashboardStartingBalance();

  const stats =
    getTradeStats(
      selectedTrades,
      startingBalance
    );

  let displayedBalance = 0;

  if (activeCapital) {
    displayedBalance =
      getCapitalBalance(
        activeCapital
      );
  }

  /*
   * Important :
   * La balance actuelle reste toujours
   * celle du capital ACTIF.
   *
   * Le filtre "Tous les capitaux"
   * concerne les statistiques globales,
   * pas la balance opérationnelle.
   */

  setText(
    "dashboard-capital",
    formatMoney(
      displayedBalance
    )
  );

  setText(
    "dashboard-start-capital",
    formatMoney(
      startingBalance
    )
  );

  setText(
    "dashboard-pnl",
    formatMoney(
      stats.pnl
    )
  );

  setText(
    "dashboard-pnl-percent",
    startingBalance > 0
      ? formatPercent(
          (
            stats.pnl /
            startingBalance
          ) * 100,
          2
        )
      : "0.00%"
  );

  setText(
    "dashboard-winrate",
    formatPercent(
      stats.winRate,
      1
    )
  );

  setText(
    "dashboard-wl",
    `${stats.wins} W / ${stats.losses} L / ${stats.breakevens} BE`
  );

  setText(
    "dashboard-trades",
    String(stats.total)
  );

  setText(
    "dashboard-profit-factor",
    Number.isFinite(
      stats.profitFactor
    )
      ? stats.profitFactor.toFixed(
          2
        )
      : stats.grossProfit > 0
        ? "∞"
        : "0.00"
  );

  setText(
    "dashboard-avg-r",
    formatR(
      stats.avgR
    )
  );

  setText(
    "dashboard-drawdown",
    formatMoney(
      stats.maxDrawdown
    )
  );

  setText(
    "dashboard-streak",
    String(
      stats.currentStreak
    )
  );

  setText(
    "dashboard-streak-label",
    getStreakLabel(
      stats.currentStreakType
    )
  );

  renderDashboardPeriods(
    selectedTrades
  );

  renderDashboardQuality(
    stats
  );

  renderEquityChart(
    selectedTrades,
    startingBalance
  );

  renderRecentTrades(
    selectedTrades
  );

  renderGlobalPerformance();
}

function getStreakLabel(
  type
) {
  switch (type) {
    case "win":
      return "Victoires consécutives";

    case "loss":
      return "Pertes consécutives";

    case "be":
      return "Break-even consécutifs";

    default:
      return "Aucun trade";
  }
}

/* =========================================================
   DASHBOARD — PÉRIODES
========================================================= */

function renderDashboardPeriods(
  selectedTrades
) {
  const periods = [
    {
      name: "today",
      pnlId:
        "dashboard-pnl-today",
      tradesId:
        "dashboard-trades-today",
    },
    {
      name: "week",
      pnlId:
        "dashboard-pnl-week",
      tradesId:
        "dashboard-trades-week",
    },
    {
      name: "month",
      pnlId:
        "dashboard-pnl-month",
      tradesId:
        "dashboard-trades-month",
    },
  ];

  periods.forEach(
    (period) => {
      const periodTrades =
        getTradesForPeriod(
          selectedTrades,
          period.name
        );

      const pnl =
        periodTrades.reduce(
          (sum, trade) =>
            sum +
            number(trade.pnl),
          0
        );

      setText(
        period.pnlId,
        formatMoney(pnl)
      );

      setText(
        period.tradesId,
        `${periodTrades.length} trade${
          periodTrades.length > 1
            ? "s"
            : ""
        }`
      );
    }
  );
}

/* =========================================================
   DASHBOARD — QUALITÉ
========================================================= */

function renderDashboardQuality(
  stats
) {
  setText(
    "dashboard-avg-win",
    stats.wins > 0
      ? formatMoney(
          stats.avgWin
        )
      : "$0.00"
  );

  setText(
    "dashboard-avg-loss",
    stats.losses > 0
      ? formatMoney(
          stats.avgLoss
        )
      : "$0.00"
  );

  setText(
    "dashboard-max-win-streak",
    String(
      stats.maxWinStreak
    )
  );

  setText(
    "dashboard-max-loss-streak",
    String(
      stats.maxLossStreak
    )
  );
}

/* =========================================================
   DASHBOARD — GLOBAL
========================================================= */

function renderGlobalPerformance() {
  const startingBalance =
    capitals.reduce(
      (sum, capital) =>
        sum +
        number(
          capital.initialCapital
        ),
      0
    );

  const stats =
    getTradeStats(
      trades,
      startingBalance
    );

  setText(
    "global-pnl",
    formatMoney(
      stats.pnl
    )
  );

  setText(
    "global-trades",
    String(
      stats.total
    )
  );

  setText(
    "global-winrate",
    formatPercent(
      stats.winRate,
      1
    )
  );

  setText(
    "global-capitals",
    String(
      capitals.length
    )
  );

  setText(
    "global-profit-factor",
    Number.isFinite(
      stats.profitFactor
    )
      ? stats.profitFactor.toFixed(
          2
        )
      : stats.grossProfit > 0
        ? "∞"
        : "0.00"
  );

  setText(
    "global-avg-r",
    formatR(
      stats.avgR
    )
  );

  setText(
    "global-drawdown",
    formatMoney(
      stats.maxDrawdown
    )
  );
}

/* =========================================================
   DASHBOARD — COURBE D'EQUITY
========================================================= */

function renderEquityChart(
  selectedTrades,
  startingBalance
) {
  const container =
    $("equity-chart");

  if (!container) {
    return;
  }

  const chronological =
    sortTradesChronologically(
      selectedTrades
    );

  if (
    !chronological.length
  ) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Pas encore de données</strong>
        <p>
          La courbe d'equity apparaîtra après tes premiers trades.
        </p>
      </div>
    `;

    setText(
      "equity-description",
      "Aucune donnée disponible pour cette sélection."
    );

    return;
  }

  let equity =
    number(startingBalance);

  const points = [
    {
      equity,
      trade: null,
    },
  ];

  chronological.forEach(
    (trade) => {
      equity += number(
        trade.pnl
      );

      points.push({
        equity,
        trade,
      });
    }
  );

  const width = 900;
  const height = 300;
  const padding = 35;

  const values =
    points.map(
      (point) =>
        point.equity
    );

  let min =
    Math.min(...values);

  let max =
    Math.max(...values);

  if (
    min === max
  ) {
    min -= 1;
    max += 1;
  }

  const range =
    max - min;

  const usableWidth =
    width -
    padding * 2;

  const usableHeight =
    height -
    padding * 2;

  const coordinatePoints =
    points.map(
      (point, index) => {
        const x =
          padding +
          (
            index /
            Math.max(
              1,
              points.length - 1
            )
          ) *
            usableWidth;

        const y =
          padding +
          (
            (max -
              point.equity) /
            range
          ) *
            usableHeight;

        return {
          x,
          y,
          equity:
            point.equity,
        };
      }
    );

  const linePoints =
    coordinatePoints
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  const areaPoints = [
    `${coordinatePoints[0].x},${
      height - padding
    }`,
    linePoints,
    `${
      coordinatePoints[
        coordinatePoints.length - 1
      ].x
    },${height - padding}`,
  ].join(" ");

  const last =
    coordinatePoints[
      coordinatePoints.length - 1
    ];

  container.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      width="100%"
      height="300"
      role="img"
      aria-label="Courbe d'equity"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id="equityGradient"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stop-opacity="0.30"
          />
          <stop
            offset="100%"
            stop-opacity="0"
          />
        </linearGradient>
      </defs>

      <line
        x1="${padding}"
        y1="${height - padding}"
        x2="${width - padding}"
        y2="${height - padding}"
        stroke="currentColor"
        stroke-opacity="0.12"
      />

      <line
        x1="${padding}"
        y1="${padding}"
        x2="${padding}"
        y2="${height - padding}"
        stroke="currentColor"
        stroke-opacity="0.12"
      />

      <polygon
        points="${areaPoints}"
        fill="url(#equityGradient)"
      />

      <polyline
        points="${linePoints}"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <circle
        cx="${last.x}"
        cy="${last.y}"
        r="5"
        fill="currentColor"
      />
    </svg>

    <div class="equity-chart-labels">
      <span>
        Départ : ${formatMoney(
          startingBalance
        )}
      </span>

      <span>
        Actuel : ${formatMoney(
          last.equity
        )}
      </span>

      <span>
        Max : ${formatMoney(
          max
        )}
      </span>
    </div>
  `;

  setText(
    "equity-description",
    `${chronological.length} trade${
      chronological.length > 1
        ? "s"
        : ""
    } pris en compte dans la courbe.`
  );
}

/* =========================================================
   DASHBOARD — TRADES RÉCENTS
========================================================= */

function renderRecentTrades(
  selectedTrades
) {
  const tbody =
    $("recent-trades");

  if (!tbody) {
    return;
  }

  const recent =
    sortTradesChronologically(
      selectedTrades
    )
      .reverse()
      .slice(0, 8);

  if (!recent.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    recent
      .map(
        (trade) => `
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
              ${escapeHTML(
                trade.result
              )}
            </td>

            <td>
              ${formatPips(
                trade.realizedPips
              )}
            </td>

            <td class="${
              trade.pnl >= 0
                ? "positive"
                : "negative"
            }">
              ${formatMoney(
                trade.pnl
              )}
            </td>

            <td>
              ${formatR(
                trade.r
              )}
            </td>

            <td>
              ${escapeHTML(
                trade.capitalName
              )}
            </td>
          </tr>
        `
      )
      .join("");
}

/* =========================================================
   JOURNAL
========================================================= */

function getJournalTrades() {
  if (
    journalFilter ===
    "active"
  ) {
    const active =
      getActiveCapital();

    if (!active) {
      return [];
    }

    return getCapitalTrades(
      active.id
    );
  }

  return trades;
}

function renderJournal() {
  const activeCapital =
    getActiveCapital();

  const noCapital =
    $("journal-no-capital");

  const summary =
    $("journal-summary");

  const table =
    $("journal-trades");

  if (
    !activeCapital &&
    !capitals.length
  ) {
    if (noCapital) {
      noCapital.hidden = false;
    }

    if (summary) {
      summary.innerHTML = "";
    }

    if (table) {
      table.innerHTML = "";
    }

    return;
  }

  if (noCapital) {
    noCapital.hidden = true;
  }

  const journalTrades =
    getJournalTrades();

  const stats =
    getTradeStats(
      journalTrades,
      activeCapital
        ? activeCapital.initialCapital
        : 0
    );

  if (summary) {
    summary.innerHTML = `
      <div class="journal-summary-item">
        <span>Trades</span>
        <strong>${stats.total}</strong>
      </div>

      <div class="journal-summary-item">
        <span>Win Rate</span>
        <strong>
          ${formatPercent(
            stats.winRate,
            1
          )}
        </strong>
      </div>

      <div class="journal-summary-item">
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

      <div class="journal-summary-item">
        <span>Avg R</span>
        <strong>
          ${formatR(
            stats.avgR
          )}
        </strong>
      </div>
    `;
  }

  if (!table) {
    return;
  }

  if (!journalTrades.length) {
    table.innerHTML = `
      <tr>
        <td colspan="14">
          Aucun trade enregistré.
        </td>
      </tr>
    `;

    return;
  }

  const chronological =
    sortTradesChronologically(
      journalTrades
    ).reverse();

  table.innerHTML =
    chronological
      .map(
        (trade) =>
          renderJournalRow(
            trade
          )
      )
      .join("");

  bindTradeDeleteButtons();
}

function renderJournalRow(
  trade
) {
  const directionClass =
    trade.direction === "BUY"
      ? "positive"
      : "negative";

  const resultClass =
    trade.result === "TP"
      ? "positive"
      : trade.result === "SL"
        ? "negative"
        : "";

  return `
    <tr>
      <td>
        ${formatDate(
          trade.date
        )}
      </td>

      <td>
        ${escapeHTML(
          trade.capitalName
        )}
      </td>

      <td>
        ${
          trade.capitalId ===
          getActiveCapital()?.id
            ? "Actif"
            : "Archivé"
        }
      </td>

      <td class="${directionClass}">
        ${escapeHTML(
          trade.direction
        )}
      </td>

      <td>
        ${formatPrice(
          trade.entry,
          trade.asset
        )}
      </td>

      <td>
        ${formatPrice(
          trade.sl,
          trade.asset
        )}
      </td>

      <td>
        ${formatPrice(
          trade.tp,
          trade.asset
        )}
      </td>

      <td>
        ${formatNumber(
          trade.lot,
          2
        )}
      </td>

      <td>
        ${formatR(
          trade.rr
        )}
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

      <td class="${
        trade.pnl >= 0
          ? "positive"
          : "negative"
      }">
        ${formatMoney(
          trade.pnl
        )}
      </td>

      <td>
        ${formatR(
          trade.r
        )}
      </td>

      <td>
        <button
          type="button"
          class="btn-icon danger"
          title="Supprimer"
          data-delete-trade="${escapeHTML(
            trade.id
          )}"
        >
          ×
        </button>
      </td>
    </tr>
  `;
}

function formatPrice(
  value,
  asset
) {
  const decimals =
    getPriceDecimals(
      asset
    );

  return number(
    value
  ).toFixed(
    decimals
  );
}

function bindTradeDeleteButtons() {
  $all(
    "[data-delete-trade]"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          deleteTrade(
            button.dataset
              .deleteTrade
          );
        }
      );
    }
  );
}

function deleteTrade(
  tradeId
) {
  const trade =
    trades.find(
      (item) =>
        item.id === tradeId
    );

  if (!trade) {
    return;
  }

  const confirmed =
    window.confirm(
      `Supprimer le trade du ${formatDate(
        trade.date
      )} ?`
    );

  if (!confirmed) {
    return;
  }

  trades =
    trades.filter(
      (item) =>
        item.id !== tradeId
    );

  saveAll();

  renderAll();
}

/* =========================================================
   MODALE TRADE
========================================================= */

function populateTradeDefaults() {
  const activeCapital =
    getActiveCapital();

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
      DEFAULT_TRADE.asset;
  }

  if (
    $("trade-direction")
  ) {
    $("trade-direction").value =
      DEFAULT_TRADE.direction;
  }

  if (
    $("trade-session")
  ) {
    $("trade-session").value =
      DEFAULT_TRADE.session;
  }

  if (
    $("trade-timeframe")
  ) {
    $("trade-timeframe").value =
      DEFAULT_TRADE.timeframe;
  }

  if (
    $("trade-result")
  ) {
    $("trade-result").value =
      DEFAULT_TRADE.result;
  }

  if (
    $("trade-rr")
  ) {
    $("trade-rr").value =
      activeCapital
        ? activeCapital.defaultRR
        : DEFAULT_TRADE.rr;
  }

  if (
    $("trade-setup")
  ) {
    $("trade-setup").value =
      "";
  }

  [
    "trade-entry",
    "trade-sl",
    "trade-be-exit",
    "trade-entry-reason",
    "trade-notes",
  ].forEach(
    (id) => {
      if ($(id)) {
        $(id).value = "";
      }
    }
  );

  updateTradeCapitalDisplay();
  updateTradeCalculation();
}

function updateTradeCapitalDisplay() {
  const capital =
    getActiveCapital();

  if (
    $("trade-active-capital-name")
  ) {
    $("trade-active-capital-name").textContent =
      capital
        ? capital.name
        : "Aucun capital actif";
  }

  if (
    $("trade-risk-display")
  ) {
    $("trade-risk-display").textContent =
      capital
        ? formatMoney(
            getCapitalRisk(
              capital
            )
          )
        : "$0.00";
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
        : "$0.00";
  }
}

function updateTradeCalculation() {
  const capital =
    getActiveCapital();

  const asset =
    safeText(
      $("trade-asset")?.value ||
        "XAUUSD"
    ).toUpperCase();

  const direction =
    safeText(
      $("trade-direction")?.value ||
        "BUY"
    ).toUpperCase();

  const entry =
    number(
      $("trade-entry")?.value
    );

  const sl =
    number(
      $("trade-sl")?.value
    );

  const rr =
    Math.min(
      10,
      Math.max(
        1,
        number(
          $("trade-rr")?.value,
          2
        )
      )
    );

  const result =
    safeText(
      $("trade-result")?.value ||
        "TP"
    ).toUpperCase();

  const beExit =
    number(
      $("trade-be-exit")?.value
    );

  const riskMoney =
    capital
      ? getCapitalRisk(
          capital
        )
      : 0;

  if (
    $("trade-risk-money")
  ) {
    $("trade-risk-money").textContent =
      formatMoney(
        riskMoney
      );
  }

  const calculation =
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
    $("trade-sl-pips")
  ) {
    $("trade-sl-pips").textContent =
      formatNumber(
        calculation.slPips,
        1
      );
  }

  if (
    $("trade-lot")
  ) {
    $("trade-lot").textContent =
      calculation.valid
        ? formatNumber(
            calculation.lot,
            2
          )
        : "0.00";
  }

  if (
    $("trade-lot-value")
  ) {
    $("trade-lot-value").value =
      calculation.lot;
  }

  if (
    $("trade-tp-display")
  ) {
    $("trade-tp-display").textContent =
      calculation.valid
        ? formatPrice(
            calculation.tp,
            asset
          )
        : "-";
  }

  if (
    $("trade-tp")
  ) {
    $("trade-tp").value =
      calculation.valid
        ? calculation.tp
        : "";
  }

  const beGroup =
    $("be-exit-group");

  if (beGroup) {
    beGroup.classList.toggle(
      "hidden",
      result !== "BE"
    );
  }

  if (
    $("trade-exit-display")
  ) {
    $("trade-exit-display").textContent =
      calculation.exitPrice > 0
        ? formatPrice(
            calculation.exitPrice,
            asset
          )
        : "-";
  }

  if (
    $("trade-realized-pips")
  ) {
    $("trade-realized-pips").textContent =
      formatNumber(
        calculation.realizedPips,
        1
      );
  }

  if (
    $("trade-pnl-display")
  ) {
    $("trade-pnl-display").textContent =
      formatMoney(
        calculation.pnl
      );
  }

  if (
    $("trade-r-display")
  ) {
    $("trade-r-display").textContent =
      formatR(
        calculation.r
      );
  }
}

function saveTradeFromForm(
  event
) {
  event.preventDefault();

  const capital =
    getActiveCapital();

  if (!capital) {
    alert(
      "Crée ou active un capital avant d'ajouter un trade."
    );

    return;
  }

  const asset =
    safeText(
      $("trade-asset")?.value ||
        "XAUUSD"
    ).toUpperCase();

  const direction =
    safeText(
      $("trade-direction")?.value ||
        "BUY"
    ).toUpperCase();

  const session =
    safeText(
      $("trade-session")?.value
    );

  const timeframe =
    safeText(
      $("trade-timeframe")?.value
    );

  const setup =
    safeText(
      $("trade-setup")?.value
    );

  const entry =
    number(
      $("trade-entry")?.value
    );

  const sl =
    number(
      $("trade-sl")?.value
    );

  const rr =
    Math.min(
      10,
      Math.max(
        1,
        number(
          $("trade-rr")?.value,
          2
        )
      )
    );

  const result =
    safeText(
      $("trade-result")?.value ||
        "TP"
    ).toUpperCase();

  const beExit =
    number(
      $("trade-be-exit")?.value
    );

  const date =
    $("trade-date")?.value
      ? new Date(
          $("trade-date").value
        ).toISOString()
      : new Date().toISOString();

  if (
    entry <= 0 ||
    sl <= 0
  ) {
    alert(
      "Veuillez renseigner une entrée et un Stop Loss valides."
    );

    return;
  }

  if (
    result === "BE" &&
    beExit <= 0
  ) {
    alert(
      "Veuillez renseigner le prix de sortie du Break-even."
    );

    return;
  }

  const riskMoney =
    getCapitalRisk(
      capital
    );

  const calculation =
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

  if (!calculation.valid) {
    alert(
      "Impossible de calculer le trade. Vérifie l'entrée, le SL et le capital."
    );

    return;
  }

  const trade = {
    id: generateId("trade"),

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
      calculation.tp,

    exitPrice:
      calculation.exitPrice,

    rr,

    lot:
      calculation.lot,

    lotRaw:
      calculation.lot,

    riskMoney,

    riskAtStop:
      riskMoney,

    slPips:
      calculation.slPips,

    realizedPips:
      calculation.realizedPips,

    pipValuePerLot:
      calculation.pipValuePerLot,

    pnl:
      calculation.pnl,

    r:
      calculation.r,

    entryReason:
      safeText(
        $("trade-entry-reason")
          ?.value
      ),

    exitReason: "",

    emotion: "",

    mistakes: "",

    notes:
      safeText(
        $("trade-notes")
          ?.value
      ),

    fees: 0,

    swap: 0,

    date,

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

  showStatus(
    "Trade enregistré avec succès."
  );
}

function openNewTradeModal() {
  const activeCapital =
    getActiveCapital();

  if (!activeCapital) {
    alert(
      "Crée ou active un capital avant d'ajouter un trade."
    );

    return;
  }

  const form =
    $("trade-form");

  if (form) {
    form.reset();
  }

  populateTradeDefaults();

  openModal(
    $("trade-modal")
  );
}

/* =========================================================
   PLAN DE TRADING
========================================================= */

function getPlanState() {
  const stored =
    readStorage(
      "trading-plan-checklist",
      {}
    );

  return stored &&
    typeof stored === "object"
    ? stored
    : {};
}

function savePlanState(
  state
) {
  writeStorage(
    "trading-plan-checklist",
    state
  );
}

function updatePlanChecklist() {
  const checks =
    $all(
      "[data-plan-check]"
    );

  if (!checks.length) {
    return;
  }

  const state =
    getPlanState();

  checks.forEach(
    (checkbox) => {
      const key =
        checkbox.dataset
          .planCheck;

      checkbox.checked =
        Boolean(
          state[key]
        );
    }
  );

  updatePlanChecklistProgress();
}

function updatePlanChecklistProgress() {
  const checks =
    $all(
      "[data-plan-check]"
    );

  if (!checks.length) {
    return;
  }

  const checked =
    checks.filter(
      (checkbox) =>
        checkbox.checked
    ).length;

  const total =
    checks.length;

  const percentage =
    total > 0
      ? (
          checked /
          total
        ) * 100
      : 0;

  setText(
    "plan-checklist-progress",
    `${checked}/${total} — ${Math.round(
      percentage
    )}%`
  );

  const permission =
    checked === total &&
    total > 0;

  setText(
    "trade-permission-title",
    permission
      ? "Trading autorisé"
      : "Trading non autorisé"
  );

  setText(
    "trade-permission-description",
    permission
      ? "Toutes les conditions de ton plan sont validées."
      : "Complète toutes les conditions avant de prendre le trade."
  );

  const permissionElement =
    $("trade-permission");

  if (permissionElement) {
    permissionElement.classList.toggle(
      "allowed",
      permission
    );

    permissionElement.classList.toggle(
      "blocked",
      !permission
    );
  }
}

function setupPlanChecklist() {
  const checks =
    $all(
      "[data-plan-check]"
    );

  checks.forEach(
    (checkbox) => {
      checkbox.addEventListener(
        "change",
        () => {
          const state =
            getPlanState();

          state[
            checkbox.dataset
              .planCheck
          ] =
            checkbox.checked;

          savePlanState(
            state
          );

          updatePlanChecklistProgress();
        }
      );
    }
  );

  const resetButton =
    $("reset-plan-checklist");

  if (resetButton) {
    resetButton.addEventListener(
      "click",
      () => {
        const confirmed =
          window.confirm(
            "Réinitialiser toute la checklist ?"
          );

        if (!confirmed) {
          return;
        }

        savePlanState({});

        updatePlanChecklist();
      }
    );
  }

  const saveButton =
    $("save-plan");

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      () => {
        const state = {};

        checks.forEach(
          (checkbox) => {
            state[
              checkbox.dataset
                .planCheck
            ] =
              checkbox.checked;
          }
        );

        savePlanState(
          state
        );

        showStatus(
          "Plan enregistré."
        );
      }
    );
  }
}

/* =========================================================
   UTILITAIRES DOM
========================================================= */

function setText(
  id,
  value
) {
  const element = $(id);

  if (element) {
    element.textContent =
      safeText(value);
  }
}

function showStatus(
  message
) {
  const status =
    $("app-status");

  if (!status) {
    return;
  }

  status.textContent =
    message;

  clearTimeout(
    showStatus.timeout
  );

  showStatus.timeout =
    setTimeout(
      () => {
        status.textContent =
          "";
      },
      3500
    );
}

/* =========================================================
   THÈME
========================================================= */

function setupTheme() {
  const themeButton =
    $("theme-toggle");

  if (!themeButton) {
    return;
  }

  const storedTheme =
    localStorage.getItem(
      "trading-plan-theme"
    );

  if (
    storedTheme === "light"
  ) {
    document.body.classList.add(
      "light-theme"
    );
  }

  themeButton.addEventListener(
    "click",
    () => {
      document.body.classList.toggle(
        "light-theme"
      );

      localStorage.setItem(
        "trading-plan-theme",
        document.body.classList.contains(
          "light-theme"
        )
          ? "light"
          : "dark"
      );
    }
  );
}

/* =========================================================
   ÉVÉNEMENTS FORMULAIRES
========================================================= */

function setupCapitalEvents() {
  const openButton =
    $("open-capital-modal");

  if (openButton) {
    openButton.addEventListener(
      "click",
      openNewCapitalModal
    );
  }

  const closeButton =
    $("close-capital-modal");

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      () =>
        closeModal(
          $("capital-modal")
        )
    );
  }

  const cancelButton =
    $("cancel-capital");

  if (cancelButton) {
    cancelButton.addEventListener(
      "click",
      () =>
        closeModal(
          $("capital-modal")
        )
    );
  }

  const form =
    $("capital-form");

  if (form) {
    form.addEventListener(
      "submit",
      saveCapitalFromForm
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
}

function setupTradeEvents() {
  const openButton =
    $("open-trade-modal");

  if (openButton) {
    openButton.addEventListener(
      "click",
      openNewTradeModal
    );
  }

  const closeButton =
    $("close-trade-modal");

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      () =>
        closeModal(
          $("trade-modal")
        )
    );
  }

  const cancelButton =
    $("cancel-trade");

  if (cancelButton) {
    cancelButton.addEventListener(
      "click",
      () =>
        closeModal(
          $("trade-modal")
        )
    );
  }

  const form =
    $("trade-form");

  if (form) {
    form.addEventListener(
      "submit",
      saveTradeFromForm
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
      const element = $(id);

      if (element) {
        element.addEventListener(
          "input",
          updateTradeCalculation
        );

        element.addEventListener(
          "change",
          updateTradeCalculation
        );
      }
    }
  );
}

function setupDashboardEvents() {
  const filter =
    $("dashboard-capital-filter");

  if (filter) {
    filter.addEventListener(
      "change",
      () => {
        dashboardFilter =
          filter.value ===
          "all"
            ? "all"
            : "active";

        renderDashboard();
      }
    );
  }
}

function setupJournalEvents() {
  const filter =
    $("journal-capital-filter");

  if (filter) {
    filter.addEventListener(
      "change",
      () => {
        journalFilter =
          filter.value ===
          "active"
            ? "active"
            : "all";

        renderJournal();
      }
    );
  }
}

/* =========================================================
   FERMETURE MODALES / ESC
========================================================= */

function setupGlobalEvents() {
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape"
      ) {
        closeAllModals();
        closeMobileSidebar();
      }
    }
  );

  $all(
    ".modal-overlay"
  ).forEach(
    (modal) => {
      modal.addEventListener(
        "click",
        (event) => {
          if (
            event.target === modal
          ) {
            closeModal(
              modal
            );
          }
        }
      );
    }
  );
}

/* =========================================================
   RENDU GLOBAL
========================================================= */

function renderAll() {
  updateCurrentDate();

  if (
    activePage ===
    "dashboard"
  ) {
    renderDashboard();
  }

  if (
    activePage ===
    "journal"
  ) {
    renderJournal();
  }

  if (
    activePage ===
    "capitals"
  ) {
    renderCapitals();
  }

  if (
    activePage ===
    "plan"
  ) {
    updatePlanChecklist();
  }

  updateTradeCapitalDisplay();
}

/* =========================================================
   INITIALISATION
========================================================= */

function initApp() {
  try {
    normalizeAllData();

    setupNavigation();
    setupMobileSidebar();
    setupCapitalEvents();
    setupTradeEvents();
    setupDashboardEvents();
    setupJournalEvents();
    setupPlanChecklist();
    setupGlobalEvents();
    setupTheme();

    updateCapitalRiskModeUI();
    updateCurrentDate();

    showPage(
      activePage
    );

    updateTradeCapitalDisplay();

    console.log(
      `Trading Plan initialisé — Version ${APP_VERSION}`
    );
  } catch (error) {
    console.error(
      "Erreur lors de l'initialisation de l'application :",
      error
    );

    showStatus(
      "Une erreur est survenue lors du chargement de l'application."
    );
  }
}

/* =========================================================
   DÉMARRAGE
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
