import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import {
  getInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  importStatement,
  previewStatement,
} from "../controllers/investmentController.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

const MAX_STATEMENT_MB = 15;

const statementUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_STATEMENT_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    callback(null, /\.pdf$/i.test(file.originalname));
  },
}).single("statement");

const acceptStatement = (req, res, next) =>
  statementUpload(req, res, (error) =>
    next(
      error instanceof multer.MulterError
        ? new ApiError(400, `Statements can be up to ${MAX_STATEMENT_MB} MB`)
        : error,
    ),
  );

// Password guessing against a statement is the risk here
const statementLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.auth.userId,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Wait a minute and try again.",
  },
});

// Statement import. These come before the /:type routes.
router.post("/statement/preview", statementLimiter, acceptStatement, previewStatement);
router.post("/statement/import", importStatement);

// GET /api/investment - Get all investments for user
router.get("/", getInvestments);

// POST /api/investment - Create new investment
router.post("/", createInvestment);

// PUT /api/investment/:type/:investmentId - Update investment
router.put("/:type/:investmentId", updateInvestment);

// DELETE /api/investment/:type/:investmentId - Delete investment
router.delete("/:type/:investmentId", deleteInvestment);

export default router;
