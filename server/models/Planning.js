import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  target_amount: { type: Number, required: true },
  saved_amount: { type: Number, default: 0 },
  target_date: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

// A daily record of net worth, so history is real rather than reconstructed
const netWorthSnapshotSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  date: { type: String, required: true }, // yyyy-mm-dd
  value: { type: Number, required: true },
});
netWorthSnapshotSchema.index({ user_id: 1, date: 1 }, { unique: true });

const Goal = mongoose.model("Goal", goalSchema);
const NetWorthSnapshot = mongoose.model(
  "NetWorthSnapshot",
  netWorthSnapshotSchema,
);

export { Goal, NetWorthSnapshot };
