import express from "express";
import User from "../models/User.js";
import { Transaction } from "../models/Financial.js";
import { Feedback, ShareLink } from "../models/Planning.js";
import { ApiError } from "../middleware/errorHandler.js";

const router = express.Router();

// Only accounts with role "admin" get past here. Set it in the database.
router.use(async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId).select("role");
    if (user?.role !== "admin") throw new ApiError(403, "Admins only");
    next();
  } catch (error) {
    next(error);
  }
});

const daysAgo = (days) => new Date(Date.now() - days * 86400000);

router.get("/stats", async (req, res, next) => {
  try {
    const [total, verified, withProfile, sample, last7, last30, withTransactions, feedbackNew, shareLinks, signups] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ investorProfile: { $exists: true } }),
      User.countDocuments({ hasSampleData: true }),
      User.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
      User.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
      Transaction.countDocuments({ "transactions.0": { $exists: true } }),
      Feedback.countDocuments({ status: "new" }),
      ShareLink.countDocuments({ expires_at: { $gt: new Date() } }),
      User.aggregate([
        { $match: { createdAt: { $gte: daysAgo(30) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({
      success: true,
      data: {
        users: { total, verified, withProfile, sample, last7, last30, withTransactions },
        feedbackNew,
        shareLinks,
        signups: signups.map((row) => ({ date: row._id, count: row.count })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/feedback", async (req, res, next) => {
  try {
    const rows = await Feedback.find().sort({ created_at: -1 }).limit(100).lean();
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.patch("/feedback/:id", async (req, res, next) => {
  try {
    const status = ["new", "seen", "done"].includes(req.body.status) ? req.body.status : "seen";
    await Feedback.updateOne({ _id: req.params.id }, { $set: { status } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
