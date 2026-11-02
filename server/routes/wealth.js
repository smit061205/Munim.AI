import express from "express";
import {
  addAsset,
  addLiability,
  addSampleData,
  createGoal,
  exportData,
  monthlyReport,
  overview,
  removeAsset,
  removeGoal,
  removeLiability,
  removeSampleData,
  saveCreditScore,
  saveEpf,
  updateAsset,
  updateGoal,
  updateLiability,
} from "../controllers/wealthController.js";

const router = express.Router();

router.get("/overview", overview);
router.get("/export", exportData);
router.get("/reports/monthly", monthlyReport);

router.post("/assets/:kind", addAsset);
router.put("/assets/:kind/:id", updateAsset);
router.delete("/assets/:kind/:id", removeAsset);

router.post("/liabilities", addLiability);
router.put("/liabilities/:id", updateLiability);
router.delete("/liabilities/:id", removeLiability);

router.put("/epf", saveEpf);
router.put("/credit-score", saveCreditScore);

router.post("/goals", createGoal);
router.put("/goals/:id", updateGoal);
router.delete("/goals/:id", removeGoal);

router.post("/sample-data", addSampleData);
router.delete("/sample-data", removeSampleData);

export default router;
