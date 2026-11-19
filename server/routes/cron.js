import express from "express";
import { runJobs } from "../services/notificationService.js";

const router = express.Router();

// Vercel Cron calls this once a day, sending CRON_SECRET as a bearer token
router.get("/daily", async (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.get("authorization") !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Not allowed" });
  }
  try {
    // Leave headroom under the function's 60 second limit
    const result = await runJobs({ budgetMs: 45 * 1000, anyHour: true });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
