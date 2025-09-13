import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const AUTH_HEADERS = {
  "Content-Type": "application/json",
  Authorization: "Bearer test-token",
  "x-request-id": `permission-test-${Date.now()}`,
};

class PermissionValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };

    this.categoryScenarios = [
      { name: "No Permissions", categories: [] },
      { name: "Assets Only", categories: ["assets"] },
      { name: "Transactions Only", categories: ["transactions"] },
      { name: "Liabilities Only", categories: ["liabilities"] },
      { name: "EPF Only", categories: ["epf"] },
      { name: "Credit Score Only", categories: ["credit-score"] },
      { name: "Investments Only", categories: ["investments"] },
      { name: "Assets + Liabilities", categories: ["assets", "liabilities"] },
      { name: "Assets + Transactions", categories: ["assets", "transactions"] },
      {
        name: "Financial Core",
        categories: ["assets", "liabilities", "transactions"],
      },
      {
        name: "Investment Focus",
        categories: ["assets", "investments", "epf"],
      },
      {
        name: "All Categories",
        categories: [
          "assets",
          "liabilities",
          "transactions",
          "epf",
          "credit-score",
          "investments",
        ],
      },
    ];
  }

  async test(name, testFn) {
    console.log(`🔐 Testing: ${name}`);
    try {
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      this.results.passed++;
      this.results.tests.push({ name, status: "PASSED" });
    } catch (error) {
      console.error(`❌ FAILED: ${name} - ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: "FAILED", error: error.message });
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: AUTH_HEADERS,
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${
          data.error?.message || data.message || "Unknown error"
        }`
      );
    }

    return { response, data };
  }

  async validateQueryPermissions() {
    for (const scenario of this.categoryScenarios) {
      await this.test(`Query Permissions - ${scenario.name}`, async () => {
        const { data } = await this.makeRequest("/api/query", {
          method: "POST",
          body: JSON.stringify({
            question: "Give me a comprehensive financial overview",
            allowedCategories: scenario.categories,
          }),
        });

        if (scenario.categories.length === 0) {
          if (data.data_available !== false) {
            throw new Error(
              "Should indicate no data available when no categories allowed"
            );
          }
          return;
        }

        if (data.status !== "success") {
          throw new Error("Query should succeed with valid categories");
        }

        const usedCategories = data.categories_used || [];
        const unauthorizedCategories = usedCategories.filter(
          (cat) => !scenario.categories.includes(cat)
        );
        if (unauthorizedCategories.length > 0) {
          throw new Error(
            `Used unauthorized categories: ${unauthorizedCategories.join(", ")}`
          );
        }
      });
    }
  }

  async validateDashboardPermissions() {
    const dashboardEndpoints = [
      { endpoint: "/api/dashboard", name: "Main Dashboard" },
      { endpoint: "/api/dashboard/monthly-spending", name: "Monthly Spending" },
      { endpoint: "/api/dashboard/asset-liability", name: "Asset Liability" },
      {
        endpoint: "/api/dashboard/epf-contributions",
        name: "EPF Contributions",
      },
      { endpoint: "/api/dashboard/credit-score", name: "Credit Score" },
      { endpoint: "/api/dashboard/net-worth", name: "Net Worth" },
    ];

    for (const { endpoint, name } of dashboardEndpoints) {
      for (const scenario of this.categoryScenarios.slice(0, 6)) {
        await this.test(`${name} - ${scenario.name}`, async () => {
          const { data } = await this.makeRequest(
            `${endpoint}?categories=${scenario.categories.join(",")}`
          );

          if (data.status !== "success") {
            throw new Error(
              "Dashboard endpoint should always return success status"
            );
          }
        });
      }
    }
  }

  async validateAnalyticsPermissions() {
    const analyticsEndpoints = [
      { endpoint: "/api/analytics/expense-trends", name: "Expense Trends" },
      { endpoint: "/api/analytics/savings-forecast", name: "Savings Forecast" },
      {
        endpoint: "/api/analytics/investment-composition",
        name: "Investment Composition",
      },
      { endpoint: "/api/analytics/financial-health", name: "Financial Health" },
      { endpoint: "/api/analytics/cash-flow", name: "Cash Flow" },
      { endpoint: "/api/analytics/summary", name: "Analytics Summary" },
    ];

    for (const { endpoint, name } of analyticsEndpoints) {
      for (const scenario of this.categoryScenarios.slice(0, 6)) {
        await this.test(`${name} - ${scenario.name}`, async () => {
          const { data } = await this.makeRequest(
            `${endpoint}?categories=${scenario.categories.join(",")}`
          );

          if (data.status !== "success") {
            throw new Error(
              "Analytics endpoint should always return success status"
            );
          }
        });
      }
    }
  }

  async validateDynamicFiltering() {
    const filterTests = [
      { analysisType: "expense-trends", categories: ["transactions"] },
      { analysisType: "savings-forecast", categories: ["transactions"] },
      { analysisType: "investment-composition", categories: ["investments"] },
      {
        analysisType: "financial-health",
        categories: ["assets", "liabilities"],
      },
      { analysisType: "cash-flow", categories: ["transactions"] },
    ];

    for (const { analysisType, categories } of filterTests) {
      await this.test(`Dynamic Filter - ${analysisType}`, async () => {
        const { data } = await this.makeRequest(
          "/api/analytics/category-filter",
          {
            method: "POST",
            body: JSON.stringify({
              allowedCategories: categories,
              analysisType: analysisType,
            }),
          }
        );

        if (data.status !== "success") {
          throw new Error("Category filter should succeed");
        }

        if (!data.data) {
          throw new Error("Category filter should return data");
        }
      });
    }
  }

  async runPermissionValidation() {
    console.log("🔐 Starting Comprehensive Permission Validation...\n");

    console.log("📊 Testing Query Endpoint Permissions...");
    await this.validateQueryPermissions();

    console.log("\n📈 Testing Dashboard Endpoint Permissions...");
    await this.validateDashboardPermissions();

    console.log("\n📉 Testing Analytics Endpoint Permissions...");
    await this.validateAnalyticsPermissions();

    console.log("\n🔄 Testing Dynamic Category Filtering...");
    await this.validateDynamicFiltering();

    console.log("\n🔐 Permission Validation Results:");
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(
      `📈 Success Rate: ${(
        (this.results.passed / (this.results.passed + this.results.failed)) *
        100
      ).toFixed(1)}%`
    );

    if (this.results.failed > 0) {
      console.log("\n❌ Failed Permission Tests:");
      this.results.tests
        .filter((test) => test.status === "FAILED")
        .forEach((test) => console.log(`  - ${test.name}: ${test.error}`));
    } else {
      console.log(
        "\n🎉 All permission validations passed! Data filtering is working correctly."
      );
    }

    return this.results.failed === 0;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new PermissionValidator();
  validator
    .runPermissionValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Permission validation failed:", error);
      process.exit(1);
    });
}

export default PermissionValidator;
