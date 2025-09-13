import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const clearDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      `📊 Found ${collections.length} collections:`,
      collections.map((c) => c.name)
    );

    // Clear each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`🗑️  Clearing collection: ${collectionName}`);

      const result = await mongoose.connection.db
        .collection(collectionName)
        .deleteMany({});
      console.log(
        `✅ Deleted ${result.deletedCount} documents from ${collectionName}`
      );
    }

    // Optionally drop all collections entirely
    console.log("\n🔥 Dropping all collections...");
    for (const collection of collections) {
      const collectionName = collection.name;
      try {
        await mongoose.connection.db.collection(collectionName).drop();
        console.log(`✅ Dropped collection: ${collectionName}`);
      } catch (error) {
        if (error.message.includes("ns not found")) {
          console.log(`⚠️  Collection ${collectionName} already dropped`);
        } else {
          console.error(`❌ Error dropping ${collectionName}:`, error.message);
        }
      }
    }

    console.log("\n🎉 Database cleared successfully!");
    console.log("📝 All mock data has been removed from MongoDB");
    console.log("🚀 You can now start fresh with real data");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
    process.exit(0);
  }
};

// Run the script
clearDatabase();
