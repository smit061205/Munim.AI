import express from "express";
import { handleAsync } from "../middleware/errorHandler.js";
import { ensureAuth } from "../middleware/clerkAuth.js";
import { IngestService } from "../services/ingestService.js";

const router = express.Router();

// All routes require auth
router.use(ensureAuth);

// POST /api/ingest/excel?target=transactions
// Accepts multipart/form-data with files[] (handled by server-level multer)
router.post(
  "/excel",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const target = (req.query.target || "transactions").toLowerCase();

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded. Attach an .xlsx or .xls file.",
      });
    }

    // Use the first file for now; can be extended to multi-file batch
    const file = req.files[0];

    const { parsed, meta } = IngestService.parseExcel(
      file.buffer,
      file.originalname
    );

    let result;
    switch (target) {
      case "transactions":
        result = await IngestService.ingestTransactions(clerkId, parsed);
        break;
      // Future targets (assets/liabilities/epf/creditScore/investments) can be added here
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported target: ${target}`,
        });
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
