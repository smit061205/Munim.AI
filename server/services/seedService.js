import {
  Asset,
  Liability,
  Transaction,
  EPF,
  CreditScore,
  Investment,
  Budget,
} from "../models/Financial.js";
import UserPermissions from "../models/UserPermissions.js";

// Generate comprehensive transaction data for a single user
const generateTransactions = (clerkId, userIndex = 0) => {
  const transactions = [];
  const categories = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Groceries",
    "Fuel",
    "Rent",
    "Insurance",
    "Investments",
    "Salary",
    "Freelance",
    "Business",
    "Gifts",
    "Charity",
    "Subscriptions",
  ];

  const incomeCategories = ["Salary", "Freelance", "Business", "Investments"];
  const expenseCategories = categories.filter(
    (cat) => !incomeCategories.includes(cat),
  );

  // Generate 6 months of data
  for (let month = 0; month < 6; month++) {
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - month);

    // Monthly salary - create for the 1st of the current month being processed
    const salaryDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    transactions.push({
      clerkId,
      amount: 85000 + userIndex * 15000,
      category: "Salary",
      description: "Monthly Salary",
      date: salaryDate,
      type: "income",
      account: "Salary Account",
    });

    // Generate 40-60 expense transactions per month
    const monthlyTransactions = 45 + Math.floor(Math.random() * 15);

    for (let i = 0; i < monthlyTransactions; i++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const transactionDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        day,
      );

      const category =
        expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      let amount, description;

      // Category-specific amounts and descriptions
      switch (category) {
        case "Rent":
          amount = 25000 + userIndex * 5000;
          description = "Monthly Rent Payment";
          break;
        case "Groceries":
          amount = 500 + Math.floor(Math.random() * 2000);
          description = `Grocery Shopping - ${
            ["BigBasket", "DMart", "Reliance Fresh", "Local Store"][
              Math.floor(Math.random() * 4)
            ]
          }`;
          break;
        case "Food & Dining":
          amount = 150 + Math.floor(Math.random() * 800);
          description = `${
            ["Zomato", "Swiggy", "Restaurant", "Cafe", "Street Food"][
              Math.floor(Math.random() * 5)
            ]
          } - ${["Lunch", "Dinner", "Snacks"][Math.floor(Math.random() * 3)]}`;
          break;
        case "Transportation":
          amount = 50 + Math.floor(Math.random() * 500);
          description = `${
            ["Uber", "Ola", "Auto", "Metro", "Bus", "Fuel"][
              Math.floor(Math.random() * 6)
            ]
          }`;
          break;
        case "Bills & Utilities":
          amount = 1000 + Math.floor(Math.random() * 3000);
          description = `${
            [
              "Electricity Bill",
              "Water Bill",
              "Gas Bill",
              "Internet Bill",
              "Mobile Bill",
            ][Math.floor(Math.random() * 5)]
          }`;
          break;
        case "Entertainment":
          amount = 200 + Math.floor(Math.random() * 1500);
          description = `${
            [
              "Movie Tickets",
              "Netflix",
              "Spotify",
              "Gaming",
              "Concert",
              "Sports",
            ][Math.floor(Math.random() * 6)]
          }`;
          break;
        case "Shopping":
          amount = 500 + Math.floor(Math.random() * 5000);
          description = `${
            ["Amazon", "Flipkart", "Myntra", "Mall Shopping", "Electronics"][
              Math.floor(Math.random() * 5)
            ]
          }`;
          break;
        case "Healthcare":
          amount = 300 + Math.floor(Math.random() * 2000);
          description = `${
            ["Doctor Visit", "Medicines", "Lab Tests", "Dental", "Eye Care"][
              Math.floor(Math.random() * 5)
            ]
          }`;
          break;
        case "Fuel":
          amount = 1000 + Math.floor(Math.random() * 2000);
          description = `${
            ["Petrol", "Diesel"][Math.floor(Math.random() * 2)]
          } - ${["HP", "BPCL", "IOC", "Shell"][Math.floor(Math.random() * 4)]}`;
          break;
        default:
          amount = 100 + Math.floor(Math.random() * 1000);
          description = `${category} expense`;
      }

      transactions.push({
        clerkId,
        amount,
        category,
        description,
        date: transactionDate,
        type: "expense",
        account: "Primary Account",
      });
    }

    // Add some income transactions (freelance, investments)
    if (Math.random() > 0.7) {
      transactions.push({
        clerkId,
        amount: 5000 + Math.floor(Math.random() * 15000),
        category: "Freelance",
        description: "Freelance Project Payment",
        date: new Date(baseDate.getFullYear(), baseDate.getMonth(), 15),
        type: "income",
        account: "Freelance Account",
      });
    }

    if (Math.random() > 0.8) {
      transactions.push({
        clerkId,
        amount: 2000 + Math.floor(Math.random() * 8000),
        category: "Investments",
        description: "Dividend/Returns",
        date: new Date(baseDate.getFullYear(), baseDate.getMonth(), 20),
        type: "income",
        account: "Investment Account",
      });
    }
  }

  return transactions;
};

