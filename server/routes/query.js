import express from "express";
import { DataService } from "../services/dataService.js";
import geminiService from "../services/geminiService.js";

const router = express.Router();

// POST /api/query
router.post("/", async (req, res) => {
  const { question, allowedCategories } = req.body;
  const uploadedFiles = req.files || [];
  const userId = req.auth.userId;

  console.log(`🤖 AI Query received:`, {
    userId,
    question:
      question?.substring(0, 100) + (question?.length > 100 ? "..." : ""),
    allowedCategories: JSON.parse(allowedCategories || "[]"),
    filesCount: uploadedFiles.length,
    timestamp: new Date().toISOString(),
  });

  // Parse allowedCategories if it's a string
  let parsedCategories;
  try {
    parsedCategories =
      typeof allowedCategories === "string"
        ? JSON.parse(allowedCategories)
        : allowedCategories;
  } catch (error) {
    console.error(`❌ Error parsing allowedCategories:`, error);
    return res.status(400).json({
      error: "Invalid allowedCategories format",
    });
  }

  // Validate request body
  if (!question || typeof question !== "string") {
    console.error(`❌ Invalid question:`, { question, type: typeof question });
    return res.status(400).json({
      error: "Question is required and must be a string",
    });
  }

  if (!parsedCategories || !Array.isArray(parsedCategories)) {
    console.error(`❌ Invalid allowedCategories:`, {
      allowedCategories: parsedCategories,
      type: typeof parsedCategories,
    });
    return res.status(400).json({
      error: "Allowed categories must be an array",
    });
  }

  if (!userId) {
    console.error(`❌ No userId found in req.auth:`, req.auth);
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log(`📊 Loading user data for categories:`, parsedCategories);

    // Check user access first
    if (!geminiService.checkUserAccess(userId)) {
      console.error(`❌ User ${userId} denied access to AI assistant`);
      return res.status(403).json({
        error: "Access denied",
        response:
          "You do not have permission to use the AI assistant. Please contact support for access.",
      });
    }

    // Load user data based on allowed categories
    const filteredData = await DataService.loadAllowedData(
      userId,
      parsedCategories
    );

    console.log(`📋 Data loading complete:`, {
      hasData: filteredData && Object.keys(filteredData).length > 0,
      categoriesFound: Object.keys(filteredData || {}),
      totalCategories: Object.keys(filteredData || {}).length,
    });

    // Check if we have any data to work with
    if (!filteredData || Object.keys(filteredData).length === 0) {
      console.log(`⚠️ No data available for AI processing`);
      return res.json({
        status: "success",
        question,
        allowedCategories: parsedCategories,
        response:
          "I don't have access to any financial data based on your current permissions. Please enable the relevant data categories to get personalized insights.",
        data_available: false,
      });
    }

    console.log(
      `🧠 Calling Gemini AI service with data from categories: [${Object.keys(
        filteredData
      ).join(", ")}]`
    );

    // Generate AI response using Gemini
    console.log(`🤖 Calling Gemini API...`);
    const aiResponse = await geminiService.generateResponse(
      question,
      filteredData,
      userId,
      uploadedFiles
    );

    console.log(`🤖 Gemini AI response:`, {
      success: aiResponse.success,
      hasResponse: !!aiResponse.response,
      responseLength: aiResponse.response?.length || 0,
      error: aiResponse.error || "none",
    });

    if (aiResponse.success) {
      console.log(`✅ AI query successful`);
      res.json({
        status: "success",
        question,
        allowedCategories: parsedCategories,
        response: aiResponse.response,
        data_available: true,
        categories_used: Object.keys(filteredData),
      });
    } else {
      console.error(`❌ AI generation failed:`, aiResponse.error);
      res.status(500).json({
        status: "error",
        question,
        allowedCategories: parsedCategories,
        error: "Failed to generate AI response",
        response: aiResponse.response,
        details: aiResponse.error,
      });
    }
  } catch (error) {
    console.error("❌ Error processing query:", {
      error: error.message,
      stack: error.stack,
      userId,
      question: question?.substring(0, 100),
      allowedCategories: parsedCategories,
    });
    res.status(500).json({
      status: "error",
      error: "Error processing query",
      details: error.message,
    });
  }
});

export default router;
