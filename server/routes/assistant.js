import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import {
  decideAction,
  deleteConversation,
  deleteMemory,
  getAssistantUsage,
  getConversation,
  listConversations,
  listMemories,
  regenerateMessage,
  renameConversation,
  sendMessage,
  setFeedback,
} from "../controllers/assistantController.js";
import { getLimits, isUnlimited } from "../services/assistantService.js";

const router = express.Router();

const SPREADSHEET_NAME = /\.(xlsx|xls|csv)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, callback) => {
    callback(null, SPREADSHEET_NAME.test(file.originalname));
  },
});

// Stops a burst of messages; the daily and monthly limits cover the long run
const burstLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: () => getLimits().perMinuteMessages,
  keyGenerator: (req) => req.auth.userId,
  skip: (req) => isUnlimited(req.auth.userId),
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "You're sending messages quickly. Wait a moment and try again.",
  },
});

router.get("/usage", getAssistantUsage);
router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.patch("/conversations/:id", renameConversation);
router.delete("/conversations/:id", deleteConversation);
router.post("/messages", burstLimiter, upload.array("files"), sendMessage);
router.post("/messages/:id/regenerate", burstLimiter, regenerateMessage);
router.post("/messages/:id/feedback", setFeedback);
router.post("/messages/:id/actions/:actionId", decideAction);
router.get("/memory", listMemories);
router.delete("/memory/:id", deleteMemory);

export default router;
