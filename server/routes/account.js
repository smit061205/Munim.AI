import express from "express";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../controllers/accountController.js";
import { requireAuth } from "../middleware/clerkAuth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/accounts - Get all accounts for user
router.get("/", getAccounts);

// POST /api/accounts - Create new account
router.post("/", createAccount);

// PUT /api/accounts/:accountId - Update account
router.put("/:accountId", updateAccount);

// DELETE /api/accounts/:accountId - Delete account
router.delete("/:accountId", deleteAccount);

export default router;
