import express from "express";
import { handleAsync } from "../middleware/errorHandler.js";
import { ensureAuth } from "../middleware/clerkAuth.js";
import { DashboardAnalytics } from "../services/dashboardAnalytics.js";

const router = express.Router();
const dashboardService = new DashboardAnalytics();

// Apply authentication middleware to all dashboard routes
router.use(ensureAuth);

// Get complete dashboard data
router.get(
  "/",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    const data = await dashboardService.getCompleteDashboard(
      categories,
      clerkId
    );

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get monthly spending data
router.get(
  "/monthly-spending",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    const data = await dashboardService.getMonthlySpending(categories, clerkId);

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get asset vs liability breakdown
router.get(
  "/asset-liability",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    const data = await dashboardService.getAssetLiabilityBreakdown(
      categories,
      clerkId
    );

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get EPF contributions timeline
router.get(
  "/epf-contributions",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    const data = await dashboardService.getEPFContributions(
      categories,
      clerkId
    );

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get credit score history
router.get(
  "/credit-score",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    const data = await dashboardService.getCreditScoreHistory(
      categories,
      clerkId
    );

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get net worth timeline
router.get(
  "/net-worth",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    const data = await dashboardService.getNetWorthTimeline(
      categories,
      clerkId
    );

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get spending by categories
router.get(
  "/spending-categories",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];

    const data = await dashboardService.getSpendingByCategory(
      categories,
      clerkId
    );

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Refresh dashboard with new permissions
router.post(
  "/refresh",
  handleAsync(async (req, res) => {
    const { allowedCategories } = req.body;
    const clerkId = req.auth.userId;

    if (!Array.isArray(allowedCategories)) {
      return res.status(400).json({
        status: "error",
        message: "allowedCategories must be an array",
      });
    }

    const data = await dashboardService.getCompleteDashboard(
      allowedCategories,
      clerkId
    );

    res.json({
      status: "success",
      message: "Dashboard data refreshed with new permissions",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
