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
import fs from "fs";

// Load environment variables
dotenv.config();

// Load real Clerk users (created by createTestUsers.js)
let sampleUsers = [];
try {
  const createdUsersData = fs.readFileSync(
    "./scripts/createdUsers.json",
    "utf8"
  );
  sampleUsers = JSON.parse(createdUsersData);
  console.log(
    `📁 Loaded ${sampleUsers.length} real Clerk users from createdUsers.json`
  );
} catch (error) {
  console.log("⚠️  createdUsers.json not found, using fallback dummy users");
  // Fallback to dummy users if file doesn't exist
  sampleUsers = [
    {
      clerkId: "user_2abc123def456",
      user_id: "u1",
      name: "Rajesh Kumar",
      city: "Mumbai",
      profession: "Software Engineer",
    },
    {
      clerkId: "user_2xyz789ghi012",
      user_id: "u2",
      name: "Priya Sharma",
      city: "Delhi",
      profession: "Marketing Manager",
    },
    {
      clerkId: "user_2mno345pqr678",
      user_id: "u3",
      name: "Amit Patel",
      city: "Bangalore",
      profession: "Product Manager",
    },
  ];
}

// Profession-based salary ranges (monthly)
const salaryRanges = {
  "Software Engineer": { min: 80000, max: 150000 },
  "Marketing Manager": { min: 70000, max: 120000 },
  "Product Manager": { min: 100000, max: 200000 },
  "Data Scientist": { min: 90000, max: 160000 },
  "Business Analyst": { min: 60000, max: 100000 },
  "UX Designer": { min: 55000, max: 95000 },
  "Sales Director": { min: 120000, max: 250000 },
  "HR Manager": { min: 65000, max: 110000 },
  "Finance Manager": { min: 85000, max: 140000 },
  "Content Writer": { min: 35000, max: 65000 },
  "DevOps Engineer": { min: 75000, max: 130000 },
  Teacher: { min: 40000, max: 70000 },
  Architect: { min: 80000, max: 150000 },
  Doctor: { min: 100000, max: 300000 },
  Consultant: { min: 90000, max: 180000 },
  "Graphic Designer": { min: 45000, max: 80000 },
  "Investment Banker": { min: 150000, max: 400000 },
  Journalist: { min: 50000, max: 90000 },
  Entrepreneur: { min: 50000, max: 500000 },
  "Research Scientist": { min: 70000, max: 120000 },
};

// Bank names for variety
const bankNames = [
  "HDFC Bank",
  "ICICI Bank",
  "SBI Bank",
  "Axis Bank",
  "Kotak Bank",
  "Yes Bank",
  "IndusInd Bank",
];

// Stock symbols and companies
const stockOptions = [
  { symbol: "RELIANCE", company: "Reliance Industries Ltd", sector: "Energy" },
  { symbol: "TCS", company: "Tata Consultancy Services", sector: "IT" },
  { symbol: "HDFCBANK", company: "HDFC Bank Ltd", sector: "Banking" },
  { symbol: "INFY", company: "Infosys Ltd", sector: "IT" },
  { symbol: "ITC", company: "ITC Ltd", sector: "FMCG" },
  { symbol: "WIPRO", company: "Wipro Ltd", sector: "IT" },
  { symbol: "LTI", company: "LTI Mindtree", sector: "IT" },
  { symbol: "TECHM", company: "Tech Mahindra", sector: "IT" },
];

// Mutual fund options
const mutualFundOptions = [
  { name: "HDFC Top 100 Fund", code: "HDFC001", category: "Large Cap" },
  { name: "SBI Blue Chip Fund", code: "SBI002", category: "Large Cap" },
  { name: "Axis Growth Fund", code: "AXIS003", category: "Mid Cap" },
  { name: "ICICI Value Fund", code: "ICICI004", category: "Value" },
  { name: "Kotak Equity Fund", code: "KOTAK005", category: "Diversified" },
  { name: "Axis Small Cap Fund", code: "AXIS006", category: "Small Cap" },
];

