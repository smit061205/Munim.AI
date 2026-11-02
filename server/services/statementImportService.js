import { ApiError } from "../middleware/errorHandler.js";

const MONEY = "([\\d,]+(?:\\.\\d+)?)";
const CURRENCY = "(?:INR|Rs\\.?|₹)?\\s*";

const toNumber = (text) => Number(String(text).replace(/,/g, ""));

const round = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

// Line up the text fragments on each page into lines, as they read on paper
const readLines = async (buffer, password) => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  let document;
  try {
    document = await getDocument({
      data: new Uint8Array(buffer),
      password,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    }).promise;
  } catch (error) {
    if (error.name === "PasswordException") {
      throw new ApiError(
        400,
        password
          ? "That password didn't open this statement"
          : "This statement is locked. Enter its password.",
      );
    }
    throw new ApiError(400, "This file couldn't be read as a PDF");
  }

  const lines = [];
  try {
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const { items } = await page.getTextContent();

      const rows = new Map();
      for (const item of items) {
        if (!item.str?.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push(item);
      }

      [...rows.entries()]
        .sort(([a], [b]) => b - a)
        .forEach(([, row]) => {
          lines.push(
            row
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map((item) => item.str.trim())
              .join(" ")
              .replace(/\s+/g, " ")
              .trim(),
          );
        });
    }
  } finally {
    await document.destroy();
  }
  return lines;
};

const categoryOf = (name) => {
  const scheme = name.toLowerCase();
  if (/gold/.test(scheme)) return "Gold";
  if (/liquid|overnight|money market/.test(scheme)) return "Liquid";
  if (/debt|bond|gilt|duration|corporate|credit risk|banking (&|and) psu|income/.test(scheme)) {
    return "Debt";
  }
  if (/hybrid|balanced/.test(scheme)) return "Hybrid";
  if (/index|nifty|sensex/.test(scheme)) return "Index";
  return "Equity";
};

// "B205 - Axis Bluechip Fund - Direct Growth - ISIN: INF846K01164(Advisor...)"
const SCHEME = /^(.*?)[\s-]*ISIN\s*:\s*([A-Z0-9]{12})/i;
const CLOSING = new RegExp(`Closing Unit Balance\\s*:?\\s*${MONEY}`, "i");
const COST = new RegExp(`Cost Value\\s*:?\\s*${CURRENCY}${MONEY}`, "i");
const NAV = new RegExp(`NAV on [^:]*:\\s*${CURRENCY}${MONEY}`, "i");
const VALUE = new RegExp(
  `(?:Market Value|Valuation) on [^:]*:\\s*${CURRENCY}${MONEY}`,
  "i",
);

const cleanName = (text) =>
  text
    .replace(/^[A-Z0-9]{2,12}\s*-\s*/, "")
    .replace(/\(Non-Demat\)/gi, "")
    .replace(/\(Demat\)/gi, "")
    .replace(/[\s-]+$/, "")
    .trim();

// The detailed statement: a transaction block per scheme, per folio
const parseDetailed = (lines) => {
  const funds = new Map();
  let current = null;

  lines.forEach((line, index) => {
    // A long scheme name can push the ISIN on to the next line
    const scheme = line.match(SCHEME) ||
      (/ISIN\s*:\s*$/i.test(line) ? `${line} ${lines[index + 1] || ""}`.match(SCHEME) : null);
    if (scheme) {
      current = { name: cleanName(scheme[1]), isin: scheme[2].toUpperCase() };
      return;
    }

    const closing = line.match(CLOSING);
    if (!closing || !current) return;

    // These figures share the closing line, or wrap on to the next two
    const block = lines.slice(index, index + 3).join(" ");
    const units = toNumber(closing[1]);
    const nav = toNumber(block.match(NAV)?.[1] ?? 0);
    const value = toNumber(block.match(VALUE)?.[1] ?? units * nav);
    const cost = toNumber(block.match(COST)?.[1] ?? 0);

    if (units > 0 && value > 0) {
      const fund = funds.get(current.isin) || {
        scheme_name: current.name,
        scheme_code: current.isin,
        units: 0,
        current_value: 0,
        invested_amount: 0,
        nav,
      };
      fund.units += units;
      fund.current_value += value;
      fund.invested_amount += cost;
      funds.set(current.isin, fund);
    }
    current = null;
  });

  return [...funds.values()];
};

// The summary statement: one row per folio
// folio, scheme, cost value, nav date, nav, units, market value
const SUMMARY_ROW =
  /^(\S+)\s+(.+?)\s+([\d,]+\.\d{2})\s+\d{2}-[A-Za-z]{3}-\d{4}\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d{2})$/;

const parseSummary = (lines) => {
  const funds = new Map();

  for (const line of lines) {
    const row = line.match(SUMMARY_ROW);
    if (!row) continue;

    const name = cleanName(row[2]);
    const fund = funds.get(name) || {
      scheme_name: name,
      scheme_code: "",
      units: 0,
      current_value: 0,
      invested_amount: 0,
      nav: toNumber(row[4]),
    };
    fund.units += toNumber(row[5]);
    fund.current_value += toNumber(row[6]);
    fund.invested_amount += toNumber(row[3]);
    funds.set(name, fund);
  }

  return [...funds.values()];
};

export const parseStatementLines = (lines) => {
  const detailed = parseDetailed(lines);
  const funds = detailed.length ? detailed : parseSummary(lines);

  return funds.map((fund) => ({
    ...fund,
    units: round(fund.units, 3),
    current_value: round(fund.current_value, 2),
    invested_amount: round(fund.invested_amount, 2),
    category: categoryOf(fund.scheme_name),
  }));
};

// Reads a CAMS or KFintech consolidated account statement. Neither the file
// nor its password is kept.
export const readStatement = async (buffer, password) => {
  const funds = parseStatementLines(await readLines(buffer, password));
  if (funds.length === 0) {
    throw new ApiError(
      400,
      "No mutual fund holdings were found. Upload a CAMS or KFintech consolidated account statement.",
    );
  }
  return funds;
};

const VALID_FUND = (fund) =>
  typeof fund?.scheme_name === "string" &&
  fund.scheme_name.trim() &&
  Number.isFinite(fund.units) &&
  Number.isFinite(fund.current_value) &&
  fund.units > 0 &&
  fund.current_value > 0;

// A fund already held is refreshed rather than added twice, so a newer
// statement can be imported over an older one
export const mergeFunds = (portfolio, funds) => {
  if (!Array.isArray(funds) || funds.length === 0 || !funds.every(VALID_FUND)) {
    throw new ApiError(400, "There are no valid funds to import");
  }

  let added = 0;
  let updated = 0;

  for (const fund of funds) {
    const row = {
      scheme_name: fund.scheme_name.trim().slice(0, 200),
      scheme_code: String(fund.scheme_code || "").slice(0, 40),
      units: fund.units,
      current_value: fund.current_value,
      nav: Number(fund.nav) || 0,
      invested_amount: Number(fund.invested_amount) || 0,
      category: String(fund.category || "Equity").slice(0, 40),
    };

    const existing = portfolio.mutual_funds.find((item) =>
      row.scheme_code
        ? item.scheme_code === row.scheme_code
        : item.scheme_name === row.scheme_name,
    );

    if (existing) {
      Object.assign(existing, row);
      updated += 1;
    } else {
      portfolio.mutual_funds.push(row);
      added += 1;
    }
  }

  portfolio.total_value = [...portfolio.stocks, ...portfolio.mutual_funds].reduce(
    (sum, item) => sum + (item.current_value || 0),
    0,
  );

  return { added, updated };
};
