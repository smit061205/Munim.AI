import express from "express";
import { healthCheck } from "../middleware/errorHandler.js";

const router = express.Router();

router.get("/health", healthCheck);

export default router;
