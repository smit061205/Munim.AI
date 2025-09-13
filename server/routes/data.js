import express from "express";
import { handleAsync } from "../middleware/errorHandler.js";
import { ensureAuth } from "../middleware/clerkAuth.js";
import { DataService } from "../services/dataService.js";

const router = express.Router();

// Apply authentication middleware to all data routes
router.use(ensureAuth);

// Generic route handler for all data categories
const handleDataRequest = (category) => {
  return handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const data = await DataService.getUserData(category, clerkId);

    res.json({
      status: "success",
      data,
      category,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  });
};

// Data category routes
router.get("/assets", handleDataRequest("assets"));
router.get("/liabilities", handleDataRequest("liabilities"));
router.get("/transactions", handleDataRequest("transactions"));
router.get("/epf", handleDataRequest("epf"));
router.get("/credit-score", handleDataRequest("creditScore"));
router.get("/investments", handleDataRequest("investments"));

// Bulk data endpoint
router.get(
  "/bulk",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    if (categories.length === 0) {
      return res.status(400).json({
        error: "No categories specified",
        message:
          "Please provide categories as a comma-separated query parameter",
      });
    }

    const results = {};
    for (const category of categories) {
      try {
        results[category] = await DataService.getUserData(category, clerkId);
      } catch (error) {
        results[category] = { error: error.message };
      }
    }

    res.json({
      status: "success",
      data: results,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
