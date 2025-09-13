import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TEST_USER_ID = "u1";
const TEST_CATEGORIES = [
  "assets",
  "liabilities",
  "transactions",
  "epf",
  "credit-score",
  "investments",
];

const AUTH_HEADERS = {
  "Content-Type": "application/json",
  Authorization: "Bearer test-token",
  "x-request-id": `test-${Date.now()}`,
};

class EndpointTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  async test(name, testFn) {
    console.log(`🧪 Testing: ${name}`);
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

  async testSystemHealth() {
    await this.test("System Health Check", async () => {
      const { data } = await this.makeRequest("/api/health");
      if (data.status !== "ok") {
        throw new Error("System not healthy");
      }
    });
  }

  async testQueryEndpoint() {
    await this.test("Query - Valid Request", async () => {
      const { data } = await this.makeRequest("/api/query", {
        method: "POST",
        body: JSON.stringify({
          question: "What is my net worth?",
          allowedCategories: ["assets", "liabilities"],
        }),
      });

      if (data.status !== "success") {
        throw new Error("Query failed");
      }
      if (!data.response || data.response.length === 0) {
        throw new Error("Empty response");
      }
    });

    await this.test("Query - No Permissions", async () => {
      const { data } = await this.makeRequest("/api/query", {
        method: "POST",
        body: JSON.stringify({
          question: "What is my net worth?",
          allowedCategories: [],
        }),
      });

      if (data.data_available !== false) {
        throw new Error("Should indicate no data available");
      }
    });
  }

  async testDashboardEndpoints() {
    const endpoints = [
      "/api/dashboard",
      "/api/dashboard/monthly-spending",
      "/api/dashboard/asset-liability",
      "/api/dashboard/epf-contributions",
      "/api/dashboard/credit-score",
      "/api/dashboard/net-worth",
      "/api/dashboard/spending-categories",
    ];

    for (const endpoint of endpoints) {
      await this.test(`Dashboard - ${endpoint}`, async () => {
        const { data } = await this.makeRequest(
          `${endpoint}?categories=${TEST_CATEGORIES.join(",")}`
        );

        if (data.status !== "success") {
          throw new Error("Dashboard endpoint failed");
        }
        if (!data.data) {
          throw new Error("No data returned");
        }
      });
    }

    await this.test("Dashboard - Refresh", async () => {
      const { data } = await this.makeRequest("/api/dashboard/refresh", {
        method: "POST",
        body: JSON.stringify({
          allowedCategories: ["assets", "transactions"],
        }),
      });

      if (data.status !== "success") {
        throw new Error("Dashboard refresh failed");
      }
    });
  }

  async testAnalyticsEndpoints() {
    const endpoints = [
      "/api/analytics/expense-trends",
      "/api/analytics/savings-forecast",
      "/api/analytics/investment-composition",
      "/api/analytics/financial-health",
      "/api/analytics/cash-flow",
      "/api/analytics/summary",
    ];

    for (const endpoint of endpoints) {
      await this.test(`Analytics - ${endpoint}`, async () => {
        const { data } = await this.makeRequest(
          `${endpoint}?categories=${TEST_CATEGORIES.join(",")}`
        );

        if (data.status !== "success") {
          throw new Error("Analytics endpoint failed");
        }
        if (!data.data) {
          throw new Error("No data returned");
        }
      });
    }

    await this.test("Analytics - Category Filter", async () => {
      const { data } = await this.makeRequest(
        "/api/analytics/category-filter",
        {
          method: "POST",
          body: JSON.stringify({
            allowedCategories: ["transactions"],
            analysisType: "expense-trends",
          }),
        }
      );

      if (data.status !== "success") {
        throw new Error("Category filter failed");
      }
    });
  }

  async testPermissionScenarios() {
    const scenarios = [
      { name: "Only Assets", categories: ["assets"] },
      { name: "Only Transactions", categories: ["transactions"] },
      { name: "Assets + Liabilities", categories: ["assets", "liabilities"] },
      { name: "All Categories", categories: TEST_CATEGORIES },
    ];

    for (const scenario of scenarios) {
      await this.test(`Permissions - ${scenario.name}`, async () => {
        const { data } = await this.makeRequest("/api/query", {
          method: "POST",
          body: JSON.stringify({
            question: "Give me a financial summary",
            allowedCategories: scenario.categories,
          }),
        });

        if (data.status !== "success") {
          throw new Error("Permission scenario failed");
        }

        const usedCategories = data.categories_used || [];
        const invalidCategories = usedCategories.filter(
          (cat) => !scenario.categories.includes(cat)
        );
        if (invalidCategories.length > 0) {
          throw new Error(
            `Used unauthorized categories: ${invalidCategories.join(", ")}`
          );
        }
      });
    }
  }

  async runAllTests() {
    console.log("🚀 Starting Backend Endpoint Tests...\n");

    await this.testSystemHealth();
    await this.testQueryEndpoint();
    await this.testDashboardEndpoints();
    await this.testAnalyticsEndpoints();
    await this.testPermissionScenarios();

    console.log("\n📊 Test Results Summary:");
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(
      `📈 Success Rate: ${(
        (this.results.passed / (this.results.passed + this.results.failed)) *
        100
      ).toFixed(1)}%`
    );

    if (this.results.failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results.tests
        .filter((test) => test.status === "FAILED")
        .forEach((test) => console.log(`  - ${test.name}: ${test.error}`));
    }

    return this.results.failed === 0;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EndpointTester();
  tester
    .runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test runner failed:", error);
      process.exit(1);
    });
}

export default EndpointTester;
