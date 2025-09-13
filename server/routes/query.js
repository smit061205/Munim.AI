import express from "express";
import { DataService } from "../services/dataService.js";
import geminiService from "../services/geminiService.js";

const router = express.Router();

// POST /api/query
router.post("/", async (req, res) => {
  const { question, allowedCategories } = req.body;
  const userId = req.auth.userId;

  // Validate request body
  if (!question || typeof question !== "string") {
    return res.status(400).json({
      error: "Question is required and must be a string",
    });
  }

  if (!allowedCategories || !Array.isArray(allowedCategories)) {
    return res.status(400).json({
      error: "Allowed categories must be an array",
    });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Load data based on allowed categories
    const filteredData = await DataService.loadAllowedData(
      userId,
      allowedCategories
    );

    // Check if we have any data to work with
    if (!filteredData || Object.keys(filteredData).length === 0) {
      return res.json({
        status: "success",
        question,
        allowedCategories,
        response:
          "I don't have access to any financial data based on your current permissions. Please enable the relevant data categories to get personalized insights.",
        data_available: false,
      });
    }

    // Generate AI response using Gemini
    const aiResult = await geminiService.generateResponse(
      question,
      filteredData,
      userId
    );

    if (aiResult.success) {
      res.json({
        status: "success",
        question,
        allowedCategories,
        response: aiResult.response,
        data_available: true,
        categories_used: Object.keys(filteredData),
      });
    } else {
      res.status(500).json({
        status: "error",
        question,
        allowedCategories,
        error: "Failed to generate AI response",
        response: aiResult.response,
        details: aiResult.error,
      });
    }
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({
      status: "error",
      error: "Error processing query",
      details: error.message,
    });
  }
});

export default router;
