import XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "../models/Financial.js";

const REQUIRED_TX_COLUMNS = ["date", "amount", "type", "category"]; // description/account optional

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseNumber(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[,₹\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

const pad = (value) => String(value).padStart(2, "0");

function parseDateToISO(dateVal) {
  // Transaction schema expects a string; we store ISO yyyy-mm-dd to be consistent
  const text = String(dateVal || "").trim();
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  // Indian statements put the day first
  const dayFirst = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year.length === 2 ? `20${year}` : year}-${pad(month)}-${pad(day)}`;
  }

  // Local parts, because toISOString would move the date across midnight UTC
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export class IngestService {
  // True when a chat message asks to save an attached file's rows
  static wantsImport(text = "") {
    const message = text.toLowerCase();
    return (
      /upload|ingest|import|save|add/.test(message) &&
      /expense|transaction|spend/.test(message)
    );
  }

  // Return { parsed, meta }
  static parseExcel(buffer, fileName = "upload.xlsx") {
    const workbook = XLSX.read(buffer, { type: "buffer", dateNF: "dd/mm/yyyy" });
    const parsed = {};

    workbook.SheetNames.forEach((sheetName) => {
      const ws = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
        raw: false,
      });
      if (!rows || rows.length === 0) return;
      const headers = (rows[0] || []).map(normalizeHeader);
      const data = rows.slice(1).map((r) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
        return obj;
      });
      parsed[sheetName] = { headers, data, rowCount: data.length };
    });

    const meta = {
      fileName,
      sheets: Object.keys(parsed),
      rowsBySheet: Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, v.rowCount || 0])
      ),
    };

    return { parsed, meta };
  }

  // Ingest transactions into the Transaction collection
  // Returns { inserted, skipped, errors }
  static async ingestTransactions(userId, parsed) {
    console.log(
      " IngestService.ingestTransactions called with userId:",
      userId
    );

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    // Use first sheet with data
    const firstSheet = Object.values(parsed)[0];
    if (!firstSheet || !firstSheet.data || firstSheet.data.length === 0) {
      return { inserted: 0, skipped: 0, errors: ["No data found in Excel"] };
    }

    const rows = firstSheet.data;

    console.log(
      " Looking for existing Transaction document with userId:",
      userId
    );
    let doc = await Transaction.findOne({ user_id: userId });

    if (!doc) {
      console.log(" Creating new Transaction document for userId:", userId);
      doc = await Transaction.create({
        user_id: userId,
        transactions: [],
      });
    } else {
      console.log(" Found existing Transaction document:", {
        docId: doc._id,
        userId: doc.user_id,
        existingTransactions: doc.transactions.length,
      });
    }

    // Build a dedupe set using date|amount|category|description signature
    const existingSig = new Set(
      (doc.transactions || []).map(
        (t) => `${t.date}|${t.amount}|${t.category}|${t.description || ""}`
      )
    );

    const toInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      // Try to map known headers with flexible naming
      const dateVal =
        raw.date ||
        raw.transaction_date ||
        raw.date_of_transaction ||
        raw["transaction_date_(yyyy-mm-dd)"];
      const amountVal =
        raw.amount || raw.amt || raw.value || raw.debit || raw.credit;
      const typeVal = raw.type || raw.txn_type || raw.transaction_type;
      const categoryVal = raw.category || raw.cat || raw.head;
      const descriptionVal =
        raw.description || raw.note || raw.details || raw.merchant;
      const accountVal = raw.account || raw.account_name || raw.bank_account;

      // Validate required
      const amt = parseNumber(amountVal);
      const dateISO = parseDateToISO(dateVal);

      if (!dateISO || !Number.isFinite(amt) || !categoryVal) {
        skipped++;
        errors.push(`Row ${i + 2}: missing/invalid required fields`);
        continue;
      }

      // Determine type if missing
      let finalType = (typeVal || "").toString().toLowerCase();
      if (finalType !== "income" && finalType !== "expense") {
        finalType = amt >= 0 ? "income" : "expense";
      }

      const normalizedAmount =
        finalType === "expense" ? -Math.abs(amt) : Math.abs(amt);

      const tx = {
        id: uuidv4(),
        date: dateISO,
        amount: normalizedAmount,
        type: finalType,
        category: String(categoryVal),
        description: descriptionVal ? String(descriptionVal) : undefined,
        account: accountVal ? String(accountVal) : undefined,
      };

      const sig = `${tx.date}|${tx.amount}|${tx.category}|${
        tx.description || ""
      }`;
      if (existingSig.has(sig)) {
        skipped++;
        continue;
      }

      existingSig.add(sig);
      toInsert.push(tx);
    }

    if (toInsert.length > 0) {
      // Push many and save
      doc.transactions.push(...toInsert);
      await doc.save();
      inserted = toInsert.length;
    }

    return { inserted, skipped, errors };
  }
}
