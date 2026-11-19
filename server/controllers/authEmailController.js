import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import { appUrl, escapeHtml, layout, sendEmail } from "../services/emailService.js";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

// Links in emails carry a signed token. A reset token is also signed with the
// current password hash, so it stops working once the password changes and
// can only be used once.
const secretFor = (purpose, user) =>
  `${process.env.JWT_SECRET}:${purpose}:${purpose === "reset" ? user.passwordHash : user.email}`;

const makeToken = (purpose, user, expiresIn) =>
  jwt.sign({ sub: user._id.toString(), purpose }, secretFor(purpose, user), { expiresIn, algorithm: "HS256" });

const readToken = async (purpose, token) => {
  const decoded = typeof token === "string" ? jwt.decode(token) : null;
  if (!decoded?.sub || decoded.purpose !== purpose) throw new ApiError(400, "This link isn't valid. Ask for a new one.");
  const user = await User.findById(decoded.sub).select("+passwordHash");
  if (!user) throw new ApiError(400, "This link isn't valid. Ask for a new one.");
  try {
    jwt.verify(token, secretFor(purpose, user), { algorithms: ["HS256"] });
  } catch {
    throw new ApiError(400, "This link has expired or was already used. Ask for a new one.");
  }
  return user;
};

export const sendVerificationEmail = async (user) => {
  const link = appUrl(`/verify-email?token=${makeToken("verify", user, "3d")}`);
  await sendEmail({
    to: user.email,
    subject: "Confirm your email for Munim.AI",
    html: layout({
      heading: `Confirm your email, ${escapeHtml(user.firstName)}`,
      paragraphs: ["Confirm this address so Munim can send your weekly summary and reminders. The link works for three days."],
      button: { label: "Confirm email", href: link },
    }),
    text: `Confirm your email for Munim.AI: ${link}`,
  });
};

// @route POST /api/auth/forgot-password
// Always answers the same way, so it can't be used to find out who has an account
export const forgotPassword = async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const user = email ? await User.findOne({ email }).select("+passwordHash") : null;
    if (user?.passwordHash && email !== "demo@munim.local") {
      const link = appUrl(`/reset-password?token=${makeToken("reset", user, "1h")}`);
      await sendEmail({
        to: user.email,
        subject: "Reset your Munim.AI password",
        html: layout({
          heading: "Reset your password",
          paragraphs: [
            "Someone asked to reset the password for this account. If that was you, choose a new one below. The link works for an hour.",
            "If it wasn't you, ignore this email. Your password stays as it is.",
          ],
          button: { label: "Choose a new password", href: link },
        }),
        text: `Reset your Munim.AI password: ${link}`,
      }).catch((error) => console.error("Reset email failed:", error.message));
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
      throw new ApiError(400, `Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_BYTES} characters`);
    }
    const user = await readToken("reset", token);
    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // Opening the link proves they own the address
    user.emailVerified = true;
    await user.save();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/verify-email
export const verifyEmail = async (req, res, next) => {
  try {
    const user = await readToken("verify", req.body.token);
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/resend-verification
export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) throw new ApiError(401, "Account not found");
    if (!user.emailVerified) await sendVerificationEmail(user);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