const generateCleanData = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🧹 Ensuring database is clean...");

    let totalAssets = 0,
      totalLiabilities = 0,
      totalInvestments = 0;

    // Generate data for each sample user
    for (const user of sampleUsers) {
      console.log(
        `\n👤 Generating data for ${user.name} - ${user.profession} from ${user.city}`
      );

      const salaryRange = salaryRanges[user.profession];
      const monthlySalary =
        Math.floor(Math.random() * (salaryRange.max - salaryRange.min)) +
        salaryRange.min;

      // 1. Generate Assets (based on profession and salary)
      const bankBalance1 = Math.floor(monthlySalary * (Math.random() * 3 + 2)); // 2-5x monthly salary
      const bankBalance2 = Math.floor(
        monthlySalary * (Math.random() * 2 + 0.5)
      ); // 0.5-2.5x monthly salary

      const assetData = {
        user_id: user.user_id,
        clerkId: user.clerkId,
        total_value: 0,
        bank_accounts: [
          {
            id: `ba_${user.user_id}_1`,
            type: "savings",
            bank_name: bankNames[Math.floor(Math.random() * bankNames.length)],
            balance: bankBalance1,
            account_number: `****${Math.floor(Math.random() * 9000) + 1000}`,
          },
          {
            id: `ba_${user.user_id}_2`,
            type: "current",
            bank_name: bankNames[Math.floor(Math.random() * bankNames.length)],
            balance: bankBalance2,
            account_number: `****${Math.floor(Math.random() * 9000) + 1000}`,
          },
        ],
        real_estate: [],
        vehicles: [],
      };

      // Add real estate for higher earners (60% chance)
      if (monthlySalary > 80000 && Math.random() > 0.4) {
        const propertyValue = Math.floor(
          monthlySalary * (Math.random() * 60 + 40)
        ); // 40-100x monthly salary
        assetData.real_estate.push({
          id: `re_${user.user_id}_1`,
          type: Math.random() > 0.8 ? "commercial" : "residential",
          current_value: propertyValue,
          address: `${Math.floor(Math.random() * 999) + 1}, ${user.city}`,
          purchase_date: new Date(
            2018 + Math.floor(Math.random() * 6),
            Math.floor(Math.random() * 12),
            1
          ),
        });
      }

      // Add vehicle for most users (75% chance)
      if (Math.random() > 0.25) {
        const vehicleValue = Math.floor(
          monthlySalary * (Math.random() * 8 + 2)
        ); // 2-10x monthly salary
        assetData.vehicles.push({
          id: `v_${user.user_id}_1`,
          type: Math.random() > 0.7 ? "bike" : "car",
          current_value: vehicleValue,
          make: ["Honda", "Maruti", "Hyundai", "Tata", "Toyota"][
            Math.floor(Math.random() * 5)
          ],
          model: ["City", "Swift", "i20", "Nexon", "Innova"][
            Math.floor(Math.random() * 5)
          ],
          year: 2018 + Math.floor(Math.random() * 6),
        });
      }

      // Calculate total value
      assetData.total_value =
        assetData.bank_accounts.reduce((sum, acc) => sum + acc.balance, 0) +
        assetData.real_estate.reduce((sum, re) => sum + re.current_value, 0) +
        assetData.vehicles.reduce((sum, v) => sum + v.current_value, 0);

      const asset = new Asset(assetData);
      await asset.save();
      totalAssets += assetData.total_value;
      console.log(`💰 Assets: ₹${assetData.total_value.toLocaleString()}`);

      // 2. Generate Liabilities (based on assets and income)
      const liabilityData = {
        user_id: user.user_id,
        clerkId: user.clerkId,
        liabilities: [],
      };

      // Home loan if has real estate (80% chance)
      if (assetData.real_estate.length > 0 && Math.random() > 0.2) {
        const propertyValue = assetData.real_estate[0].current_value;
        const loanAmount = Math.floor(
          propertyValue * (Math.random() * 0.4 + 0.4)
        ); // 40-80% of property value
        liabilityData.liabilities.push({
          id: `l_${user.user_id}_1`,
          type: "home_loan",
          remaining_balance: loanAmount,
          monthly_payment: Math.floor(loanAmount * 0.008), // ~0.8% of loan amount
          interest_rate: 8.5 + Math.random() * 2, // 8.5-10.5%
          loan_term_months: 240 + Math.floor(Math.random() * 120), // 20-30 years
        });
      }

      // Car loan if has vehicle (50% chance)
      if (assetData.vehicles.length > 0 && Math.random() > 0.5) {
        const vehicleValue = assetData.vehicles[0].current_value;
        const loanAmount = Math.floor(
          vehicleValue * (Math.random() * 0.5 + 0.3)
        ); // 30-80% of vehicle value
        liabilityData.liabilities.push({
          id: `l_${user.user_id}_2`,
          type: "car_loan",
          remaining_balance: loanAmount,
          monthly_payment: Math.floor(loanAmount * 0.02), // ~2% of loan amount
          interest_rate: 9.0 + Math.random() * 2, // 9-11%
          loan_term_months: 36 + Math.floor(Math.random() * 48), // 3-7 years
        });
      }

      // Personal loan for some users (30% chance)
      if (Math.random() > 0.7) {
        const loanAmount = Math.floor(monthlySalary * (Math.random() * 8 + 2)); // 2-10x monthly salary
        liabilityData.liabilities.push({
          id: `l_${user.user_id}_3`,
          type: "personal_loan",
          remaining_balance: loanAmount,
          monthly_payment: Math.floor(loanAmount * 0.03), // ~3% of loan amount
          interest_rate: 12.0 + Math.random() * 4, // 12-16%
          loan_term_months: 24 + Math.floor(Math.random() * 36), // 2-5 years
        });
      }

      if (liabilityData.liabilities.length > 0) {
        const liability = new Liability(liabilityData);
        await liability.save();
        const totalLiabilitiesUser = liabilityData.liabilities.reduce(
          (sum, l) => sum + l.remaining_balance,
          0
        );
        totalLiabilities += totalLiabilitiesUser;
        console.log(
          `💳 Liabilities: ₹${totalLiabilitiesUser.toLocaleString()}`
        );
      }

      // 3. Generate Transactions (last 3 months)
      const transactions = [];
      for (let month = 0; month < 3; month++) {
        const date = new Date();
        date.setMonth(date.getMonth() - month);
        const monthStr = date.toISOString().slice(0, 7);

        // Salary
        transactions.push({
          id: `t_${user.user_id}_${month * 10 + 1}`,
          date: `${monthStr}-01`,
          amount: monthlySalary + Math.floor(Math.random() * 10000 - 5000), // ±5k variation
          type: "income",
          category: "salary",
          description: "Monthly Salary",
          account: assetData.bank_accounts[0].bank_name,
        });

        // Random expenses
        const expenseCategories = [
          "groceries",
          "rent",
          "utilities",
          "entertainment",
          "transport",
          "dining",
        ];
        for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
          const category =
            expenseCategories[
              Math.floor(Math.random() * expenseCategories.length)
            ];
          let amount = 0;

          switch (category) {
            case "rent":
              amount = Math.floor(
                monthlySalary * 0.3 * (Math.random() * 0.4 + 0.8)
              );
              break;
            case "groceries":
              amount = Math.floor(
                monthlySalary * 0.1 * (Math.random() * 0.6 + 0.7)
              );
              break;
            case "utilities":
              amount = Math.floor(
                monthlySalary * 0.05 * (Math.random() * 0.8 + 0.6)
              );
              break;
            default:
              amount = Math.floor(
                monthlySalary * 0.02 * (Math.random() * 2 + 0.5)
              );
              break;
          }

          transactions.push({
            id: `t_${user.user_id}_${month * 10 + i + 2}`,
            date: `${monthStr}-${String(
              Math.floor(Math.random() * 28) + 1
            ).padStart(2, "0")}`,
            amount: -amount,
            type: "expense",
            category: category,
            description: `${
              category.charAt(0).toUpperCase() + category.slice(1)
            } expense`,
            account:
              assetData.bank_accounts[
                Math.floor(Math.random() * assetData.bank_accounts.length)
              ].bank_name,
          });
        }
      }

      const transactionData = {
        user_id: user.user_id,
        clerkId: user.clerkId,
        transactions: transactions,
      };

      const transaction = new Transaction(transactionData);
      await transaction.save();
      console.log(`💸 Transactions: ${transactions.length}`);

      // 4. Generate EPF
      const yearsOfService = Math.floor(Math.random() * 15) + 2; // 2-17 years
      const monthlyContribution = Math.floor(monthlySalary * 0.12); // 12% of salary
      const totalContribution = monthlyContribution * yearsOfService * 12;

      const epfData = {
        user_id: user.user_id,
        clerkId: user.clerkId,
        uan: `100000000${user.user_id.slice(-2).padStart(3, "0")}`,
        member_id: `${
          ["MH", "DL", "KA", "TN", "GJ"][Math.floor(Math.random() * 5)]
        }/${user.city.slice(0, 3).toUpperCase()}/${user.user_id.slice(-4)}`,
        employer_contribution: Math.floor(totalContribution * 0.5),
        employee_contribution: Math.floor(totalContribution * 0.5),
        total_balance: totalContribution,
        kyc_status: Math.random() > 0.15 ? "verified" : "pending",
      };

      const epf = new EPF(epfData);
      await epf.save();
      console.log(`🏛️ EPF: ₹${epfData.total_balance.toLocaleString()}`);

      // 5. Generate Credit Score (based on income and liabilities)
      const debtToIncomeRatio =
        liabilityData.liabilities.reduce(
          (sum, l) => sum + l.monthly_payment,
          0
        ) / monthlySalary;
      let baseScore = 750;

      if (debtToIncomeRatio > 0.5) baseScore -= 100;
      else if (debtToIncomeRatio > 0.3) baseScore -= 50;

      const creditScoreData = {
        user_id: user.user_id,
        clerkId: user.clerkId,
        credit_score: Math.max(
          300,
          Math.min(850, baseScore + Math.floor(Math.random() * 100 - 50))
        ),
        payment_history:
          debtToIncomeRatio < 0.3
            ? "excellent"
            : debtToIncomeRatio < 0.5
            ? "good"
            : "fair",
        credit_utilization:
          Math.floor(debtToIncomeRatio * 100) + Math.floor(Math.random() * 20),
        score_date: new Date(),
      };

      const creditScore = new CreditScore(creditScoreData);
      await creditScore.save();
      console.log(`📊 Credit Score: ${creditScoreData.credit_score}`);

      // 6. Generate Investments (for higher earners, 70% chance)
      if (monthlySalary > 60000 && Math.random() > 0.3) {
        const investmentBudget = Math.floor(
          monthlySalary * (Math.random() * 10 + 5)
        ); // 5-15x monthly salary

        const stocks = [];
        const numStocks = Math.floor(Math.random() * 3) + 1; // 1-3 stocks
        let stockValue = 0;

        for (let i = 0; i < numStocks; i++) {
          const stock =
            stockOptions[Math.floor(Math.random() * stockOptions.length)];
          const value = Math.floor(
            investmentBudget * (Math.random() * 0.4 + 0.2)
          ); // 20-60% of budget
          stockValue += value;

          stocks.push({
            symbol: stock.symbol,
            company_name: stock.company,
            quantity: Math.floor(value / (Math.random() * 1000 + 500)), // Random price per share
            current_value: value,
            purchase_price: Math.floor(Math.random() * 1000 + 500),
            sector: stock.sector,
          });
        }

        const mutualFunds = [];
        const numMFs = Math.floor(Math.random() * 2) + 1; // 1-2 MFs
        let mfValue = 0;

        for (let i = 0; i < numMFs; i++) {
          const mf =
            mutualFundOptions[
              Math.floor(Math.random() * mutualFundOptions.length)
            ];
          const value = Math.floor(
            (investmentBudget - stockValue) * (Math.random() * 0.6 + 0.4)
          ); // Remaining budget
          mfValue += value;

          mutualFunds.push({
            scheme_name: mf.name,
            scheme_code: mf.code,
            units: Math.floor(value / (Math.random() * 20 + 30)), // Random NAV
            current_value: value,
            nav: Math.random() * 20 + 30,
            category: mf.category,
          });
        }

        const investmentData = {
          user_id: user.user_id,
          clerkId: user.clerkId,
          portfolio: {
            total_value: stockValue + mfValue,
            stocks: stocks,
            mutual_funds: mutualFunds,
          },
        };

        const investment = new Investment(investmentData);
        await investment.save();
        totalInvestments += investmentData.portfolio.total_value;
        console.log(
          `📈 Investments: ₹${investmentData.portfolio.total_value.toLocaleString()}`
        );
      }

      console.log(`✅ Completed ${user.name}`);
    }

    console.log("\n🎉 Clean data generation completed successfully!");
    console.log("📊 Summary:");
    console.log(`👥 Users: ${sampleUsers.length}`);
    console.log(`💰 Total Assets: ₹${totalAssets.toLocaleString()}`);
    console.log(`💳 Total Liabilities: ₹${totalLiabilities.toLocaleString()}`);
    console.log(`📈 Total Investments: ₹${totalInvestments.toLocaleString()}`);
    console.log(
      `💎 Net Worth: ₹${(totalAssets - totalLiabilities).toLocaleString()}`
    );

    console.log("\n📋 Document Counts:");
    console.log(`💰 Assets: ${await Asset.countDocuments()}`);
    console.log(`💳 Liabilities: ${await Liability.countDocuments()}`);
    console.log(`💸 Transactions: ${await Transaction.countDocuments()}`);
    console.log(`🏛️ EPF Records: ${await EPF.countDocuments()}`);
    console.log(`📊 Credit Scores: ${await CreditScore.countDocuments()}`);
    console.log(`📈 Investments: ${await Investment.countDocuments()}`);
  } catch (error) {
    console.error("❌ Error generating clean data:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
    process.exit(0);
  }
};

// Run the script
generateCleanData();
