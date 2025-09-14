import express from "express";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transactionController.js";
import { requireAuth } from "../middleware/clerkAuth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/transaction - Get all transactions for user
router.get("/", getTransactions);

// POST /api/transaction - Create new transaction
router.post("/", createTransaction);

// PUT /api/transaction/:transactionId - Update transaction
router.put("/:transactionId", updateTransaction);

// DELETE /api/transaction/:transactionId - Delete transaction
router.delete("/:transactionId", deleteTransaction);

export default router;
