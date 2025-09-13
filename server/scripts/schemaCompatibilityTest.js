import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  Asset,
  Liability,
  Transaction,
  EPF,
  CreditScore,
  Investment,
} from "../models/Financial.js";

dotenv.config();

// Test data structures that match the generation script
const testSchemaCompatibility = async () => {
  try {
    console.log("🔌 Connecting to MongoDB for schema testing...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n🧪 Testing Schema Compatibility...\n");

    // Test Asset Schema
    console.log("📊 Testing Asset Schema...");
    const testAssetData = {
      user_id: "test_u1",
      clerkId: "test_clerk_123",
      total_value: 500000,
      bank_accounts: [
        {
          id: "a_test_1",
          type: "savings",
          bank_name: "HDFC Bank",
          balance: 250000,
          account_number: "****1234",
        },
      ],
      real_estate: [
        {
          id: "a_test_property",
          type: "residential",
          current_value: 5000000,
          address: "Mumbai, India",
          purchase_date: new Date(),
        },
      ],
      vehicles: [
        {
          id: "a_test_vehicle",
          type: "car",
          current_value: 800000,
          make: "Honda",
          model: "City",
          year: 2022,
        },
      ],
    };

    try {
      const testAsset = new Asset(testAssetData);
      await testAsset.validate();
      console.log("✅ Asset Schema: COMPATIBLE");
    } catch (error) {
      console.log("❌ Asset Schema: INCOMPATIBLE");
      console.log("Error:", error.message);
      return false;
    }

    // Test Liability Schema
    console.log("💳 Testing Liability Schema...");
    const testLiabilityData = {
      user_id: "test_u1",
      clerkId: "test_clerk_123",
      liabilities: [
        {
          id: "l_test_1",
          type: "home_loan",
          remaining_balance: 2000000,
          monthly_payment: 25000,
          interest_rate: 8.5,
          loan_term_months: 240,
        },
      ],
    };

    try {
      const testLiability = new Liability(testLiabilityData);
      await testLiability.validate();
      console.log("✅ Liability Schema: COMPATIBLE");
    } catch (error) {
      console.log("❌ Liability Schema: INCOMPATIBLE");
      console.log("Error:", error.message);
      return false;
    }

    // Test Transaction Schema
    console.log("💰 Testing Transaction Schema...");
    const testTransactionData = {
      user_id: "test_u1",
      clerkId: "test_clerk_123",
      transactions: [
        {
          id: "t_test_1",
          date: new Date().toISOString(),
          amount: 80000,
          type: "income",
          category: "salary",
          description: "Monthly Salary",
          account: "****1234",
        },
      ],
    };

    try {
      const testTransaction = new Transaction(testTransactionData);
      await testTransaction.validate();
      console.log("✅ Transaction Schema: COMPATIBLE");
    } catch (error) {
      console.log("❌ Transaction Schema: INCOMPATIBLE");
      console.log("Error:", error.message);
      return false;
    }

    // Test EPF Schema
    console.log("🏦 Testing EPF Schema...");
    const testEPFData = {
      user_id: "test_u1",
      clerkId: "test_clerk_123",
      uan: "123456789012",
      member_id: "MH/123456/7890123",
      employer_contribution: 500000,
      employee_contribution: 500000,
      total_balance: 1000000,
      kyc_status: "verified",
    };

    try {
      const testEPF = new EPF(testEPFData);
      await testEPF.validate();
      console.log("✅ EPF Schema: COMPATIBLE");
    } catch (error) {
      console.log("❌ EPF Schema: INCOMPATIBLE");
      console.log("Error:", error.message);
      return false;
    }

    // Test Credit Score Schema
    console.log("📈 Testing Credit Score Schema...");
    const testCreditScoreData = {
      user_id: "test_u1",
      clerkId: "test_clerk_123",
      credit_score: 750,
      payment_history: "good",
      credit_utilization: 30,
      score_date: new Date(),
    };

    try {
      const testCreditScore = new CreditScore(testCreditScoreData);
      await testCreditScore.validate();
      console.log("✅ Credit Score Schema: COMPATIBLE");
    } catch (error) {
      console.log("❌ Credit Score Schema: INCOMPATIBLE");
      console.log("Error:", error.message);
      return false;
    }

    // Test Investment Schema
    console.log("📊 Testing Investment Schema...");
    const testInvestmentData = {
      user_id: "test_u1",
      clerkId: "test_clerk_123",
      portfolio: {
        total_value: 500000,
        stocks: [
          {
            symbol: "TCS",
            company_name: "Tata Consultancy Services",
            quantity: 50,
            current_value: 200000,
            purchase_price: 3500,
            sector: "IT",
          },
        ],
        mutual_funds: [
          {
            scheme_name: "HDFC Equity Fund",
            scheme_code: "HDFC001",
            units: 1000,
            current_value: 50000,
            nav: 50,
            category: "Equity",
          },
        ],
      },
    };

    try {
      const testInvestment = new Investment(testInvestmentData);
      await testInvestment.validate();
      console.log("✅ Investment Schema: COMPATIBLE");
    } catch (error) {
      console.log("❌ Investment Schema: INCOMPATIBLE");
      console.log("Error:", error.message);
      return false;
    }

    console.log("\n🎉 ALL SCHEMAS ARE COMPATIBLE!");
    console.log("✅ Safe to proceed with data generation");

    return true;
  } catch (error) {
    console.error("❌ Schema compatibility test failed:", error);
    return false;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

// Run the test
testSchemaCompatibility();
