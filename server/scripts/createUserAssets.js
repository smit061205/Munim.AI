import dotenv from "dotenv";
import mongoose from "mongoose";
import { Asset } from "../models/Financial.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

async function createUserAssets(clerkId) {
  try {
    console.log(`🏦 Creating assets data for user: ${clerkId}`);

    // Check if user already has assets
    const existingAssets = await Asset.findOne({ clerkId });
    if (existingAssets) {
      console.log(`⚠️ User ${clerkId} already has assets data. Updating...`);
      await Asset.deleteOne({ clerkId });
    }

    // Create sample assets data
    const sampleAssets = {
      user_id: clerkId, // Keep for compatibility
      clerkId: clerkId, // Primary field for queries
      total_value: 1250000,
      bank_accounts: [
        {
          id: "ba_user_1",
          type: "savings",
          bank_name: "HDFC Bank",
          balance: 150000,
          account_number: "1234567890",
        },
        {
          id: "ba_user_2",
          type: "current",
          bank_name: "ICICI Bank",
          balance: 75000,
          account_number: "0987654321",
        },
      ],
      real_estate: [
        {
          id: "re_user_1",
          type: "residential",
          current_value: 950000,
          address: "Mumbai, Maharashtra",
          purchase_date: new Date("2020-01-15"),
        },
      ],
      vehicles: [
        {
          id: "v_user_1",
          type: "car",
          current_value: 75000,
          make: "Maruti Suzuki",
          model: "Swift",
          year: 2019,
        },
      ],
    };

    // Insert the assets data
    const newAssets = new Asset(sampleAssets);
    await newAssets.save();

    console.log(`✅ Successfully created assets data for user ${clerkId}`);
    console.log(
      `💰 Total assets value: ₹${sampleAssets.total_value.toLocaleString()}`
    );
    console.log(`🏦 Bank accounts: ${sampleAssets.bank_accounts.length}`);
    console.log(`🏠 Real estate: ${sampleAssets.real_estate.length}`);
    console.log(`🚗 Vehicles: ${sampleAssets.vehicles.length}`);

    return newAssets;
  } catch (error) {
    console.error("❌ Error creating user assets:", error);
    throw error;
  }
}

// Get clerkId from command line argument or use default
const clerkId = process.argv[2] || "user_2pNbWJbJqKnLBNgBzqzTOJLdCqZ"; // Default test user

console.log(`🚀 Starting assets creation for user: ${clerkId}`);

// Run the script
connectToMongoDB()
  .then(() => createUserAssets(clerkId))
  .then(() => {
    console.log("🎉 Assets creation completed successfully");
  })
  .catch((error) => {
    console.error("💥 Assets creation failed:", error);
  })
  .finally(() => {
    console.log("🔌 Disconnecting from MongoDB");
    mongoose.disconnect();
  });
