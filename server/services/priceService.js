import { Investment } from "../models/Financial.js";
import { findScheme, getNavTable, getQuote, priceInInr } from "./marketDataService.js";

const STALE_MS = 6 * 60 * 60 * 1000;
const WAIT_MS = 2500;

const sumValues = (portfolio) =>
  [...portfolio.stocks, ...portfolio.mutual_funds].reduce(
    (sum, item) => sum + (item.current_value || 0),
    0,
  );

// Brings live holdings up to the latest NAV and price. Holdings the user
// values by hand, and sample data, are left alone.
export const refreshPrices = async (doc) => {
  const portfolio = doc?.portfolio;
  if (!portfolio) return { funds: 0, stocks: 0 };

  let funds = 0;
  let stocks = 0;
  const liveFunds = portfolio.mutual_funds.filter((fund) => fund.price_source !== "manual" && fund.price_source !== "sample");
  const liveStocks = portfolio.stocks.filter((stock) => stock.price_source !== "manual" && stock.price_source !== "sample");

  if (liveFunds.length) {
    try {
      const table = await getNavTable();
      for (const fund of liveFunds) {
        const scheme = findScheme(table, {
          isin: /^IN[A-Z0-9]{10}$/.test(fund.scheme_code || "") ? fund.scheme_code : null,
          code: fund.amfi_code,
          name: fund.scheme_name,
        });
        if (!scheme || !fund.units) continue;
        fund.amfi_code = scheme.code;
        fund.nav = scheme.nav;
        fund.nav_date = scheme.date;
        fund.current_value = Math.round(fund.units * scheme.nav * 100) / 100;
        if (!fund.category || fund.category === "Equity") fund.category = scheme.category;
        funds += 1;
      }
    } catch (error) {
      console.warn("NAV refresh failed:", error.message);
    }
  }

  await Promise.all(
    liveStocks.map(async (stock) => {
      if (!stock.symbol || !stock.quantity) return;
      try {
        const quote = await getQuote(stock.symbol);
        stock.price = quote.price;
        stock.price_date = quote.asOf.slice(0, 10);
        stock.current_value = Math.round(stock.quantity * quote.price * 100) / 100;
        stocks += 1;
      } catch (error) {
        console.warn(`Price for ${stock.symbol} failed:`, error.message);
      }
    }),
  );

  // US shares, crypto, ESOPs and gold, priced in rupees
  let others = 0;
  await Promise.all(
    (portfolio.other || [])
      .filter((item) => ["us_stock", "crypto", "esop", "gold"].includes(item.kind))
      .map(async (item) => {
        const units = item.kind === "gold" ? item.grams : item.quantity;
        if (!units || (item.kind !== "gold" && !item.symbol)) return;
        try {
          const { price, asOf } = await priceInInr(item);
          item.price = Math.round(price * 100) / 100;
          item.price_date = asOf.slice(0, 10);
          item.current_value = Math.round(units * price);
          others += 1;
        } catch (error) {
          console.warn(`Price for ${item.symbol || item.kind} failed:`, error.message);
        }
      }),
  );

  portfolio.total_value = sumValues(portfolio);
  portfolio.prices_refreshed_at = new Date();
  return { funds, stocks: stocks + others };
};

const inFlight = new Map();

// Refreshes a user's prices when they're more than a few hours old. Waits a
// moment so the page usually shows fresh numbers, but never holds it up.
export const refreshIfStale = async (userId, { force = false } = {}) => {
  const doc = await Investment.findOne({ user_id: userId });
  const refreshedAt = doc?.portfolio?.prices_refreshed_at?.getTime() || 0;
  if (!doc?.portfolio || (!force && Date.now() - refreshedAt < STALE_MS)) return null;

  if (!inFlight.has(userId)) {
    inFlight.set(
      userId,
      refreshPrices(doc)
        .then(async (result) => {
          // Only the changed fields are written, so an edit made meanwhile survives
          await doc.save();
          return result;
        })
        .finally(() => inFlight.delete(userId)),
    );
  }

  const work = inFlight.get(userId);
  if (force) return work;
  return Promise.race([work, new Promise((resolve) => setTimeout(() => resolve(null), WAIT_MS))]);
};