// Generate comprehensive investment data
const generateInvestments = (clerkId, userIndex = 0) => {
  const investments = [];
  const investmentTypes = [
    {
      name: "Mutual Funds",
      categories: ["Equity", "Debt", "Hybrid", "ELSS", "Index"],
    },
    {
      name: "Stocks",
      categories: ["Large Cap", "Mid Cap", "Small Cap", "Blue Chip"],
    },
    { name: "Fixed Deposits", categories: ["Bank FD", "Corporate FD"] },
    { name: "Bonds", categories: ["Government Bonds", "Corporate Bonds"] },
    { name: "Gold", categories: ["Digital Gold", "Gold ETF"] },
    { name: "Real Estate", categories: ["REIT", "Property"] },
  ];

  const companies = [
    "HDFC Bank",
    "ICICI Bank",
    "Reliance",
    "TCS",
    "Infosys",
    "HDFC Ltd",
    "ITC",
    "Kotak Bank",
    "Axis Bank",
    "SBI",
    "Bajaj Finance",
    "Asian Paints",
    "Maruti Suzuki",
    "Wipro",
    "HUL",
  ];

  // Generate 15-25 investments per user
  const numInvestments = 15 + Math.floor(Math.random() * 10);

  for (let i = 0; i < numInvestments; i++) {
    const investmentType =
      investmentTypes[Math.floor(Math.random() * investmentTypes.length)];
    const category =
      investmentType.categories[
        Math.floor(Math.random() * investmentType.categories.length)
      ];

    let name, currentValue, investedAmount;

    if (investmentType.name === "Stocks") {
      const company = companies[Math.floor(Math.random() * companies.length)];
      name = `${company} - ${category}`;
      investedAmount = 5000 + Math.floor(Math.random() * 50000);
      currentValue = investedAmount * (0.8 + Math.random() * 0.6); // -20% to +40% returns
    } else if (investmentType.name === "Mutual Funds") {
      name = `${category} Fund - ${
        ["HDFC", "ICICI", "SBI", "Axis", "Kotak"][Math.floor(Math.random() * 5)]
      }`;
      investedAmount = 10000 + Math.floor(Math.random() * 100000);
      currentValue = investedAmount * (0.9 + Math.random() * 0.4); // -10% to +30% returns
    } else {
      name = `${investmentType.name} - ${category}`;
      investedAmount = 20000 + Math.floor(Math.random() * 200000);
      currentValue = investedAmount * (0.95 + Math.random() * 0.2); // -5% to +15% returns
    }

    investments.push({
      clerkId,
      name,
      type: investmentType.name,
      category,
      investedAmount: Math.round(investedAmount),
      currentValue: Math.round(currentValue),
      returns: Math.round(currentValue - investedAmount),
      returnsPercentage:
        Math.round(
          ((currentValue - investedAmount) / investedAmount) * 100 * 100,
        ) / 100,
      purchaseDate: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      ), // Random date in last year
      maturityDate:
        Math.random() > 0.5
          ? new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000)
          : null,
    });
  }

  return investments;
};

