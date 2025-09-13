import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

// Import routes
import indexRouter from "./routes/index.js";
import webhookRouter from "./routes/webhook.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { withAuth, attachUser } from "./middleware/clerkAuth.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:5173", // Vite dev server
    "http://localhost:3000", // Alternative React dev server
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ],
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

// Routes
app.use("/api", indexRouter);
app.use("/api/webhooks", webhookRouter);

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
