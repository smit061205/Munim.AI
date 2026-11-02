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

// Life and health cover, for the cover check, 80C/80D and renewal reminders
const insuranceSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  kind: { type: String, enum: ["term", "health", "life", "other"], required: true },
  name: { type: String, required: true },
  insurer: String,
  cover: { type: Number, default: 0 },
  premium: { type: Number, default: 0 },
  // How often the premium is paid
  frequency: { type: String, enum: ["monthly", "quarterly", "yearly"], default: "yearly" },
  renewal_date: String, // yyyy-mm-dd, the next premium date
  // Health cover for parents has its own 80D limit
  for_parents: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// A payment the user wants reminding about. EMIs, SIPs and insurance renewals
// are worked out from their own records, so they are not stored here.
const billSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  amount: { type: Number, default: 0 },
  category: { type: String, default: "Bills" },
  frequency: { type: String, enum: ["monthly", "quarterly", "yearly"], default: "monthly" },
  due_day: { type: Number, min: 1, max: 31, required: true },
  // For quarterly and yearly bills: the month (1-12) of the next payment
  due_month: { type: Number, min: 1, max: 12 },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

// "Anything with 'swiggy' in it is Dining". Applied on import and when adding.
const categoryRuleSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  match: { type: String, required: true }, // lower case, matched as a substring
  category: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

// The assistant's weekly note on the home page, one per user per week
const aiNoteSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  week: { type: String, required: true }, // "2026-W45"
  text: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});
aiNoteSchema.index({ user_id: 1, week: 1 }, { unique: true });

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  // Stops the same reminder being created twice, e.g. "bill:<id>:2026-11"
  key: { type: String, required: true },
  kind: {
    type: String,
    enum: ["bill", "goal", "budget", "activity", "security", "price", "digest"],
    required: true,
  },
  title: { type: String, required: true },
  body: String,
  href: String,
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});
notificationSchema.index({ user_id: 1, key: 1 }, { unique: true });
notificationSchema.index({ user_id: 1, created_at: -1 });

// Two people sharing a summary of their money with each other. Sharing only
// starts once the invited person accepts, and either side can end it.
const householdLinkSchema = new mongoose.Schema({
  owner_id: { type: String, required: true, index: true },
  member_email: { type: String, required: true, lowercase: true, trim: true },
  member_id: { type: String, index: true },
  relation: { type: String, default: "Family" },
  status: { type: String, enum: ["pending", "accepted"], default: "pending" },
  created_at: { type: Date, default: Date.now },
});

// What the user tells us for the tax estimate, per financial year ("2026-27").
// Everything else (EPF, ELSS, premiums, home loan) is worked out from records.
const taxProfileSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  fy: { type: String, required: true },
  salary: Number, // gross yearly salary; estimated from income when not set
  other_income: { type: Number, default: 0 },
  hra_exemption: { type: Number, default: 0 },
  // 80C items the app can't see: PPF deposits, tuition fees, and so on
  extra_80c: { type: Number, default: 0 },
  nps_80ccd1b: { type: Number, default: 0 },
  self_senior: { type: Boolean, default: false },
  parents_senior: { type: Boolean, default: true },
  updated_at: { type: Date, default: Date.now },
});
taxProfileSchema.index({ user_id: 1, fy: 1 }, { unique: true });

const Goal = mongoose.model("Goal", goalSchema);
const NetWorthSnapshot = mongoose.model(
  "NetWorthSnapshot",
  netWorthSnapshotSchema,
);
const Insurance = mongoose.model("Insurance", insuranceSchema);
const Bill = mongoose.model("Bill", billSchema);
const CategoryRule = mongoose.model("CategoryRule", categoryRuleSchema);
const AiNote = mongoose.model("AiNote", aiNoteSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const HouseholdLink = mongoose.model("HouseholdLink", householdLinkSchema);
const TaxProfile = mongoose.model("TaxProfile", taxProfileSchema);

export {
  Goal,
  NetWorthSnapshot,
  Insurance,
  Bill,
  CategoryRule,
  AiNote,
  Notification,
  HouseholdLink,
  TaxProfile,
};
