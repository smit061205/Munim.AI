import mongoose from 'mongoose';

const investorProfileSchema = new mongoose.Schema({
  answers: {
    type: Map,
    of: String
  },
  riskProfile: {
    type: String,
    enum: ['conservative', 'moderately_conservative', 'balanced', 'growth', 'aggressive']
  },
  riskLabel: String,
  description: String,
  allocation: {
    equity: Number,
    debt: Number,
    gold: Number
  },
  score: Number,
  maxScore: Number,
  capReasons: [String],
  version: Number,
  completedAt: Date
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    select: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    default: ''
  },
  profileImage: {
    type: String
  },
  phone: {
    type: String
  },
  preferences: {
    dateFormat: {
      type: String,
      enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
      default: "DD/MM/YYYY"
    },
    insights: {
      budgets: { type: Boolean, default: true },
      allocation: { type: Boolean, default: true },
      safety: { type: Boolean, default: true }
    },
    // Weekly summary by email, sent on Monday mornings
    weeklyDigest: { type: Boolean, default: true },
    // "auto" answers in the language the user writes in
    assistantLanguage: {
      type: String,
      enum: ["auto", "en", "hi", "hinglish"],
      default: "auto"
    },
    checklistHidden: { type: Boolean, default: false }
  },
  digestSentWeek: String,
  hasSampleData: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  investorProfile: {
    type: investorProfileSchema
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
