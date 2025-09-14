import { Investment } from "../models/Financial.js";
import { v4 as uuidv4 } from "uuid";

// Get all investments for a user
export const getInvestments = async (req, res) => {
  try {
    const clerkId = req.auth.userId;

    let investmentDoc = await Investment.findOne({ clerkId });

    if (!investmentDoc) {
      return res.json({
        success: true,
        data: { stocks: [], mutual_funds: [] },
      });
    }

    res.json({
      success: true,
      data: {
        stocks: investmentDoc.portfolio?.stocks || [],
        mutual_funds: investmentDoc.portfolio?.mutual_funds || [],
      },
    });
  } catch (error) {
    console.error("Error fetching investments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch investments",
    });
  }
};

// Create a new investment (stock or mutual fund)
export const createInvestment = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { type, ...investmentData } = req.body;

    // Validate investment type
    if (!type || !["stock", "mutual_fund"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Investment type must be 'stock' or 'mutual_fund'",
      });
    }

    let newInvestment;

    if (type === "stock") {
      const {
        symbol,
        company_name,
        quantity,
        current_value,
        purchase_price,
        sector,
      } = investmentData;

      if (!symbol || !company_name || !quantity || !current_value) {
        return res.status(400).json({
          success: false,
          message:
            "Symbol, company name, quantity, and current value are required for stocks",
        });
      }

      newInvestment = {
        symbol,
        company_name,
        quantity: parseFloat(quantity),
        current_value: parseFloat(current_value),
        purchase_price: parseFloat(purchase_price) || 0,
        sector: sector || "",
        created_at: new Date(),
      };
    } else {
      const { scheme_name, scheme_code, units, current_value, nav, category } =
        investmentData;

      if (!scheme_name || !units || !current_value) {
        return res.status(400).json({
          success: false,
          message:
            "Scheme name, units, and current value are required for mutual funds",
        });
      }

      newInvestment = {
        scheme_name,
        scheme_code: scheme_code || "",
        units: parseFloat(units),
        current_value: parseFloat(current_value),
        nav: parseFloat(nav) || 0,
        category: category || "",
        created_at: new Date(),
      };
    }

    // Find or create investment document
    let investmentDoc = await Investment.findOne({ clerkId });

    if (!investmentDoc) {
      investmentDoc = new Investment({
        user_id: clerkId,
        clerkId,
        portfolio: {
          total_value: newInvestment.current_value,
          stocks: type === "stock" ? [newInvestment] : [],
          mutual_funds: type === "mutual_fund" ? [newInvestment] : [],
        },
      });
    } else {
      if (!investmentDoc.portfolio) {
        investmentDoc.portfolio = {
          total_value: 0,
          stocks: [],
          mutual_funds: [],
        };
      }

      if (type === "stock") {
        investmentDoc.portfolio.stocks.push(newInvestment);
      } else {
        investmentDoc.portfolio.mutual_funds.push(newInvestment);
      }

      // Recalculate total value
      investmentDoc.portfolio.total_value = [
        ...investmentDoc.portfolio.stocks,
        ...investmentDoc.portfolio.mutual_funds,
      ].reduce((sum, item) => sum + (item.current_value || 0), 0);
    }

    await investmentDoc.save();

    res.status(201).json({
      success: true,
      message: "Investment created successfully",
      data: newInvestment,
    });
  } catch (error) {
    console.error("Error creating investment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create investment",
    });
  }
};

// Update an investment
export const updateInvestment = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { investmentId, type } = req.params;
    const updateData = req.body;

    const investmentDoc = await Investment.findOne({ clerkId });

    if (!investmentDoc || !investmentDoc.portfolio) {
      return res.status(404).json({
        success: false,
        message: "No investments found for user",
      });
    }

    let investmentArray =
      type === "stock"
        ? investmentDoc.portfolio.stocks
        : investmentDoc.portfolio.mutual_funds;
    const investmentIndex = investmentArray.findIndex(
      (investment) => investment._id.toString() === investmentId
    );

    if (investmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    // Update investment fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        investmentArray[investmentIndex][key] = updateData[key];
      }
    });

    // Recalculate total value
    investmentDoc.portfolio.total_value = [
      ...investmentDoc.portfolio.stocks,
      ...investmentDoc.portfolio.mutual_funds,
    ].reduce((sum, item) => sum + (item.current_value || 0), 0);

    await investmentDoc.save();

    res.json({
      success: true,
      message: "Investment updated successfully",
      data: investmentArray[investmentIndex],
    });
  } catch (error) {
    console.error("Error updating investment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update investment",
    });
  }
};

// Delete an investment
export const deleteInvestment = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { investmentId, type } = req.params;

    const investmentDoc = await Investment.findOne({ clerkId });

    if (!investmentDoc || !investmentDoc.portfolio) {
      return res.status(404).json({
        success: false,
        message: "No investments found for user",
      });
    }

    let investmentArray =
      type === "stock"
        ? investmentDoc.portfolio.stocks
        : investmentDoc.portfolio.mutual_funds;
    const investmentIndex = investmentArray.findIndex(
      (investment) => investment._id.toString() === investmentId
    );

    if (investmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    // Remove the investment
    investmentArray.splice(investmentIndex, 1);

    // Recalculate total value
    investmentDoc.portfolio.total_value = [
      ...investmentDoc.portfolio.stocks,
      ...investmentDoc.portfolio.mutual_funds,
    ].reduce((sum, item) => sum + (item.current_value || 0), 0);

    await investmentDoc.save();

    res.json({
      success: true,
      message: "Investment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting investment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete investment",
    });
  }
};
