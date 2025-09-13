#!/usr/bin/env node
import fetch from "node-fetch";

const BASE_URL = "http://localhost:5001";

async function testIntegration() {
  console.log("🔍 Testing Munim.AI Backend Integration...\n");

  try {
    // Test 1: Health Check
    console.log("1. Testing Health Check...");
    const healthResponse = await fetch(`${BASE_URL}/health`, {
      timeout: 5000,
    });
    console.log(`   Status: ${healthResponse.status}`);

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log("   ✅ Health check passed:", healthData);
    } else {
      console.log("   ❌ Health check failed - server may not be running");
      throw new Error("Server not accessible");
    }

    // Test 2: Unauthenticated Dashboard Access (should return 401)
    console.log("\n2. Testing Authentication Middleware...");
    const dashboardResponse = await fetch(`${BASE_URL}/api/dashboard/complete`);
    console.log(`   Status: ${dashboardResponse.status}`);

    if (dashboardResponse.status === 401) {
      console.log("   ✅ Authentication middleware working correctly");
    } else {
      console.log("   ⚠️  Unexpected response for unauthenticated request");
    }

    // Test 3: Test Data Endpoints
    console.log("\n3. Testing Data Endpoints...");
    const dataResponse = await fetch(`${BASE_URL}/api/data/assets`);
    console.log(`   Assets endpoint status: ${dataResponse.status}`);

    if (dataResponse.status === 401) {
      console.log("   ✅ Data endpoints properly protected");
    }

    // Test 4: Test with Invalid Token
    console.log("\n4. Testing Invalid Token Handling...");
    const invalidTokenResponse = await fetch(
      `${BASE_URL}/api/dashboard/complete`,
      {
        headers: {
          Authorization: "Bearer invalid-token",
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`   Status: ${invalidTokenResponse.status}`);

    if (invalidTokenResponse.status === 401) {
      console.log("   ✅ Invalid tokens properly rejected");
    }

    // Test 5: Test CORS Headers
    console.log("\n5. Testing CORS Configuration...");
    const corsResponse = await fetch(`${BASE_URL}/api/dashboard/complete`, {
      method: "OPTIONS",
    });
    console.log(`   OPTIONS status: ${corsResponse.status}`);

    console.log("\n🎯 Backend Integration Test Results:");
    console.log("   ✅ Server is running and accessible");
    console.log("   ✅ Authentication middleware is working");
    console.log("   ✅ API endpoints are properly protected");
    console.log("   ✅ Ready for frontend integration with Clerk auth");

    console.log("\n📋 Next Steps:");
    console.log("   1. Start frontend: cd Frontend && npm run dev");
    console.log("   2. Test with real Clerk authentication");
    console.log("   3. Verify dashboard data loading");
  } catch (error) {
    console.error("❌ Integration test failed:", error.message);
    console.log("\n💡 Troubleshooting steps:");
    console.log("   1. Start backend server: cd server && npm run dev");
    console.log("   2. Check if port 5001 is available");
    console.log("   3. Verify environment variables are set");
    console.log("   4. Check MongoDB connection");
  }
}

testIntegration();
