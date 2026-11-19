import express from "express";
import { Feedback } from "../models/Planning.js";
import { ApiError } from "../middleware/errorHandler.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const message = String(req.body.message || "").trim().slice(0, 2000);
    if (message.length < 5) throw new ApiError(400, "Write a little more so we can act on it");
    const kind = ["idea", "problem", "question"].includes(req.body.kind) ? req.body.kind : "idea";
    await Feedback.create({ user_id: req.auth.userId, kind, message, page: String(req.body.page || "").slice(0, 100) });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
