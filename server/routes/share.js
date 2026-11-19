import express from "express";
import { createHash, randomBytes } from "node:crypto";
import User from "../models/User.js";
import { ShareLink } from "../models/Planning.js";
import { ApiError } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { getOverview } from "../services/overviewService.js";
import { getTaxSummary } from "../services/taxService.js";

const router = express.Router();
const hash = (token) => createHash("sha256").update(token).digest("hex");
const MAX_LINKS = 5;

const publicLink = (link) => ({
  id: link._id,
  label: link.label,
  includeTax: link.include_tax,
  expiresAt: link.expires_at,
  views: link.views,
  lastViewedAt: link.last_viewed_at || null,
  createdAt: link.created_at,
});

// Anyone with the link can see this, so it holds totals and holdings, never
// transactions, account numbers or the assistant's conversations
router.get("/view/:token", async (req, res, next) => {
  try {
    const link = await ShareLink.findOneAndUpdate(
      { token_hash: hash(String(req.params.token)), expires_at: { $gt: new Date() } },
      { $inc: { views: 1 }, $set: { last_viewed_at: new Date() } },
      { new: true },
    );
    if (!link) throw new ApiError(404, "This link has expired or was turned off.");
    const user = await User.findById(link.user_id);
    if (!user) throw new ApiError(404, "This link has expired or was turned off.");

    const overview = await getOverview(user);
    const tax = link.include_tax ? await getTaxSummary(link.user_id).catch(() => null) : null;
    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        owner: user.firstName,
        label: link.label,
        expiresAt: link.expires_at,
        asOf: overview.asOf,
        netWorth: { value: overview.netWorth.value, grossAssets: overview.netWorth.grossAssets, history: overview.netWorth.history.map(({ date, value }) => ({ date, value })) },
        liabilities: { total: overview.liabilities.total, monthlyPayment: overview.liabilities.monthlyPayment },
        cash: overview.assets.cash,
        portfolio: {
          value: overview.portfolio.value,
          invested: overview.portfolio.invested,
          gain: overview.portfolio.gain,
          xirr: overview.portfolio.returns?.xirr ?? null,
          allocation: overview.portfolio.allocation,
          holdings: overview.portfolio.holdings.map((item) => ({ name: item.name, detail: item.detail, value: item.value, invested: item.invested, weight: item.weight })),
        },
        cashflow: { months: overview.cashflow.months, savingsRate: overview.cashflow.savingsRate },
        goals: overview.goals.map((goal) => ({ name: goal.name, target: goal.target_amount, saved: goal.saved_amount, status: goal.status })),
        tax: tax && {
          fy: tax.fy,
          capitalGains: { totals: tax.capitalGains.totals, tax: tax.capitalGains.tax, sales: tax.capitalGains.sales },
          deductions: { total80c: tax.deductions.total80c, items80c: tax.deductions.items80c, claimed: tax.deductions.claimed },
          regimes: { better: tax.regimes.better, saving: tax.regimes.saving, newTotal: tax.regimes.new.total, oldTotal: tax.regimes.old.total },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const links = await ShareLink.find({ user_id: req.auth.userId, expires_at: { $gt: new Date() } }).sort({ created_at: -1 });
    res.json({ success: true, data: links.map(publicLink) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const label = String(req.body.label || "").trim().slice(0, 60);
    if (!label) throw new ApiError(400, "Say who the link is for");
    const days = [7, 30, 90].includes(Number(req.body.days)) ? Number(req.body.days) : 30;
    const active = await ShareLink.countDocuments({ user_id: userId, expires_at: { $gt: new Date() } });
    if (active >= MAX_LINKS) throw new ApiError(400, `You can have ${MAX_LINKS} links at once. Turn one off first.`);

    const token = randomBytes(24).toString("base64url");
    const link = await ShareLink.create({
      user_id: userId,
      token_hash: hash(token),
      label,
      include_tax: !!req.body.includeTax,
      expires_at: new Date(Date.now() + days * 86400000),
    });
    // The token is only ever shown now
    res.status(201).json({ success: true, data: { ...publicLink(link), token } });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await ShareLink.deleteOne({ _id: req.params.id, user_id: req.auth.userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
