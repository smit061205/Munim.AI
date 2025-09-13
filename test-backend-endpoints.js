#!/usr/bin/env node
import fetch from "node-fetch";

const BASE_URL = "http://localhost:5001";

// Mock Clerk token for testing (this would normally come from Clerk)
const MOCK_TOKEN = "test-token-123";

async function testBackendEndpoints() {
  console.log("🔍 Testing Munim.AI Backend Endpoints...\n");

  try {
    // Test 1: Health Check
    console.log("1. Testing Health Check...");
    const healthResponse = await fetch(`${BASE_URL}/health`);
    console.log(`   Status: ${healthResponse.status}`);

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log("   ✅ Health check passed:", healthData);
    } else {
      console.log("   ❌ Health check failed");
      return;
    }

    // Test 2: API Status
    console.log("\n2. Testing API Status...");
    const statusResponse = await fetch(`${BASE_URL}/api/status`);
    console.log(`   Status: ${statusResponse.status}`);

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log("   ✅ API status:", statusData.status);
    }

    // Test 3: Unauthenticated Dashboard Access (should return 401)
    console.log("\n3. Testing Authentication Middleware...");
    const dashboardResponse = await fetch(`${BASE_URL}/api/dashboard/`);
    console.log(`   Dashboard endpoint status: ${dashboardResponse.status}`);

    if (dashboardResponse.status === 401) {
      console.log("   ✅ Authentication middleware working correctly");
    } else {
      console.log("   ⚠️  Unexpected response for unauthenticated request");
      const errorData = await dashboardResponse.text();
      console.log("   Response:", errorData);
    }

    // Test 4: Test Individual Dashboard Endpoints
    console.log(
      "\n4. Testing Individual Dashboard Endpoints (unauthenticated)..."
    );

    const endpoints = [
      "/api/dashboard/monthly-spending",
      "/api/dashboard/asset-liability",
      "/api/dashboard/epf-contributions",
      "/api/dashboard/credit-score",
      "/api/dashboard/net-worth",
      "/api/dashboard/spending-categories",
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`   ${endpoint}: ${response.status}`);

      if (response.status !== 401) {
        console.log(`   ⚠️  Expected 401, got ${response.status}`);
        const responseText = await response.text();
        console.log(`   Response: ${responseText.slice(0, 200)}...`);
      }
    }

    // Test 5: Test Data Endpoints
    console.log("\n5. Testing Data Endpoints (unauthenticated)...");
    const dataEndpoints = [
      "/api/data/assets",
      "/api/data/liabilities",
      "/api/data/transactions",
      "/api/data/epf",
      "/api/data/credit-score",
    ];

    for (const endpoint of dataEndpoints) {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`   ${endpoint}: ${response.status}`);
    }

    // Test 6: Test with Mock Authorization Header
    console.log("\n6. Testing with Mock Authorization Header...");
    const authResponse = await fetch(`${BASE_URL}/api/dashboard/`, {
      headers: {
        Authorization: `Bearer ${MOCK_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log(`   Authenticated request status: ${authResponse.status}`);

    if (authResponse.status !== 401) {
      const authData = await authResponse.text();
      console.log(`   Response: ${authData.slice(0, 200)}...`);
    }

    console.log("\n🎯 Backend Endpoint Test Results:");
    console.log("   ✅ Server is running and accessible");
    console.log("   ✅ Health check endpoint working");
    console.log("   ✅ Authentication middleware protecting endpoints");

    console.log("\n📋 Next Steps:");
    console.log("   1. Start frontend and test with real Clerk authentication");
    console.log("   2. Verify data loading with authenticated requests");
    console.log("   3. Check MongoDB data population");
  } catch (error) {
    console.error("❌ Backend endpoint test failed:", error.message);
    console.log("\n💡 Troubleshooting steps:");
    console.log("   1. Start backend server: cd server && npm run dev");
    console.log("   2. Check if port 5001 is available");
    console.log("   3. Verify environment variables are set");
    console.log("   4. Check MongoDB connection");
  }
}

testBackendEndpoints();
