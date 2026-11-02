import { v4 as uuidv4 } from "uuid";
import { Investment } from "../models/Financial.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  mergeHoldings,
  readStatement,
} from "../services/statementImportService.js";
import { refreshIfStale } from "../services/priceService.js";
import { getQuote, searchSchemes } from "../services/marketDataService.js";

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OTHER_KINDS = ["fd", "rd", "ppf", "nps", "sgb", "bond", "other"];

const number = (value, label, { required = false, min = 0 } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ApiError(400, `Enter ${label}`);
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new ApiError(400, `Enter a valid ${label}`);
  }
  return parsed;
};

const optionalDate = (value, label) => {
  if (!value) return undefined;
  if (!DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ApiError(400, `Enter a valid ${label}`);
  }
  return value;
};

const text = (value, max = 200) =>
  value === undefined ? undefined : String(value).trim().slice(0, max);

const withoutUndefined = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

const loadDoc = async (userId) => {
  const doc =
    (await Investment.findOne({ user_id: userId })) ||
    new Investment({ user_id: userId });
  if (!doc.portfolio) doc.portfolio = { stocks: [], mutual_funds: [], other: [] };
  return doc;
};

const recalculate = (doc) => {
  doc.portfolio.total_value = [...doc.portfolio.stocks, ...doc.portfolio.mutual_funds].reduce(
    (sum, item) => sum + (item.current_value || 0),
    0,
  );
};

const readSip = (sip) => {
  if (!sip || !Number(sip.amount)) return undefined;
  const day = Number(sip.day);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    throw new ApiError(400, "Choose a SIP date between the 1st and the 28th");
  }
  return {
    amount: number(sip.amount, "SIP amount", { required: true }),
    day,
    start_date: optionalDate(sip.start_date, "SIP start date"),
    active: sip.active !== false,
  };
};

// The fields a person can set on a stock or fund. Values from the market
// (price, NAV and their dates) are only set by the price refresh.
const stockFields = (body, existing) => {
  const quantity = number(body.quantity, "number of shares", { required: !existing });
  const manual = body.price_source === "manual";
  const fields = withoutUndefined({
    symbol: text(body.symbol, 30)?.toUpperCase(),
    company_name: text(body.company_name),
    isin: text(body.isin, 12)?.toUpperCase(),
    quantity,
    purchase_price: number(body.purchase_price, "buy price"),
    purchase_date: optionalDate(body.purchase_date, "buy date"),
    sector: text(body.sector, 60),
    price_source: body.price_source === undefined ? undefined : manual ? "manual" : "live",
    current_value: number(body.current_value, "current value"),
    goal_id: body.goal_id === undefined ? undefined : text(body.goal_id, 40) || null,
  });
  if (!existing && (!fields.symbol || !fields.company_name)) {
    throw new ApiError(400, "Enter the company and its NSE symbol");
  }
  return fields;
};

const fundFields = (body, existing) => {
  const fields = withoutUndefined({
    scheme_name: text(body.scheme_name),
    scheme_code: text(body.scheme_code, 40),
    amfi_code: text(body.amfi_code, 12),
    units: number(body.units, "units", { required: !existing }),
    invested_amount: number(body.invested_amount, "amount invested"),
    purchase_date: optionalDate(body.purchase_date, "first investment date"),
    category: text(body.category, 40),
    price_source:
      body.price_source === undefined ? undefined : body.price_source === "manual" ? "manual" : "live",
    current_value: number(body.current_value, "current value"),
    goal_id: body.goal_id === undefined ? undefined : text(body.goal_id, 40) || null,
  });
  if (body.sip !== undefined) fields.sip = readSip(body.sip) || { active: false, amount: 0 };
  if (!existing && !fields.scheme_name) throw new ApiError(400, "Enter the scheme name");
  return fields;
};

export const getInvestments = handle(async (req, res) => {
  const doc = await Investment.findOne({ user_id: req.auth.userId }).lean();
  res.json({
    success: true,
    data: {
      stocks: doc?.portfolio?.stocks || [],
      mutual_funds: doc?.portfolio?.mutual_funds || [],
      other: doc?.portfolio?.other || [],
    },
  });
});

export const createInvestment = handle(async (req, res) => {
  const { type } = req.body;
  if (!["stock", "mutual_fund"].includes(type)) {
    throw new ApiError(400, "Investment type must be 'stock' or 'mutual_fund'");
  }

  const doc = await loadDoc(req.auth.userId);
  const fields = type === "stock" ? stockFields(req.body, null) : fundFields(req.body, null);
  if (fields.current_value === undefined) {
    // Filled in from the market on the refresh below; until then, at cost
    fields.current_value =
      type === "stock"
        ? (fields.purchase_price || 0) * fields.quantity
        : fields.invested_amount || 0;
  }
  if (fields.purchase_date && type === "stock" && fields.purchase_price) {
    fields.trades = [{
      date: fields.purchase_date,
      type: "buy",
      units: fields.quantity,
      amount: fields.purchase_price * fields.quantity,
    }];
  }

  const list = type === "stock" ? doc.portfolio.stocks : doc.portfolio.mutual_funds;
  list.push(fields);
  recalculate(doc);
  doc.portfolio.prices_refreshed_at = null;
  await doc.save();
  await refreshIfStale(req.auth.userId, { force: true }).catch(() => {});

  res.status(201).json({ success: true, data: list[list.length - 1] });
});

