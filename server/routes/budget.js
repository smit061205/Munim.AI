import express from "express";
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  updateBudgetSpending,
} from "../controllers/budgetController.js";
import { requireAuth } from "../middleware/clerkAuth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// @route   GET /api/budgets
// @desc    Get all budgets for authenticated user
// @access  Private
router.get("/", getBudgets);

// @route   POST /api/budgets
// @desc    Create a new budget
// @access  Private
router.post("/", createBudget);

// @route   PUT /api/budgets/:budgetId
// @desc    Update a specific budget
// @access  Private
router.put("/:budgetId", updateBudget);

// @route   DELETE /api/budgets/:budgetId
// @desc    Delete a specific budget
// @access  Private
router.delete("/:budgetId", deleteBudget);

// @route   PUT /api/budgets/update-spending
// @desc    Update budget spending (called when transactions are added)
// @access  Private
router.put("/update-spending", updateBudgetSpending);

export default router;
