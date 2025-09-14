import { Budget } from "../models/Financial.js";
import { ApiError } from "../middleware/errorHandler.js";

// @desc    Get all budgets for a user
// @route   GET /api/v1/budgets
// @access  Private
export const getBudgets = async (req, res, next) => {
  try {
    console.log("getBudgets: Starting request for user:", req.auth.userId);
    const clerkId = req.auth.userId;

    const budgetDoc = await Budget.findOne({ clerkId });
    console.log("getBudgets: Found budget document:", budgetDoc ? "Yes" : "No");

    if (!budgetDoc) {
      console.log(
        "getBudgets: No budget document found, returning empty array"
      );
      return res.status(200).json({
        success: true,
        data: [],
        message: "No budgets found for user",
      });
    }

    console.log(
      "getBudgets: Returning budget data:",
      budgetDoc.budgets?.length || 0,
      "budgets"
    );
    res.status(200).json({
      success: true,
      data: budgetDoc.budgets,
      totalBudget: budgetDoc.totalBudget,
      totalSpent: budgetDoc.totalSpent,
    });
  } catch (error) {
    console.error("getBudgets: Error occurred:", error);
    next(error);
  }
};

// @desc    Create a new budget
// @route   POST /api/v1/budgets
// @access  Private
export const createBudget = async (req, res, next) => {
  try {
    const clerkId = req.auth.userId;
    const { category, budgetAmount, period, startDate, endDate } = req.body;

    if (!category || !budgetAmount || !startDate || !endDate) {
      throw new ApiError(
        400,
        "Please provide category, budgetAmount, startDate, and endDate"
      );
    }

    let budgetDoc = await Budget.findOne({ clerkId });

    const newBudget = {
      id: `budget_${Date.now()}`,
      category,
      budgetAmount: Number(budgetAmount),
      spentAmount: 0,
      period: period || "monthly",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "on-track",
      isActive: true,
    };

    if (!budgetDoc) {
      // Create new budget document
      budgetDoc = await Budget.create({
        user_id: clerkId,
        clerkId,
        budgets: [newBudget],
        totalBudget: Number(budgetAmount),
        totalSpent: 0,
      });
    } else {
      // Add to existing budget document
      budgetDoc.budgets.push(newBudget);
      budgetDoc.totalBudget += Number(budgetAmount);
      await budgetDoc.save();
    }

    res.status(201).json({
      success: true,
      data: newBudget,
      message: "Budget created successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a budget
// @route   PUT /api/v1/budgets/:budgetId
// @access  Private
export const updateBudget = async (req, res, next) => {
  try {
    const clerkId = req.auth.userId;
    const { budgetId } = req.params;
    const { category, budgetAmount, period, startDate, endDate, isActive } =
      req.body;

    const budgetDoc = await Budget.findOne({ clerkId });

    if (!budgetDoc) {
      throw new ApiError(404, "Budget document not found");
    }

    const budgetIndex = budgetDoc.budgets.findIndex((b) => b.id === budgetId);

    if (budgetIndex === -1) {
      throw new ApiError(404, "Budget not found");
    }

    const oldBudgetAmount = budgetDoc.budgets[budgetIndex].budgetAmount;

    // Update budget fields
    if (category) budgetDoc.budgets[budgetIndex].category = category;
    if (budgetAmount) {
      budgetDoc.budgets[budgetIndex].budgetAmount = Number(budgetAmount);
      // Update total budget
      budgetDoc.totalBudget =
        budgetDoc.totalBudget - oldBudgetAmount + Number(budgetAmount);
    }
    if (period) budgetDoc.budgets[budgetIndex].period = period;
    if (startDate)
      budgetDoc.budgets[budgetIndex].startDate = new Date(startDate);
    if (endDate) budgetDoc.budgets[budgetIndex].endDate = new Date(endDate);
    if (typeof isActive === "boolean")
      budgetDoc.budgets[budgetIndex].isActive = isActive;

    await budgetDoc.save();

    res.status(200).json({
      success: true,
      data: budgetDoc.budgets[budgetIndex],
      message: "Budget updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a budget
// @route   DELETE /api/v1/budgets/:budgetId
// @access  Private
export const deleteBudget = async (req, res, next) => {
  try {
    const clerkId = req.auth.userId;
    const { budgetId } = req.params;

    const budgetDoc = await Budget.findOne({ clerkId });

    if (!budgetDoc) {
      throw new ApiError(404, "Budget document not found");
    }

    const budgetIndex = budgetDoc.budgets.findIndex((b) => b.id === budgetId);

    if (budgetIndex === -1) {
      throw new ApiError(404, "Budget not found");
    }

    const deletedBudget = budgetDoc.budgets[budgetIndex];

    // Update total budget
    budgetDoc.totalBudget -= deletedBudget.budgetAmount;
    budgetDoc.totalSpent -= deletedBudget.spentAmount;

    // Remove budget from array
    budgetDoc.budgets.splice(budgetIndex, 1);

    await budgetDoc.save();

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update budget spending (called when transactions are added)
// @route   PUT /api/v1/budgets/update-spending
// @access  Private
export const updateBudgetSpending = async (req, res, next) => {
  try {
    const clerkId = req.auth.userId;
    const { category, amount, date } = req.body;

    if (!category || !amount || !date) {
      throw new ApiError(400, "Please provide category, amount, and date");
    }

    const budgetDoc = await Budget.findOne({ clerkId });

    if (!budgetDoc) {
      return res.status(200).json({
        success: true,
        message: "No budget document found, spending not tracked",
      });
    }

    const transactionDate = new Date(date);

    // Find active budgets for this category that include this date
    const relevantBudgets = budgetDoc.budgets.filter(
      (budget) =>
        budget.category.toLowerCase() === category.toLowerCase() &&
        budget.isActive &&
        transactionDate >= budget.startDate &&
        transactionDate <= budget.endDate
    );

    if (relevantBudgets.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No active budget found for this category and date",
      });
    }

    // Update spending for relevant budgets
    relevantBudgets.forEach((budget) => {
      budget.spentAmount += Math.abs(Number(amount));

      // Update status based on spending
      const percentage = (budget.spentAmount / budget.budgetAmount) * 100;
      if (percentage > 100) {
        budget.status = "over-budget";
      } else if (percentage < 70) {
        budget.status = "under-budget";
      } else {
        budget.status = "on-track";
      }
    });

    // Recalculate total spent
    budgetDoc.totalSpent = budgetDoc.budgets.reduce(
      (sum, budget) => sum + budget.spentAmount,
      0
    );

    await budgetDoc.save();

    res.status(200).json({
      success: true,
      message: "Budget spending updated successfully",
      updatedBudgets: relevantBudgets.length,
    });
  } catch (error) {
    next(error);
  }
};
