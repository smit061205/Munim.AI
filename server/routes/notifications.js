import express from "express";
import {
  clearNotifications,
  listNotifications,
  markRead,
  weeklyNote,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", listNotifications);
router.get("/weekly-note", weeklyNote);
router.post("/:id/read", markRead);
router.delete("/", clearNotifications);

export default router;
