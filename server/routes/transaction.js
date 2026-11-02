import express from "express";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listRules,
  createRule,
  deleteRule,
  recategorize,
} from "../controllers/transactionController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Categorisation rules. These come before the /:transactionId routes.
router.get("/rules", listRules);
router.post("/rules", createRule);
router.delete("/rules/:id", deleteRule);
router.post("/recategorize", recategorize);

router.get("/", getTransactions);
router.post("/", createTransaction);
router.put("/:transactionId", updateTransaction);
router.delete("/:transactionId", deleteTransaction);

export default router;
