import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
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
import { startKeepAlive } from "./services/keepAlive.js";
import { startScheduler } from "./services/notificationService.js";

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

// Render sits one proxy in front of the app; needed for per-client rate limits
if (process.env.NODE_ENV === "production") {
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

// Middleware
app.use(cors(corsOptions));

// Parse JSON payloads
app.use(express.json());

// Attach the signed-in user (if any) to all routes
app.use(withAuth);

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Create multer instance
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Daily reminders, price refreshes and the Monday digest
  startScheduler();

  // Prevent Render's 15-minute sleep timer
  if (process.env.NODE_ENV === "production" || process.env.PING_URL) {
    startKeepAlive();
  }
});
