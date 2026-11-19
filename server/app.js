import mongoose from "mongoose";
import express from "express";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import multer from "multer"; // Import multer

// Import routes
import indexRouter from "./routes/index.js";
import authRoutes from "./routes/auth.js";
import investorProfileRoutes from "./routes/investorProfile.js";
import budgetRoutes from "./routes/budget.js";
import accountRoutes from "./routes/account.js";
import transactionRoutes from "./routes/transaction.js";
import investmentRoutes from "./routes/investment.js";
import permissionRoutes from "./routes/permissions.js";
import assistantRoutes from "./routes/assistant.js";
import wealthRoutes from "./routes/wealth.js";
import ingestRoutes from "./routes/ingest.js";
import taxRoutes from "./routes/tax.js";
import notificationRoutes from "./routes/notifications.js";
import shareRoutes from "./routes/share.js";
import feedbackRoutes from "./routes/feedback.js";
import adminRoutes from "./routes/admin.js";
import cronRoutes from "./routes/cron.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { withAuth, requireAuth } from "./middleware/auth.js";

// Load environment variables
dotenv.config();

// Refuse to start without a signing secret rather than failing on first login
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. See server/.env.example.");
  process.exit(1);
}

// Create Express app
const app = express();

// Vercel sits one proxy in front of the app; needed for per-client rate limits
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  app.set("trust proxy", 1);
}

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL, // Production frontend
    "http://localhost:5173", // Vite dev server
    "http://localhost:5174", // Alternative Vite dev server port
    "http://localhost:3000", // Alternative React dev server
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
  ].filter(Boolean), // Filter out undefined if env var is missing
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-request-id",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  exposedHeaders: ["Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

// Middleware. The API only returns JSON, so helmet's defaults fit as they are.
app.use(helmet());
app.use(cors(corsOptions));

// Parse JSON payloads
app.use(express.json());

// Attach the signed-in user (if any) to all routes
app.use(withAuth);

// Health check endpoint (no auth required)
// The commit says which version is live, so a deploy can be checked
const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];
const health = (req, res) => {
  res.json({
    status: "ok",
    database: DB_STATES[mongoose.connection.readyState] || "unknown",
    timestamp: new Date().toISOString(),
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT)?.slice(0, 8) || null,
  });
};
app.get("/health", health);
app.get("/api/health", health);

// MongoDB connection. On Vercel each warm function instance keeps its
// connection between requests, so it's made once per instance.
connectDB().catch((error) => console.error("MongoDB connection error:", error.message));

// If the first attempt failed (wrong password, IP not allowed), try again on
// the next request instead of letting every query wait 10 s and fail
app.use("/api", async (req, res, next) => {
  if (req.path === "/health" || mongoose.connection.readyState === 1) return next();
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    res.status(503).json({ success: false, status: 503, message: "The database is unavailable. Try again in a minute." });
  }
});

// Create multer instance
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Vercel rejects request bodies over 4.5 MB before they reach the app
    fileSize: 4 * 1024 * 1024,
  },
});

// Routes
app.use("/", indexRouter);
app.use("/api/auth", authRoutes);
app.use("/api/investor-profile", investorProfileRoutes);
app.use("/api/accounts", requireAuth, accountRoutes);
app.use("/api/budgets", requireAuth, budgetRoutes);
app.use("/api/investments", requireAuth, investmentRoutes);
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/permissions", requireAuth, permissionRoutes);
app.use("/api/assistant", requireAuth, assistantRoutes);
app.use("/api/wealth", requireAuth, wealthRoutes);
app.use("/api/tax", requireAuth, taxRoutes);
app.use("/api/notifications", requireAuth, notificationRoutes);
app.use("/api/ingest", requireAuth, upload.any(), ingestRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/feedback", requireAuth, feedbackRoutes);
app.use("/api/admin", requireAuth, adminRoutes);

// Handle 404 routes
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use(errorHandler);

export default app;
