import express from "express";
import { handleAsync } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { IngestService } from "../services/ingestService.js";

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// POST /api/ingest/excel?target=transactions
// Accepts a spreadsheet (.xlsx, .xls, .csv) or a PDF bank statement as
// multipart/form-data files[] (handled by server-level multer)
router.post(
  "/excel",
  handleAsync(async (req, res) => {
    const userId = req.auth.userId;
    const target = (req.query.target || "transactions").toLowerCase();

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Attach a spreadsheet or a PDF bank statement.",
      });
    }
    if (target !== "transactions") {
      return res.status(400).json({
        success: false,
        message: `Unsupported target: ${target}`,
      });
    }

    const file = req.files[0];
    let result;
    let meta = { sheets: [], rowsBySheet: {} };

    if (/\.pdf$/i.test(file.originalname)) {
      try {
        const rows = await IngestService.parsePdf(userId, file.buffer, req.body.password || "");
        result = await IngestService.ingestTransactions(userId, null, { rows });
      } catch (error) {
        return res.status(error.status || 400).json({ success: false, message: error.message });
      }
    } else {
      const parsedFile = IngestService.parseExcel(file.buffer, file.originalname);
      meta = parsedFile.meta;
      result = await IngestService.ingestTransactions(userId, parsedFile.parsed);
    }

    return res.json({
      success: true,
      target,
      file: file.originalname,
      sheets: meta.sheets,
      rowsBySheet: meta.rowsBySheet,
      ...result,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
