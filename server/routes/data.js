import express from "express";
import { handleAsync } from "../middleware/errorHandler.js";
import { ensureAuth } from "../middleware/clerkAuth.js";
import { DataService } from "../services/dataService.js";

const router = express.Router();

// Apply authentication middleware to all data routes
router.use(ensureAuth);

// Generic handler for data requests (now with permission checking)
const handleDataRequest = (category) => {
  return handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;

    const data = await DataService.loadData(category, clerkId);

    if (data === null) {
      return res.status(403).json({
        status: "error",
        message: `Access denied for ${category} data`,
        category,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: "success",
      data,
      category,
      count: Array.isArray(data) ? data.length : 1,
      timestamp: new Date().toISOString(),
    });
  });
};

// Route definitions for each data category
router.get("/assets", handleDataRequest("assets"));
router.get("/liabilities", handleDataRequest("liabilities"));
router.get("/transactions", handleDataRequest("transactions"));
router.get("/epf", handleDataRequest("epf"));
router.get("/credit-score", handleDataRequest("creditScore"));
router.get("/investments", handleDataRequest("investments"));

// Bulk data endpoint (now with permission checking)
router.get(
  "/bulk",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : ["assets", "liabilities", "transactions"];

    const result = await DataService.loadAllUserData(clerkId);

    res.json({
      status: "success",
      data: result.data,
      permissions: result.permissions,
      categories,
      timestamp: new Date().toISOString(),
    });
  })
);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Data service is healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