// Generate comprehensive asset data
const generateAssets = (clerkId, userIndex = 0) => {
  const baseMultiplier = 1 + userIndex * 0.3;

  return [
    {
      clerkId,
      name: "Primary Residence",
      type: "Real Estate",
      category: "Property",
      value: Math.round(5000000 * baseMultiplier),
      description: "2BHK Apartment in Mumbai",
      purchaseDate: new Date("2020-01-15"),
      location: "Mumbai, Maharashtra",
    },
    {
      clerkId,
      name: "Car - Honda City",
      type: "Vehicle",
      category: "Automobile",
      value: Math.round(800000 * baseMultiplier),
      description: "Honda City 2021 Model",
      purchaseDate: new Date("2021-03-10"),
      location: "Mumbai, Maharashtra",
    },
    {
      clerkId,
      name: "Savings Account - HDFC",
      type: "Bank Account",
      category: "Liquid Cash",
      value: Math.round(250000 * baseMultiplier),
      description: "Primary Savings Account",
      purchaseDate: new Date("2018-06-01"),
      location: "HDFC Bank",
    },
    {
      clerkId,
      name: "Fixed Deposit - SBI",
      type: "Fixed Deposit",
      category: "Fixed Income",
      value: Math.round(500000 * baseMultiplier),
      description: "3 Year FD @ 6.5% p.a.",
      purchaseDate: new Date("2022-01-01"),
      location: "SBI Bank",
    },
    {
      clerkId,
      name: "Laptop - MacBook Pro",
      type: "Electronics",
      category: "Technology",
      value: Math.round(150000 * baseMultiplier),
      description: "MacBook Pro 14-inch M1 Pro",
      purchaseDate: new Date("2022-08-15"),
      location: "Home",
    },
    {
      clerkId,
      name: "Gold Jewelry",
      type: "Precious Metals",
      category: "Gold",
      value: Math.round(300000 * baseMultiplier),
      description: "50 grams of 22K Gold Jewelry",
      purchaseDate: new Date("2019-11-01"),
      location: "Home Safe",
    },
    {
      clerkId,
      name: "Emergency Fund",
      type: "Bank Account",
      category: "Emergency",
      value: Math.round(150000 * baseMultiplier),
      description: "Emergency Fund in High Yield Savings",
      purchaseDate: new Date("2020-01-01"),
      location: "Kotak Bank",
    },
  ];
};

// Generate comprehensive liability data
const generateLiabilities = (clerkId, userIndex = 0) => {
  const baseMultiplier = 1 + userIndex * 0.2;

  return [
    {
      clerkId,
      name: "Home Loan",
      type: "Loan",
      category: "Mortgage",
      amount: Math.round(3500000 * baseMultiplier),
      interestRate: 8.5,
      monthlyPayment: Math.round(35000 * baseMultiplier),
      remainingTenure: 180, // 15 years
      startDate: new Date("2020-01-15"),
      endDate: new Date("2035-01-15"),
      lender: "HDFC Bank",
    },
    {
      clerkId,
      name: "Car Loan",
      type: "Loan",
      category: "Auto Loan",
      amount: Math.round(400000 * baseMultiplier),
      interestRate: 9.2,
      monthlyPayment: Math.round(8500 * baseMultiplier),
      remainingTenure: 36, // 3 years
      startDate: new Date("2021-03-10"),
      endDate: new Date("2024-03-10"),
      lender: "Axis Bank",
    },
    {
      clerkId,
      name: "Credit Card - HDFC",
      type: "Credit Card",
      category: "Revolving Credit",
      amount: Math.round(45000 * baseMultiplier),
      interestRate: 42.0,
      monthlyPayment: Math.round(5000 * baseMultiplier),
      remainingTenure: null,
      startDate: new Date("2019-01-01"),
      endDate: null,
      lender: "HDFC Bank",
    },
    {
      clerkId,
      name: "Personal Loan",
      type: "Loan",
      category: "Personal",
      amount: Math.round(200000 * baseMultiplier),
      interestRate: 12.5,
      monthlyPayment: Math.round(4500 * baseMultiplier),
      remainingTenure: 24, // 2 years
      startDate: new Date("2022-06-01"),
      endDate: new Date("2024-06-01"),
      lender: "ICICI Bank",
    },
  ];
};

