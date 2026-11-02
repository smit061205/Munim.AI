import express from "express";
import { saveTaxProfile, taxSummary } from "../controllers/taxController.js";

const router = express.Router();

router.get("/summary", taxSummary);
router.put("/profile", saveTaxProfile);

export default router;
