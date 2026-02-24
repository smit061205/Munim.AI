import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer"; // Import multer

// Import routes
import indexRouter from "./routes/index.js";
import webhookRouter from "./routes/webhook.js";
import financialRoutes from "./routes/financial.js";
import budgetRoutes from "./routes/budget.js";
import accountRoutes from "./routes/account.js";
import transactionRoutes from "./routes/transaction.js";
import investmentRoutes from "./routes/investment.js";
import queryRoutes from "./routes/query.js";
import dashboardRoutes from "./routes/dashboard.js";
import analyticsRoutes from "./routes/analytics.js";
import permissionRoutes from "./routes/permissions.js";
import dataRoutes from "./routes/data.js";
import ingestRoutes from "./routes/ingest.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { withAuth, attachUser, requireAuth } from "./middleware/clerkAuth.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
app.use((req, res, next) => {
  if (req.path === "/api/webhooks/clerk") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Apply Clerk auth middleware to all routes
app.use(withAuth);
app.use(attachUser);

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
app.use("/api/accounts", requireAuth, accountRoutes);
app.use("/api/budgets", requireAuth, budgetRoutes);
app.use("/api/investments", requireAuth, investmentRoutes);
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/permissions", requireAuth, permissionRoutes);
app.use("/api/query", requireAuth, upload.any(), queryRoutes);
app.use("/api/data", requireAuth, dataRoutes);
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
});