/**
 * Seeds a new user with generated comprehensive mock financial data
 * and grants them full access permissions.
 *
 * @param {string} clerkId - The Clerk user ID
 * @param {string} firstName - User's first name for EPF generation
 */
export const seedNewUser = async (clerkId, firstName = "User") => {
  try {
    console.log(`\n🌱 Seeding new user data for ${clerkId}...`);

    // 1. Grant Full Permissions
    console.log(`  - Granting full UserPermissions`);
    const existingPermissions = await UserPermissions.findOne({ clerkId });
    if (!existingPermissions) {
      await UserPermissions.create({
        clerkId,
        user_id: clerkId, // backward-compatibility
        permissions: {
          transactions: true,
          assets: true,
          liabilities: true,
          investments: true,
          aiChat: true, // Full AI access
        },
      });
    }

    // Generate random mock inputs
    const userIndex = Math.floor(Math.random() * 5); // randomize the amounts a bit

    console.log(`  - Generating mock models`);
    const transactions = generateTransactions(clerkId, userIndex);
    const investments = generateInvestments(clerkId, userIndex);
    const assets = generateAssets(clerkId, userIndex);
    const liabilities = generateLiabilities(clerkId, userIndex);

    // 2. Create transaction documents
    const transactionDoc = new Transaction({
      user_id: clerkId,
      clerkId: clerkId,
      transactions: transactions.map((t) => ({
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: t.date.toISOString().split("T")[0],
        amount: t.type === "expense" ? -t.amount : t.amount,
        type: t.type,
        category: t.category,
        description: t.description,
        account: t.account,
      })),
    });
    await transactionDoc.save();

    // 3. Create investment documents
    const stocks = [];
    const mutualFunds = [];
    let totalPortfolioValue = 0;

    for (const inv of investments) {
      totalPortfolioValue += inv.currentValue;

      if (inv.type === "Stocks") {
        stocks.push({
          symbol: inv.name.split(" - ")[0].replace(/[^A-Z]/g, ""),
          company_name: inv.name.split(" - ")[0],
          quantity: Math.floor(inv.investedAmount / 100),
          current_value: inv.currentValue,
          purchase_price:
            inv.investedAmount / Math.floor(inv.investedAmount / 100),
          sector: inv.category,
        });
      } else if (inv.type === "Mutual Funds") {
        mutualFunds.push({
          scheme_name: inv.name,
          scheme_code: `MF${Math.random()
            .toString(36)
            .substr(2, 6)
            .toUpperCase()}`,
          units: Math.floor(inv.investedAmount / 50),
          current_value: inv.currentValue,
          nav: inv.currentValue / Math.floor(inv.investedAmount / 50),
          category: inv.category,
        });
      }
    }

    const investmentDoc = new Investment({
      user_id: clerkId,
      clerkId: clerkId,
      portfolio: {
        total_value: totalPortfolioValue,
        stocks: stocks,
        mutual_funds: mutualFunds,
      },
    });
    await investmentDoc.save();

    // 4. Create asset documents
    const assetDoc = new Asset({
      user_id: clerkId,
      clerkId: clerkId,
      total_value: assets.reduce((sum, asset) => sum + asset.value, 0),
      bank_accounts: assets
        .filter((a) => a.type === "Bank Account")
        .map((a) => ({
          id: `acc_${Math.random().toString(36).substr(2, 9)}`,
          type: a.category === "Liquid Cash" ? "savings" : "investment",
          bank_name: a.location,
          balance: a.value,
          account_number: `****${Math.floor(Math.random() * 10000)}`,
        })),
      real_estate: assets
        .filter((a) => a.type === "Real Estate")
        .map((a) => ({
          id: `re_${Math.random().toString(36).substr(2, 9)}`,
          type: "residential",
          current_value: a.value,
          address: a.location,
          purchase_date: a.purchaseDate,
        })),
      vehicles: assets
        .filter((a) => a.type === "Vehicle")
        .map((a) => ({
          id: `veh_${Math.random().toString(36).substr(2, 9)}`,
          type: "car",
          current_value: a.value,
          make: a.name.split(" - ")[1]?.split(" ")[0] || "Honda",
          model: a.name.split(" - ")[1]?.split(" ")[1] || "City",
          year: 2021,
        })),
    });
    await assetDoc.save();

    // 5. Create liability documents
    const liabilityDoc = new Liability({
      user_id: clerkId,
      clerkId: clerkId,
      liabilities: liabilities.map((l) => ({
        id: `lib_${Math.random().toString(36).substr(2, 9)}`,
        type:
          l.category === "Mortgage"
            ? "home_loan"
            : l.category === "Auto Loan"
              ? "car_loan"
              : l.category === "Revolving Credit"
                ? "credit_card"
                : "personal_loan",
        remaining_balance: l.amount,
        monthly_payment: l.monthlyPayment,
        interest_rate: l.interestRate,
        loan_term_months: l.remainingTenure,
      })),
    });
    await liabilityDoc.save();

    // 6. Create EPF document
    const epfDoc = new EPF({
      user_id: clerkId,
      clerkId: clerkId,
      uan: `${Math.floor(Math.random() * 900000000000) + 100000000000}`,
      member_id: `${firstName.toUpperCase()}${Math.floor(
        Math.random() * 10000,
      )}`,
      employee_contribution: 12000 + userIndex * 2000,
      employer_contribution: 12000 + userIndex * 2000,
      total_balance: 500000 + userIndex * 100000,
      kyc_status: "verified",
    });
    await epfDoc.save();

    // 7. Create Credit Score document
    const creditScoreDoc = new CreditScore({
      user_id: clerkId,
      clerkId: clerkId,
      credit_score: 720 + Math.floor(Math.random() * 80),
      payment_history: ["excellent", "good", "fair"][
        Math.floor(Math.random() * 3)
      ],
      credit_utilization: 25 + Math.floor(Math.random() * 20),
      score_date: new Date(),
    });
    await creditScoreDoc.save();

    // 8. Create enhanced budget data
    const budgetCategories = [
      {
        category: "Rent",
        budgetAmount: 25000 + userIndex * 5000,
        spentAmount: 25000 + userIndex * 5000,
      },
      {
        category: "Groceries",
        budgetAmount: 8000,
        spentAmount: 7200 + Math.floor(Math.random() * 1600),
      },
      {
        category: "Transportation",
        budgetAmount: 5000,
        spentAmount: 4500 + Math.floor(Math.random() * 1000),
      },
      {
        category: "Entertainment",
        budgetAmount: 4000,
        spentAmount: 3800 + Math.floor(Math.random() * 800),
      },
      {
        category: "Utilities",
        budgetAmount: 3000,
        spentAmount: 2800 + Math.floor(Math.random() * 600),
      },
      {
        category: "Healthcare",
        budgetAmount: 2000,
        spentAmount: 1500 + Math.floor(Math.random() * 1000),
      },
      {
        category: "Shopping",
        budgetAmount: 6000,
        spentAmount: 5500 + Math.floor(Math.random() * 1500),
      },
      {
        category: "Dining Out",
        budgetAmount: 4000,
        spentAmount: 4200 + Math.floor(Math.random() * 800),
      },
    ];

    const totalBudget = budgetCategories.reduce(
      (sum, cat) => sum + cat.budgetAmount,
      0,
    );
    const totalSpent = budgetCategories.reduce(
      (sum, cat) => sum + cat.spentAmount,
      0,
    );

    const budgetDoc = new Budget({
      user_id: clerkId,
      clerkId: clerkId,
      budgets: budgetCategories.map((cat) => ({
        id: `bud_${Math.random().toString(36).substr(2, 9)}`,
        category: cat.category,
        budgetAmount: cat.budgetAmount,
        spentAmount: cat.spentAmount,
        period: "monthly",
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        ),
        status:
          cat.spentAmount > cat.budgetAmount
            ? "over-budget"
            : cat.spentAmount > cat.budgetAmount * 0.9
              ? "on-track"
              : "under-budget",
        isActive: true,
      })),
      totalBudget,
      totalSpent,
    });
    await budgetDoc.save();

    console.log(`✅ Seeding complete for user ${clerkId}!`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error seeding user data for ${clerkId}:`, error);
    return { success: false, error };
  }
};
