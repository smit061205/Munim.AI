import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// One-time migration for databases created while Clerk handled authentication.
// Safe to run more than once. Take a backup first.
//
// 1. Re-keys each user's financial data from their Clerk ID to their User _id
// 2. Moves UserPermissions from clerkId to user_id
// 3. Drops the unique clerkId indexes (they reject a second user without one)
// 4. Removes the clerkId field everywhere
// 5. Allows an EPF record without a UAN, and repairs older imported transactions

const MONGODB_URI = process.env.MONGODB_URI;

const FINANCIAL_COLLECTIONS = [
  "assets",
  "liabilities",
  "transactions",
  "epfs",
  "creditscores",
  "investments",
  "budgets",
];
const DATA_COLLECTIONS = [...FINANCIAL_COLLECTIONS, "userpermissions"];

const dropClerkIndex = async (db, name) => {
  const collection = db.collection(name);
  const indexes = await collection.indexes().catch(() => []);

  for (const index of indexes) {
    if (index.key.clerkId) {
      await collection.dropIndex(index.name);
      console.log(`  Dropped index ${name}.${index.name}`);
    }
  }
};

const run = async () => {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Migrating database "${db.databaseName}"...`);

  // Must happen first: unsetting clerkId on two documents would otherwise
  // collide on the unique index
  console.log("Dropping clerkId indexes...");
  await dropClerkIndex(db, "users");
  await dropClerkIndex(db, "userpermissions");
  await db
    .collection("epfs")
    .dropIndex("uan_1")
    .catch(() => {});

  console.log("Re-keying user data...");
  const users = await db
    .collection("users")
    .find({ clerkId: { $exists: true } })
    .toArray();

  for (const user of users) {
    const userId = user._id.toString();
    for (const name of DATA_COLLECTIONS) {
      await db
        .collection(name)
        .updateMany(
          { $or: [{ clerkId: user.clerkId }, { user_id: user.clerkId }] },
          { $set: { user_id: userId } },
        );
    }
  }
  console.log(`  Re-keyed data for ${users.length} users`);

  // Permissions for IDs with no User document keep their ID as user_id
  await db
    .collection("userpermissions")
    .updateMany({ clerkId: { $exists: true }, user_id: { $exists: false } }, [
      { $set: { user_id: "$clerkId" } },
    ]);

  console.log("Removing clerkId fields...");
  for (const name of ["users", ...DATA_COLLECTIONS]) {
    const { modifiedCount } = await db
      .collection(name)
      .updateMany(
        { clerkId: { $exists: true } },
        { $unset: { clerkId: "" } },
      );
    console.log(`  ${name}: ${modifiedCount} updated`);
  }

  await db
    .collection("userpermissions")
    .createIndex({ user_id: 1 }, { unique: true });

  // Older spreadsheet imports stored spending as positive rows without an id,
  // which can't be edited and would count the wrong way
  const transactionDocs = await db.collection("transactions").find().toArray();
  for (const doc of transactionDocs) {
    const transactions = (doc.transactions || []).map((item) => ({
      ...item,
      id: item.id || randomUUID(),
      amount:
        item.type === "expense" ? -Math.abs(item.amount) : item.amount,
    }));
    await db
      .collection("transactions")
      .updateOne({ _id: doc._id }, { $set: { transactions } });
  }

  const withoutPassword = await db
    .collection("users")
    .countDocuments({ passwordHash: { $exists: false } });
  if (withoutPassword > 0) {
    console.log(
      `\n${withoutPassword} users have no password: Clerk passwords cannot be migrated, so they cannot sign in until they are given one.`,
    );
  }

  console.log("\nMigration complete");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
