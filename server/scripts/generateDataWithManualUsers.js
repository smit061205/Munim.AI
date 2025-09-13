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

// Load environment variables
dotenv.config();

// Manual Clerk IDs - you can get these from your Clerk dashboard
// Just create a few users manually in Clerk dashboard and paste their IDs here
const manualClerkUsers = [
  {
    clerkId: "user_2Oa3_Lr1950AFR", // Vikram Singh from dashboard
    user_id: "u1",
    name: "Vikram Singh",
    city: "Chennai",
    profession: "Business Analyst",
    email: "vikram.singh@testmunim.com",
  },
  {
    clerkId: "user_32eJ4iDPo6uNtk2zVPhS6O4ax5X", // Replace with Sneha's actual Clerk ID
    user_id: "u2",
    name: "Sneha Gupta",
    city: "Pune",
    profession: "UX Designer",
    email: "sneha.gupta@testmunim.com",
  },
  {
    clerkId: "user_32eJ1pICmH7nNCsIuUKgZrdq7yr", // Replace with Amit's actual Clerk ID
    user_id: "u3",
    name: "Amit Patel",
    city: "Bangalore",
    profession: "Data Scientist",
    email: "amit.patel@testmunim.com",
  },
  {
    clerkId: "user_32eIySMwD6G2hRWv6i0T6CSMd9R", // Replace with Priya's actual Clerk ID
    user_id: "u4",
    name: "Priya Sharma",
    city: "Delhi",
    profession: "Product Manager",
    email: "priya.sharma@testmunim.com",
  },
  {
    clerkId: "user_32eIuzzFAAlZ1JzWbY3Cp7ZBSzr", // Replace with Rajesh's actual Clerk ID
    user_id: "u5",
    name: "Rajesh Kumar",
    city: "Mumbai",
    profession: "Software Engineer",
    email: "rajesh.kumar@testmunim.com",
  },
];

// Profession-based salary ranges (monthly)
const salaryRanges = {
  "Software Engineer": [80000, 150000],
  "Product Manager": [120000, 200000],
  "Data Scientist": [90000, 160000],
  "Marketing Manager": [70000, 120000],
  "Business Analyst": [60000, 100000],
  "UX Designer": [70000, 130000],
  "Sales Director": [100000, 180000],
  "HR Manager": [60000, 110000],
  "Finance Manager": [80000, 140000],
  "Content Writer": [35000, 60000],
  "DevOps Engineer": [90000, 160000],
  Teacher: [40000, 70000],
  Architect: [100000, 200000],
  Doctor: [150000, 300000],
  Consultant: [80000, 150000],
  "Graphic Designer": [45000, 80000],
  "Investment Banker": [200000, 500000],
  Journalist: [40000, 80000],
  Entrepreneur: [50000, 300000],
  "Research Scientist": [70000, 120000],
};

const banks = [
  "HDFC Bank",
  "ICICI Bank",
  "SBI",
  "Axis Bank",
  "Kotak Mahindra",
  "PNB",
  "BOI",
];
const companies = [
  "TCS",
  "Infosys",
  "Reliance Industries",
  "HDFC Bank",
  "ICICI Bank",
  "Wipro",
  "HCL Tech",
];
const mutualFunds = [
  "HDFC Equity Fund",
  "SBI Bluechip Fund",
  "ICICI Prudential Fund",
  "Axis Growth Fund",
];

