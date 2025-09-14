import XLSX from "xlsx";
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

function parseDateToISO(dateVal) {
  // Transaction schema expects a string; we store ISO yyyy-mm-dd to be consistent
  try {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return String(dateVal);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(dateVal || "");
  }
}

export class IngestService {
  // Return { parsed, meta }
  static parseExcel(buffer, fileName = "upload.xlsx") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
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
  static async ingestTransactions(clerkId, parsed) {
    console.log(
      " IngestService.ingestTransactions called with clerkId:",
      clerkId
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
      " Looking for existing Transaction document with clerkId:",
      clerkId
    );
    let doc = await Transaction.findOne({ clerkId });

    // If no document found with current clerkId, check for old clerkId and update it
    if (!doc) {
      const oldClerkId = "user_32eIuzzFAAlZ1JzWbY3Cp7ZBSzr";
      console.log(
        " No document found with current clerkId, checking for old clerkId:",
        oldClerkId
      );

      const oldDoc = await Transaction.findOne({ clerkId: oldClerkId });
      if (oldDoc) {
        console.log(
          " Found document with old clerkId, updating to new clerkId:",
          clerkId
        );
        oldDoc.clerkId = clerkId;
        oldDoc.user_id = clerkId;
        await oldDoc.save();
        doc = oldDoc;
        console.log(
          " Successfully updated clerkId from",
          oldClerkId,
          "to",
          clerkId
        );
      } else {
        console.log(" Creating new Transaction document for clerkId:", clerkId);
        doc = await Transaction.create({
          clerkId,
          user_id: clerkId,
          transactions: [],
        });
      }
    } else {
      console.log(" Found existing Transaction document:", {
        docId: doc._id,
        clerkId: doc.clerkId,
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

      const normalizedAmount = Math.abs(amt);

      const tx = {
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
