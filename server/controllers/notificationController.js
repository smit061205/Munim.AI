import mongoose from "mongoose";
import User from "../models/User.js";
import { Notification } from "../models/Planning.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getWeeklyNote, syncNotifications } from "../services/notificationService.js";

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

const SYNC_EVERY_MS = 60 * 60 * 1000;
const lastSync = new Map();

const currentUser = async (req) => {
  const user = await User.findById(req.auth.userId);
  if (!user) throw new ApiError(401, "Account not found");
  return user;
};

// Reminders are refreshed at most hourly when the bell is opened, so they
// appear without waiting for the daily job
export const listNotifications = handle(async (req, res) => {
  const userId = req.auth.userId;
  if (Date.now() - (lastSync.get(userId) || 0) > SYNC_EVERY_MS) {
    lastSync.set(userId, Date.now());
    await syncNotifications(await currentUser(req)).catch((error) =>
      console.warn("Notification sync failed:", error.message),
    );
  }
  const items = await Notification.find({ user_id: userId }).sort({ created_at: -1 }).limit(50).lean();
  res.json({
    success: true,
    data: items.map(({ _id, kind, title, body, href, read, created_at }) => ({ id: _id, kind, title, body, href, read, created_at })),
    unread: items.filter((item) => !item.read).length,
  });
});

// Marks one notification read, or all of them with id "all"
export const markRead = handle(async (req, res) => {
  const filter = { user_id: req.auth.userId };
  if (req.params.id !== "all") {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Notification not found");
    filter._id = req.params.id;
  }
  await Notification.updateMany(filter, { read: true });
  res.json({ success: true });
});

export const clearNotifications = handle(async (req, res) => {
  // Read ones are kept as tombstones so the same reminder isn't created again
  await Notification.updateMany({ user_id: req.auth.userId }, { read: true });
  res.json({ success: true });
});

export const weeklyNote = handle(async (req, res) => {
  const note = await getWeeklyNote(await currentUser(req)).catch((error) => {
    console.warn("Weekly note failed:", error.message);
    return null;
  });
  res.json({ success: true, data: note });
});
