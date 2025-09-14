import mongoose from "mongoose";
import dotenv from "dotenv";
import { Budget } from "../models/Financial.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Sample budget data
const createSampleBudgets = async () => {
  try {
    // Sample user clerkId - replace with actual user ID
    const clerkId = "user_32eIuzzFAAlZ1JzWbY3Cp7ZBSzr"; // From your earlier data

    // Check if budget already exists
    const existingBudget = await Budget.findOne({ clerkId });
    if (existingBudget) {
      console.log(
        "⚠️ Budget already exists for this user, deleting old data..."
      );
      await Budget.deleteOne({ clerkId });
    }

    // Create sample budget data
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const sampleBudgets = {
      user_id: clerkId,
      clerkId: clerkId,
      budgets: [
        {
          id: "budget_rent_001",
          category: "Rent",
          budgetAmount: 30000,
          spentAmount: 30000,
          period: "monthly",
          startDate: startOfMonth,
          endDate: endOfMonth,
          status: "on-track",
          isActive: true,
        },
        {
          id: "budget_groceries_001",
          category: "Groceries",
          budgetAmount: 15000,
          spentAmount: 8500,
          period: "monthly",
          startDate: startOfMonth,
          endDate: endOfMonth,
          status: "under-budget",
          isActive: true,
        },
        {
          id: "budget_utilities_001",
          category: "Utilities",
          budgetAmount: 5000,
          spentAmount: 4200,
          period: "monthly",
          startDate: startOfMonth,
          endDate: endOfMonth,
          status: "on-track",
          isActive: true,
        },
        {
          id: "budget_entertainment_001",
          category: "Entertainment",
          budgetAmount: 8000,
          spentAmount: 12500,
          period: "monthly",
          startDate: startOfMonth,
          endDate: endOfMonth,
          status: "over-budget",
          isActive: true,
        },
        {
          id: "budget_transport_001",
          category: "Transport",
          budgetAmount: 6000,
          spentAmount: 3800,
          period: "monthly",
          startDate: startOfMonth,
          endDate: endOfMonth,
          status: "under-budget",
          isActive: true,
        },
        {
          id: "budget_dining_001",
          category: "Dining",
          budgetAmount: 10000,
          spentAmount: 7200,
          period: "monthly",
          startDate: startOfMonth,
          endDate: endOfMonth,
          status: "on-track",
          isActive: true,
        },
      ],
      totalBudget: 74000,
      totalSpent: 66200,
    };

    // Create budget document
    const budgetDoc = await Budget.create(sampleBudgets);

    console.log("✅ Sample budget data created successfully!");
    console.log("📊 Budget Summary:");
    console.log(`   User: ${clerkId}`);
    console.log(
      `   Total Budget: ₹${sampleBudgets.totalBudget.toLocaleString()}`
    );
    console.log(
      `   Total Spent: ₹${sampleBudgets.totalSpent.toLocaleString()}`
    );
    console.log(
      `   Remaining: ₹${(
        sampleBudgets.totalBudget - sampleBudgets.totalSpent
      ).toLocaleString()}`
    );
    console.log(`   Categories: ${sampleBudgets.budgets.length}`);

    console.log("\n📋 Budget Categories:");
    sampleBudgets.budgets.forEach((budget) => {
      const percentage = (
        (budget.spentAmount / budget.budgetAmount) *
        100
      ).toFixed(1);
      console.log(
        `   ${
          budget.category
        }: ₹${budget.spentAmount.toLocaleString()} / ₹${budget.budgetAmount.toLocaleString()} (${percentage}%) - ${
          budget.status
        }`
      );
    });

    return budgetDoc;
  } catch (error) {
    console.error("❌ Error creating sample budget data:", error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await createSampleBudgets();
    console.log("\n🎉 Sample budget data creation completed!");
  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run the script
main();
