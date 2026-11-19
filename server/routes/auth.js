import express from "express";
import rateLimit from "express-rate-limit";
import { MongoStore } from "../middleware/rateLimitStore.js";
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
import {
  forgotPassword,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "../controllers/authEmailController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Requests that send an email count whether or not they succeed
const emailLimiter = rateLimit({
  store: new MongoStore("emails"),
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many emails asked for. Try again in an hour." },
});

// Slow down password guessing; only failed attempts count
const credentialsLimiter = rateLimit({
  store: new MongoStore("credentials"),
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
router.post("/forgot-password", emailLimiter, forgotPassword);
router.post("/reset-password", credentialsLimiter, resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", requireAuth, emailLimiter, resendVerification);
router.get("/me", requireAuth, getCurrentUser);
router.patch("/me", requireAuth, updateCurrentUser);
router.delete("/me", requireAuth, deleteAccount);
router.post("/change-password", requireAuth, credentialsLimiter, changePassword);

export default router;
