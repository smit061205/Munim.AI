// Market data from free public sources:
// - Mutual fund NAVs from AMFI's daily file (official, published each evening)
// - Index and NSE stock prices from Yahoo Finance's chart endpoint, which is
//   unofficial and delayed by about 15 minutes. Everything that shows one of
//   these prices says so.

const AMFI_URL = "https://portal.amfiindia.com/spages/NAVAll.txt";
const YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const NAV_TTL_MS = 6 * 60 * 60 * 1000;
const QUOTE_TTL_MS = 15 * 60 * 1000;
const HISTORY_TTL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20 * 1000;

// Names people use for the indices, mapped to Yahoo symbols
const INDICES = {
  "nifty 50": { symbol: "^NSEI", name: "Nifty 50" },
  nifty: { symbol: "^NSEI", name: "Nifty 50" },
  nifty50: { symbol: "^NSEI", name: "Nifty 50" },
  sensex: { symbol: "^BSESN", name: "Sensex" },
  "bank nifty": { symbol: "^NSEBANK", name: "Nifty Bank" },
  "nifty bank": { symbol: "^NSEBANK", name: "Nifty Bank" },
  banknifty: { symbol: "^NSEBANK", name: "Nifty Bank" },
  "nifty next 50": { symbol: "^NSMIDCP", name: "Nifty Next 50" },
  "nifty midcap": { symbol: "NIFTY_MIDCAP_100.NS", name: "Nifty Midcap 100" },
  "nifty it": { symbol: "^CNXIT", name: "Nifty IT" },
};

export const BENCHMARK = { symbol: "^NSEI", name: "Nifty 50" };

const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// "02-Nov-2026" to "2026-11-02"
const amfiDate = (text) => {
  const [day, month, year] = text.split("-");
  return `${year}-${MONTHS[month?.toLowerCase()] || "01"}-${day}`;
};

// AMFI's section headers name the SEBI category, e.g.
// "Open Ended Schemes(Equity Scheme - Large Cap Fund)"
const assetClassOfCategory = (category = "") => {
  const text = category.toLowerCase();
  if (/gold|silver/.test(text)) return "gold";
  if (/debt scheme|liquid|overnight|money market|gilt|duration|credit risk|banking and psu|floater|income/.test(text)) {
    return "debt";
  }
  if (/hybrid/.test(text) && /conservative|arbitrage/.test(text)) return "debt";
  return "equity";
};

// Short labels for the categories the app shows
const shortCategory = (category = "") => {
  const inner = category.match(/\((.*)\)/)?.[1] || category;
  const text = inner.toLowerCase();
  if (/gold|silver/.test(text)) return "Gold";
  if (/liquid|overnight|money market/.test(text)) return "Liquid";
  if (/elss/.test(text)) return "ELSS";
  if (/index|etf/.test(text)) return "Index";
  if (/hybrid/.test(text)) return "Hybrid";
  if (/debt/.test(text)) return "Debt";
  return "Equity";
};

export const parseAmfiFile = (text) => {
  const byIsin = new Map();
  const byCode = new Map();
  const schemes = [];
  let category = "";
  let date = "";

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const parts = line.split(";");
    if (parts.length < 8) {
      // A section header (category) or a fund house name
      if (/scheme/i.test(line)) category = line;
      continue;
    }

    const [code, isinGrowth, isinReinvest, name, plan, option, navText, dateText] = parts;
    const nav = Number(navText);
    if (!/^\d+$/.test(code) || !Number.isFinite(nav) || nav <= 0) continue;

    // Plan and option sit in their own columns: "Direct Plan", "Growth Option"
    const variant = [plan, option]
      .map((part) => part?.trim().replace(/\s+(plan|option)$/i, ""))
      .filter((part) => part && part !== "-");
    const scheme = {
      code,
      name: [name.trim(), ...variant].join(" - "),
      nav,
      date: amfiDate(dateText.trim()),
      category: shortCategory(category),
      assetClass: assetClassOfCategory(category),
      isins: [isinGrowth, isinReinvest].filter((isin) => /^IN[A-Z0-9]{10}$/.test(isin)),
    };
    if (scheme.date > date) date = scheme.date;

    schemes.push(scheme);
    byCode.set(code, scheme);
    scheme.isins.forEach((isin) => byIsin.set(isin, scheme));
  }

  return { schemes, byIsin, byCode, date };
};

let navCache = null;
let navLoading = null;

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Munim.AI)" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
};

// The whole NAV file is about 1.5 MB, so it's loaded once and shared
export const getNavTable = async () => {
  if (navCache && Date.now() - navCache.loadedAt < NAV_TTL_MS) return navCache;
  if (!navLoading) {
    navLoading = fetchText(AMFI_URL)
      .then((text) => {
        navCache = { ...parseAmfiFile(text), loadedAt: Date.now() };
        return navCache;
      })
      .catch((error) => {
        console.warn("Couldn't load AMFI NAVs:", error.message);
        // Keep serving the last good copy rather than nothing
        if (navCache) return navCache;
        throw error;
      })
      .finally(() => {
        navLoading = null;
      });
  }
  return navLoading;
};

const words = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !["fund", "the", "plan", "option", "of"].includes(word));

