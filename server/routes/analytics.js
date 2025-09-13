import express from "express";
import { AdvancedAnalytics } from "../services/advancedAnalytics.js";
import { handleAsync } from "../middleware/errorHandler.js";

const router = express.Router();
const analyticsService = new AdvancedAnalytics();

// Get expense trends with forecasting
router.get(
  "/expense-trends",
  handleAsync(async (req, res) => {
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];
    const data = await analyticsService.getExpenseTrends(categories);

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get savings forecast
router.get(
  "/savings-forecast",
  handleAsync(async (req, res) => {
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];
    const data = await analyticsService.getSavingsForecast(categories);

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get investment composition analysis
router.get(
  "/investment-composition",
  handleAsync(async (req, res) => {
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];
    const data = await analyticsService.getInvestmentComposition(categories);

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get financial health scoring
router.get(
  "/financial-health",
  handleAsync(async (req, res) => {
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];
    const data = await analyticsService.getFinancialHealthScore(categories);

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get cash flow analysis
router.get(
  "/cash-flow",
  handleAsync(async (req, res) => {
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];
    const data = await analyticsService.getCashFlowAnalysis(categories);

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Get comprehensive analytics summary
router.get(
  "/summary",
  handleAsync(async (req, res) => {
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];
    const data = await analyticsService.getAnalyticsSummary(categories);

    res.json({
      status: "success",
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

// Dynamic category filtering for analytics
router.post(
  "/category-filter",
  handleAsync(async (req, res) => {
    const { allowedCategories, analysisType } = req.body;

    if (!Array.isArray(allowedCategories)) {
      return res.status(400).json({
        status: "error",
        message: "allowedCategories must be an array",
      });
    }

    if (!analysisType) {
      return res.status(400).json({
        status: "error",
        message: "analysisType is required",
      });
    }

    let data;
    switch (analysisType) {
      case "expense-trends":
        data = await analyticsService.getExpenseTrends(allowedCategories);
        break;
      case "savings-forecast":
        data = await analyticsService.getSavingsForecast(allowedCategories);
        break;
      case "investment-composition":
        data = await analyticsService.getInvestmentComposition(
          allowedCategories
        );
        break;
      case "financial-health":
        data = await analyticsService.getFinancialHealthScore(
          allowedCategories
        );
        break;
      case "cash-flow":
        data = await analyticsService.getCashFlowAnalysis(allowedCategories);
        break;
      default:
        return res.status(400).json({
          status: "error",
          message: "Invalid analysisType",
        });
    }

    res.json({
      status: "success",
      message: `${analysisType} data filtered for categories: ${allowedCategories.join(
        ", "
      )}`,
      data,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
