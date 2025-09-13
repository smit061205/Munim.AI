import express from "express";
import dataRoutes from "./data.js";
import permissionsRoutes from "./permissions.js";
import queryRoutes from "./query.js";
import dashboardRoutes from "./dashboard.js";
import analyticsRoutes from "./analytics.js";
import { healthCheck } from "../middleware/errorHandler.js";

const router = express.Router();

// Health check route with enhanced middleware
router.get("/health", healthCheck);

// System status endpoint
router.get("/status", (req, res) => {
  res.json({
    status: "operational",
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      database: "connected",
      authentication: "active",
    },
    endpoints: {
      "/api/data": "available",
      "/api/permissions": "available",
      "/api/query": "available",
      "/api/dashboard": "available",
      "/api/analytics": "available",
    },
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Mount routes
router.use("/data", dataRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/query", queryRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
