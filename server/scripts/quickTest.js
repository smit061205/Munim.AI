import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:5001";

async function testServerConnectivity() {
  console.log("🔍 Testing Backend Server Connectivity...\n");

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

    // Test 2: Unauthenticated Dashboard Access (should return 401)
    console.log("\n2. Testing Unauthenticated Dashboard Access...");
    const dashboardResponse = await fetch(`${BASE_URL}/api/dashboard/complete`);
    console.log(`   Status: ${dashboardResponse.status}`);

    if (dashboardResponse.status === 401) {
      console.log(
        "   ✅ Authentication middleware working correctly (401 for unauthenticated)"
      );
    } else {
      console.log("   ⚠️  Expected 401 for unauthenticated request");
    }

    // Test 3: Test with Mock Clerk Token
    console.log("\n3. Testing with Mock Authentication...");
    const mockAuthResponse = await fetch(`${BASE_URL}/api/dashboard/complete`, {
      headers: {
        Authorization: "Bearer mock-token",
        "Content-Type": "application/json",
      },
    });
    console.log(`   Status: ${mockAuthResponse.status}`);

    if (mockAuthResponse.status === 401) {
      console.log("   ✅ Invalid token properly rejected");
    } else if (mockAuthResponse.status === 500) {
      console.log("   ⚠️  Server error - may need to check backend logs");
    }

    console.log("\n🎯 Server Connectivity Test Complete!");
  } catch (error) {
    console.error("❌ Server connectivity test failed:", error.message);
    console.log("\n💡 Possible issues:");
    console.log(
      "   - Backend server not running (try: npm run dev in server directory)"
    );
    console.log("   - Port 5001 not accessible");
    console.log("   - Network connectivity issues");
  }
}

testServerConnectivity();