export const updateInvestment = handle(async (req, res) => {
  const { investmentId, type } = req.params;
  const doc = await Investment.findOne({ user_id: req.auth.userId });
  const list = type === "stock" ? doc?.portfolio?.stocks : doc?.portfolio?.mutual_funds;
  const item = list?.find((row) => row._id.toString() === investmentId);
  if (!item) throw new ApiError(404, "Investment not found");

  const fields = type === "stock" ? stockFields(req.body, item) : fundFields(req.body, item);
  // A value typed in only sticks for holdings valued by hand
  const source = fields.price_source || item.price_source;
  if (source !== "manual") delete fields.current_value;
  Object.assign(item, fields);
  recalculate(doc);
  doc.portfolio.prices_refreshed_at = null;
  await doc.save();
  await refreshIfStale(req.auth.userId, { force: true }).catch(() => {});

  res.json({ success: true, data: item });
});

export const deleteInvestment = handle(async (req, res) => {
  const { investmentId, type } = req.params;
  const doc = await Investment.findOne({ user_id: req.auth.userId });
  const list = type === "stock" ? doc?.portfolio?.stocks : doc?.portfolio?.mutual_funds;
  const index = list?.findIndex((row) => row._id.toString() === investmentId) ?? -1;
  if (index === -1) throw new ApiError(404, "Investment not found");

  list.splice(index, 1);
  recalculate(doc);
  await doc.save();
  res.json({ success: true });
});

// Deposits, PPF, NPS, gold bonds and other holdings
const otherFields = (body, existing) => {
  const kind = body.kind ?? existing?.kind;
  if (!OTHER_KINDS.includes(kind)) throw new ApiError(400, "Choose what kind of investment this is");

  const fields = withoutUndefined({
    kind,
    name: text(body.name, 120),
    institution: text(body.institution, 120),
    principal: number(body.principal, "amount"),
    monthly_deposit: number(body.monthly_deposit, "monthly deposit"),
    rate: number(body.rate, "interest rate"),
    start_date: optionalDate(body.start_date, "start date"),
    maturity_date: optionalDate(body.maturity_date, "maturity date"),
    current_value: number(body.current_value, "current value"),
    equity_share: number(body.equity_share, "equity share"),
    grams: number(body.grams, "grams"),
    goal_id: body.goal_id === undefined ? undefined : text(body.goal_id, 40) || null,
  });

  const merged = { ...(existing?.toObject?.() || {}), ...fields };
  if (["fd", "bond"].includes(kind) && (!merged.principal || !merged.rate || !merged.start_date)) {
    throw new ApiError(400, "Enter the amount, interest rate and start date");
  }
  if (kind === "rd" && (!merged.monthly_deposit || !merged.rate || !merged.start_date)) {
    throw new ApiError(400, "Enter the monthly deposit, interest rate and start date");
  }
  if (!["fd", "rd", "bond"].includes(kind) && !merged.current_value) {
    throw new ApiError(400, "Enter its current value");
  }
  if (merged.equity_share !== undefined && merged.equity_share > 100) {
    throw new ApiError(400, "The equity share can be at most 100%");
  }
  return fields;
};

export const addOtherInvestment = handle(async (req, res) => {
  const doc = await loadDoc(req.auth.userId);
  const item = { id: uuidv4(), ...otherFields(req.body, null) };
  doc.portfolio.other.push(item);
  await doc.save();
  res.status(201).json({ success: true, data: item });
});

export const updateOtherInvestment = handle(async (req, res) => {
  const doc = await Investment.findOne({ user_id: req.auth.userId });
  const item = doc?.portfolio?.other?.find((row) => row.id === req.params.id);
  if (!item) throw new ApiError(404, "Investment not found");
  Object.assign(item, otherFields(req.body, item));
  await doc.save();
  res.json({ success: true, data: item });
});

export const removeOtherInvestment = handle(async (req, res) => {
  const doc = await Investment.findOne({ user_id: req.auth.userId });
  if (!doc?.portfolio) throw new ApiError(404, "Investment not found");
  doc.portfolio.other = doc.portfolio.other.filter((row) => row.id !== req.params.id);
  await doc.save();
  res.json({ success: true });
});

// Gets today's NAVs and prices now rather than waiting for the next refresh
export const refreshInvestmentPrices = handle(async (req, res) => {
  const result = await refreshIfStale(req.auth.userId, { force: true });
  res.json({ success: true, data: result || { funds: 0, stocks: 0 } });
});

export const searchFunds = handle(async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 3) return res.json({ success: true, data: [] });
  res.json({ success: true, data: await searchSchemes(query) });
});

export const quote = handle(async (req, res) => {
  const symbol = String(req.query.symbol || "").trim();
  if (!symbol) throw new ApiError(400, "Enter a symbol");
  try {
    res.json({ success: true, data: await getQuote(symbol) });
  } catch {
    throw new ApiError(404, `No price was found for ${symbol}`);
  }
});

// Read a statement and return its holdings for the user to check. Nothing is
// saved until they confirm.
export const previewStatement = handle(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Choose your statement as a PDF file");
  }
  const result = await readStatement(req.file.buffer, req.body.password || "", req.auth.userId);
  res.json({ success: true, data: result });
});

// Save the holdings the user confirmed
export const importStatement = handle(async (req, res) => {
  const doc = await loadDoc(req.auth.userId);
  const result = mergeHoldings(doc.portfolio, {
    funds: req.body.funds || [],
    stocks: req.body.stocks || [],
  });
  doc.portfolio.prices_refreshed_at = null;
  await doc.save();
  await refreshIfStale(req.auth.userId, { force: true }).catch(() => {});
  res.json({ success: true, ...result });
});