// Finds the AMFI scheme for a holding: by ISIN, then AMFI code, then by name
export const findScheme = (table, { isin, code, name }) => {
  if (isin && table.byIsin.has(isin)) return table.byIsin.get(isin);
  if (code && table.byCode.has(String(code))) return table.byCode.get(String(code));
  if (!name) return null;

  const wanted = words(name);
  const direct = /direct/i.test(name);
  const growth = !/idcw|dividend/i.test(name);
  let best = null;
  let bestScore = 0;

  for (const scheme of table.schemes) {
    const have = new Set(words(scheme.name));
    const hits = wanted.filter((word) => have.has(word)).length;
    let score = hits / Math.max(wanted.length, have.size);
    if (/direct/i.test(scheme.name) !== direct) score -= 0.2;
    if (/idcw|dividend/i.test(scheme.name) === growth) score -= 0.2;
    if (score > bestScore) {
      best = scheme;
      bestScore = score;
    }
  }
  // Below this, the names share too little to be sure it's the same fund
  return bestScore >= 0.6 ? best : null;
};

// Up to `limit` schemes whose names contain every word searched for
export const searchSchemes = async (query, limit = 8) => {
  const table = await getNavTable();
  const wanted = words(query);
  if (!wanted.length) return [];
  return table.schemes
    .filter((scheme) => {
      const have = scheme.name.toLowerCase();
      return wanted.every((word) => have.includes(word));
    })
    .sort((a, b) => /direct/i.test(b.name) - /direct/i.test(a.name) || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ code, name, nav, date, category, isins }) => ({
      code,
      name,
      nav,
      date,
      category,
      isin: isins[0] || "",
    }));
};

const quoteCache = new Map();
const historyCache = new Map();

const yahooChart = async (symbol, range, interval) => {
  const url = `${YAHOO_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const data = JSON.parse(await fetchText(url));
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(data.chart?.error?.description || "No data");
  return result;
};

// The symbol Yahoo uses for an NSE stock or a named index
export const toYahooSymbol = (text = "") => {
  const key = text.trim().toLowerCase();
  if (INDICES[key]) return INDICES[key];
  const symbol = text.trim().toUpperCase().replace(/\s+/g, "");
  if (symbol.startsWith("^") || /\.(NS|BO)$/.test(symbol)) return { symbol, name: symbol };
  return { symbol: `${symbol}.NS`, name: symbol };
};

// The latest price, delayed by about 15 minutes during market hours
export const getQuote = async (text) => {
  const { symbol, name } = toYahooSymbol(text);
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.loadedAt < QUOTE_TTL_MS) return cached.quote;

  const result = await yahooChart(symbol, "5d", "1d");
  const meta = result.meta;
  const closes = (result.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
  const price = meta.regularMarketPrice;
  // The day's own change when Yahoo gives it; otherwise the last two closes
  const previous = Number.isFinite(meta.regularMarketChangePercent)
    ? price / (1 + meta.regularMarketChangePercent / 100)
    : closes.length >= 2
      ? closes[closes.length - 2]
      : meta.chartPreviousClose;
  const quote = {
    symbol,
    name: meta.longName || meta.shortName || name,
    price,
    previousClose: previous ? +previous.toFixed(2) : null,
    change: previous ? +(price - previous).toFixed(2) : null,
    changePercent: previous ? +(((price - previous) / previous) * 100).toFixed(2) : null,
    asOf: new Date(meta.regularMarketTime * 1000).toISOString(),
    currency: meta.currency,
    delayed: true,
  };
  quoteCache.set(symbol, { quote, loadedAt: Date.now() });
  return quote;
};

// Daily closes as a sorted list of [yyyy-mm-dd, close], for benchmarks
export const getHistory = async (symbol = BENCHMARK.symbol) => {
  const cached = historyCache.get(symbol);
  if (cached && Date.now() - cached.loadedAt < HISTORY_TTL_MS) return cached.rows;

  const result = await yahooChart(symbol, "10y", "1d");
  const closes = result.indicators?.quote?.[0]?.close || [];
  const rows = (result.timestamp || [])
    .map((time, index) => [new Date(time * 1000).toISOString().slice(0, 10), closes[index]])
    .filter(([, close]) => Number.isFinite(close));
  historyCache.set(symbol, { rows, loadedAt: Date.now() });
  return rows;
};

// Whatever's cached, without waiting on the network
export const peekHistory = (symbol = BENCHMARK.symbol) =>
  historyCache.get(symbol)?.rows || null;

// The close on a date, or the last one before it (weekends and holidays)
export const closeOn = (rows, date) => {
  let low = 0;
  let high = rows.length - 1;
  let found = null;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (rows[middle][0] <= date) {
      found = rows[middle][1];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found ?? rows[0]?.[1] ?? null;
};

const NSE_EQUITY_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";
const EQUITY_TTL_MS = 24 * 60 * 60 * 1000;
let equityCache = null;

// NSE's list of listed companies, to turn an ISIN from a demat statement
// into the symbol prices are looked up by
export const getEquityList = async () => {
  if (equityCache && Date.now() - equityCache.loadedAt < EQUITY_TTL_MS) return equityCache;
  const text = await fetchText(NSE_EQUITY_URL);
  const byIsin = new Map();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const columns = line.split(",");
    if (columns.length < 7) continue;
    const isin = columns[6].trim();
    if (/^IN[A-Z0-9]{10}$/.test(isin)) {
      byIsin.set(isin, { symbol: columns[0].trim(), name: columns[1].trim() });
    }
  }
  equityCache = { byIsin, loadedAt: Date.now() };
  return equityCache;
};
