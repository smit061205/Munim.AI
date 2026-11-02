import express from "express";
import {
  getQuestionnaire,
  saveInvestorProfile,
} from "../controllers/investorProfileController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

// GET /api/investor-profile/questions - Get the investor questionnaire
router.get("/questions", getQuestionnaire);

// PUT /api/investor-profile - Submit answers and save the risk profile
router.put("/", saveInvestorProfile);

export default router;
