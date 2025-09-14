import express from "express";
import {
  getInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "../controllers/investmentController.js";
import { requireAuth } from "../middleware/clerkAuth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/investment - Get all investments for user
router.get("/", getInvestments);

// POST /api/investment - Create new investment
router.post("/", createInvestment);

// PUT /api/investment/:type/:investmentId - Update investment
router.put("/:type/:investmentId", updateInvestment);

// DELETE /api/investment/:type/:investmentId - Delete investment
router.delete("/:type/:investmentId", deleteInvestment);

export default router;
