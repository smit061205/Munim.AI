import mongoose from "mongoose";
import User from "../models/User.js";
import {
  Asset,
  Liability,
  Transaction,
  EPF,
  CreditScore,
  Investment,
  Budget,
} from "../models/Financial.js";

import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/munim_ai";

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const oldId = "user_32eIuzzFAAlZ1JzWbY3Cp7ZBSzr";
    const newId = "user_32dTvEx6MFVPV48xQI7evNjRgGB";

    console.log(`Updating data from ${oldId} to ${newId}...`);

    await User.updateMany({ clerkId: oldId }, { $set: { clerkId: newId } });

    const models = [
      Asset,
      Liability,
      Transaction,
      EPF,
      CreditScore,
      Investment,
      Budget,
    ];
    for (const model of models) {
      await model.updateMany(
        { clerkId: oldId },
        { $set: { clerkId: newId, user_id: newId } },
      );
    }

    console.log("Successfully linked mock data to your account!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
