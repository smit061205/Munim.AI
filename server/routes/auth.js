import express from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  deleteAccount,
  signInDemo,
  isDemoEnabled,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Slow down password guessing; only failed attempts count
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
  },
});

router.post("/register", credentialsLimiter, registerUser);
router.post("/login", credentialsLimiter, loginUser);
router.get("/demo", (req, res) => res.json({ enabled: isDemoEnabled() }));
router.post("/demo", credentialsLimiter, signInDemo);
router.get("/me", requireAuth, getCurrentUser);
router.patch("/me", requireAuth, updateCurrentUser);
router.delete("/me", requireAuth, deleteAccount);
router.post("/change-password", requireAuth, credentialsLimiter, changePassword);

export default router;