// Generate financial data for manual users
const generateFinancialData = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🧹 Clearing existing data...");
    await Promise.all([
      Asset.deleteMany({}),
      Liability.deleteMany({}),
      Transaction.deleteMany({}),
      EPF.deleteMany({}),
      CreditScore.deleteMany({}),
      Investment.deleteMany({}),
    ]);

    console.log("📊 Generating financial data for manual users...");

    for (const user of manualClerkUsers) {
      if (user.clerkId.includes("PASTE_REAL_CLERK_ID_HERE")) {
        console.log(
          `⚠️  Skipping ${user.name} - Please update clerkId with real Clerk user ID`
        );
        continue;
      }

      console.log(`👤 Processing ${user.name}...`);

      const salaryRange = salaryRanges[user.profession] || [50000, 100000];
      const monthlySalary = Math.floor(
        Math.random() * (salaryRange[1] - salaryRange[0]) + salaryRange[0]
      );

      // Generate Assets
      const assetData = {
        user_id: user.user_id,
        clerkId: user.clerkId,
        total_value: 0,
        bank_accounts: [],
        real_estate: [],
        vehicles: [],
      };

      // Bank accounts (2-3 accounts)
      const numAccounts = Math.floor(Math.random() * 2) + 2;
      let totalAssetValue = 0;

      for (let i = 0; i < numAccounts; i++) {
        const balance = Math.floor(monthlySalary * (Math.random() * 3 + 2));
        totalAssetValue += balance;

        assetData.bank_accounts.push({
          id: `a_${user.user_id}_${i + 1}`,
          type: "savings",
          bank_name: banks[Math.floor(Math.random() * banks.length)],
          balance: balance,
          account_number: `****${Math.floor(Math.random() * 9000) + 1000}`,
        });
      }

      // Real estate (60% chance for higher earners)
      if (monthlySalary > 80000 && Math.random() > 0.4) {
        const propertyValue = Math.floor(
          monthlySalary * (Math.random() * 60 + 40)
        );
        totalAssetValue += propertyValue;

        assetData.real_estate.push({
          id: `a_${user.user_id}_property`,
          type: "residential",
          current_value: propertyValue,
          address: `${user.city}, India`,
          purchase_date: new Date(
            Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000
          ),
        });
      }

      // Vehicle (75% chance)
      if (Math.random() > 0.25) {
        const vehicleValue = Math.floor(
          monthlySalary * (Math.random() * 8 + 2)
        );
        totalAssetValue += vehicleValue;

        assetData.vehicles.push({
          id: `a_${user.user_id}_vehicle`,
          type: "car",
          current_value: vehicleValue,
          make: "Honda",
          model: "City",
          year: 2020 + Math.floor(Math.random() * 4),
        });
      }

      assetData.total_value = totalAssetValue;
      await Asset.create(assetData);

      // Generate Liabilities
      const liabilityData = {
        user_id: user.user_id,
        clerkId: user.clerkId,
        liabilities: [],
      };

      // Home loan (if has property)
      const hasProperty = assetData.real_estate.length > 0;
      if (hasProperty && Math.random() > 0.2) {
        const loanAmount = Math.floor(
          monthlySalary * (Math.random() * 40 + 20)
        );
        liabilityData.liabilities.push({
          id: `l_${user.user_id}_1`,
          type: "home_loan",
          remaining_balance: loanAmount,
          monthly_payment: Math.floor(loanAmount / 240),
          interest_rate: (Math.random() * 2 + 7).toFixed(1),
          loan_term_months: 240,
        });
      }

      // Car loan (if has vehicle)
      const hasVehicle = assetData.vehicles.length > 0;
      if (hasVehicle && Math.random() > 0.5) {
        const loanAmount = Math.floor(
          assetData.vehicles[0].current_value * 0.8
        );
        liabilityData.liabilities.push({
          id: `l_${user.user_id}_2`,
          type: "car_loan",
          remaining_balance: loanAmount,
          monthly_payment: Math.floor(loanAmount / 60),
          interest_rate: (Math.random() * 3 + 9).toFixed(1),
          loan_term_months: 60,
        });
      }

      await Liability.create(liabilityData);

      // Generate Transactions (3 months)
      const transactions = [];
      const currentDate = new Date();

      for (let month = 0; month < 3; month++) {
        const monthDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - month,
          1
        );

        // Monthly salary
        transactions.push({
          id: `t_${user.user_id}_salary_${month}`,
          date: new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            1
          ).toISOString(),
          amount: monthlySalary + Math.floor(Math.random() * 10000 - 5000),
          type: "income",
          category: "salary",
          description: "Monthly Salary",
          account: assetData.bank_accounts[0]?.account_number || "****1234",
        });

        // Monthly expenses
        const expenses = [
          {
            category: "rent",
            amount: Math.floor(monthlySalary * 0.3),
            desc: "Monthly Rent",
          },
          {
            category: "groceries",
            amount: Math.floor(monthlySalary * 0.1),
            desc: "Groceries",
          },
          {
            category: "utilities",
            amount: Math.floor(monthlySalary * 0.05),
            desc: "Electricity & Water",
          },
          {
            category: "entertainment",
            amount: Math.floor(monthlySalary * 0.08),
            desc: "Entertainment",
          },
        ];

        expenses.forEach((expense, idx) => {
          transactions.push({
            id: `t_${user.user_id}_${expense.category}_${month}`,
            date: new Date(
              monthDate.getFullYear(),
              monthDate.getMonth(),
              Math.floor(Math.random() * 28) + 1
            ).toISOString(),
            amount: expense.amount + Math.floor(Math.random() * 5000 - 2500),
            type: "expense",
            category: expense.category,
            description: expense.desc,
            account: assetData.bank_accounts[0]?.account_number || "****1234",
          });
        });
      }

      await Transaction.create({
        user_id: user.user_id,
        clerkId: user.clerkId,
        transactions: transactions,
      });

      // Generate EPF
      const yearsOfService = Math.floor(Math.random() * 10) + 2;
      const epfBalance = monthlySalary * 0.12 * 12 * yearsOfService;

      await EPF.create({
        user_id: user.user_id,
        clerkId: user.clerkId,
        uan: `${Math.floor(Math.random() * 900000000) + 100000000}${
          Math.floor(Math.random() * 999) + 1
        }`,
        member_id: `${user.city.substring(0, 2).toUpperCase()}/${
          Math.floor(Math.random() * 900000) + 100000
        }/${Math.floor(Math.random() * 9000000) + 1000000}`,
        employee_contribution: Math.floor(epfBalance * 0.5),
        employer_contribution: Math.floor(epfBalance * 0.5),
        total_balance: epfBalance,
        kyc_status: "verified",
      });

      // Generate Credit Score
      const totalLiabilities = liabilityData.liabilities.reduce(
        (sum, liability) => sum + liability.remaining_balance,
        0
      );
      const debtToIncomeRatio = totalLiabilities / (monthlySalary * 12);

      let creditScore = 750;
      if (debtToIncomeRatio > 0.4) creditScore -= 100;
      if (debtToIncomeRatio > 0.6) creditScore -= 50;
      creditScore += Math.floor(Math.random() * 50 - 25);

      await CreditScore.create({
        user_id: user.user_id,
        clerkId: user.clerkId,
        credit_score: Math.max(300, Math.min(850, creditScore)),
        payment_history:
          creditScore > 700 ? "excellent" : creditScore > 600 ? "good" : "fair",
        credit_utilization: Math.floor(Math.random() * 50) + 10,
        score_date: new Date(),
      });

      // Generate Investments (for higher earners)
      if (monthlySalary > 80000) {
        const stocks = [];
        const mutualFundsData = [];
        let portfolioValue = 0;

        // Stocks
        const numStocks = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numStocks; i++) {
          const company =
            companies[Math.floor(Math.random() * companies.length)];
          const shares = Math.floor(Math.random() * 50) + 10;
          const price = Math.floor(Math.random() * 2000) + 500;
          const currentValue = shares * price;
          portfolioValue += currentValue;

          stocks.push({
            symbol: company.substring(0, 3).toUpperCase(),
            company_name: company,
            quantity: shares,
            current_value: currentValue,
            purchase_price: price,
            sector: "Technology",
          });
        }

        // Mutual Funds
        const numMFs = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numMFs; i++) {
          const fund =
            mutualFunds[Math.floor(Math.random() * mutualFunds.length)];
          const units = Math.floor(Math.random() * 1000) + 100;
          const nav = Math.floor(Math.random() * 50) + 20;
          const currentValue = units * nav;
          portfolioValue += currentValue;

          mutualFundsData.push({
            scheme_name: fund,
            scheme_code: `${fund.substring(0, 4).toUpperCase()}${
              Math.floor(Math.random() * 999) + 1
            }`,
            units: units,
            current_value: currentValue,
            nav: nav,
            category: "Equity",
          });
        }

        await Investment.create({
          user_id: user.user_id,
          clerkId: user.clerkId,
          portfolio: {
            total_value: portfolioValue,
            stocks: stocks,
            mutual_funds: mutualFundsData,
          },
        });
      }

      console.log(`✅ Generated data for ${user.name}`);
    }

    console.log("\n🎉 Financial data generation completed!");
    console.log("\n📋 Instructions:");
    console.log("1. Create users manually in your Clerk dashboard");
    console.log("2. Copy their Clerk user IDs");
    console.log(
      "3. Replace the PASTE_REAL_CLERK_ID_HERE placeholders in this script"
    );
    console.log("4. Run the script again to generate financial data");
  } catch (error) {
    console.error("❌ Error generating data:", error);
  } finally {
    await mongoose.disconnect();
  }
};

generateFinancialData();
