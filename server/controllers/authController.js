import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import { signToken } from "../middleware/auth.js";
import UserPermissions from "../models/UserPermissions.js";
import {
  clearFinancialData,
  hasFinancialData,
  loadSampleData,
} from "../services/seedService.js";
import {
  QUESTIONNAIRE_VERSION,
  assessAnswers,
} from "../services/investorProfileService.js";
import { clearAssistantData } from "./assistantController.js";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything past 72 bytes
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compared against when the email is unknown, so a failed sign-in takes the
// same time whether or not the account exists
const DUMMY_HASH = bcrypt.hashSync("munim-dummy-password", BCRYPT_ROUNDS);

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

// The shape of a user that is safe to send to the client
export const toPublicUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone || "",
  role: user.role,
  createdAt: user.createdAt,
  preferences: user.preferences,
  hasSampleData: !!user.hasSampleData,
  investorProfile: user.investorProfile?.riskProfile
    ? user.investorProfile
    : null,
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (typeof firstName !== "string" || !firstName.trim()) {
      throw new ApiError(400, "First name is required");
    }
    if (lastName !== undefined && typeof lastName !== "string") {
      throw new ApiError(400, "Last name must be text");
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new ApiError(400, "Please enter a valid email address");
    }
    if (
      typeof password !== "string" ||
      password.length < MIN_PASSWORD_LENGTH
    ) {
      throw new ApiError(
        400,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }
    if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
      throw new ApiError(
        400,
        `Password must be at most ${MAX_PASSWORD_BYTES} characters`,
      );
    }

    if (await User.exists({ email })) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user;
    try {
      user = await User.create({
        email,
        passwordHash,
        firstName: firstName.trim(),
        lastName: (lastName || "").trim(),
      });
    } catch (error) {
      // Two sign-ups racing on the same email
      if (error.code === 11000) {
        throw new ApiError(409, "An account with this email already exists");
      }
      throw error;
    }

    const userId = user._id.toString();
    await UserPermissions.getUserPermissions(userId);

    res.status(201).json({
      success: true,
      token: signToken(userId),
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || typeof password !== "string" || !password) {
      throw new ApiError(400, "Please provide email and password");
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    const isMatch = await bcrypt.compare(
      password,
      user?.passwordHash || DUMMY_HASH,
    );

    if (!user?.passwordHash || !isMatch) {
      throw new ApiError(401, "Incorrect email or password");
    }

    res.status(200).json({
      success: true,
      token: signToken(user._id.toString()),
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const DEMO_EMAIL = "demo@munim.local";
const DEMO_ANSWERS = {
  goal: "wealth",
  horizon: "over_10y",
  age: "25_34",
  income: "10_25l",
  monthlySurplus: "15_50k",
  emergencyFund: "3_6m",
  emiBurden: "20_40",
  experience: "funds",
  drawdownReaction: "hold",
  returnRange: "wide",
};

// Off unless DEMO_ACCOUNT=true, and never in production, since anyone who
// can reach the API could sign in as the demo user
export const isDemoEnabled = () =>
  process.env.DEMO_ACCOUNT === "true" &&
  process.env.NODE_ENV !== "production";

// @desc    Sign in to a shared demo account with sample data, for local testing
// @route   POST /api/auth/demo
// @access  Public, development only
export const signInDemo = async (req, res, next) => {
  try {
    if (!isDemoEnabled()) {
      throw new ApiError(404, "The demo account is turned off");
    }

    // The demo user has no password, so it can only be reached from here
    const user = await User.findOneAndUpdate(
      { email: DEMO_EMAIL },
      { $setOnInsert: { email: DEMO_EMAIL, firstName: "Demo", lastName: "User" } },
      { upsert: true, new: true },
    );
    const userId = user._id.toString();

    if (!user.investorProfile?.riskProfile) {
      user.investorProfile = {
        ...assessAnswers(DEMO_ANSWERS),
        answers: DEMO_ANSWERS,
        version: QUESTIONNAIRE_VERSION,
        completedAt: new Date(),
      };
    }
    if (!(await hasFinancialData(userId))) {
      await loadSampleData(userId);
      user.hasSampleData = true;
    }
    await user.save();
    await UserPermissions.getUserPermissions(userId);

    res.json({
      success: true,
      token: signToken(userId),
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the signed-in user
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      throw new ApiError(401, "Account not found");
    }

    res.json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update name, phone and preferences
// @route   PATCH /api/auth/me
// @access  Private
export const updateCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      throw new ApiError(401, "Account not found");
    }

    const { firstName, lastName, phone, preferences } = req.body;
    if (firstName !== undefined) {
      if (typeof firstName !== "string" || !firstName.trim()) {
        throw new ApiError(400, "First name is required");
      }
      user.firstName = firstName.trim();
    }
    if (typeof lastName === "string") user.lastName = lastName.trim();
    if (typeof phone === "string") user.phone = phone.trim();
    if (preferences?.dateFormat) {
      user.preferences.dateFormat = preferences.dateFormat;
    }
    for (const key of ["budgets", "allocation", "safety"]) {
      if (typeof preferences?.insights?.[key] === "boolean") {
        user.preferences.insights[key] = preferences.insights[key];
      }
    }

    await user.save();
    res.json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

const assertPassword = async (user, password) => {
  const isMatch =
    typeof password === "string" &&
    !!user.passwordHash &&
    (await bcrypt.compare(password, user.passwordHash));
  if (!isMatch) {
    throw new ApiError(401, "Your current password is incorrect");
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.auth.userId).select("+passwordHash");
    if (!user) {
      throw new ApiError(401, "Account not found");
    }
    await assertPassword(user, currentPassword);

    if (
      typeof newPassword !== "string" ||
      newPassword.length < MIN_PASSWORD_LENGTH ||
      Buffer.byteLength(newPassword) > MAX_PASSWORD_BYTES
    ) {
      throw new ApiError(
        400,
        `New password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_BYTES} characters`,
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.save();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete the account and everything stored for it
// @route   DELETE /api/auth/me
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId).select("+passwordHash");
    if (!user) {
      throw new ApiError(401, "Account not found");
    }
    await assertPassword(user, req.body.password);

    const userId = user._id.toString();
    await Promise.all([
      clearFinancialData(userId),
      clearAssistantData(userId),
      UserPermissions.deleteOne({ user_id: userId }),
    ]);
    await user.deleteOne();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
