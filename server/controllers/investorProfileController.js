import User from "../models/User.js";
import { ApiError } from "../middleware/errorHandler.js";
import { toPublicUser } from "./authController.js";
import {
  QUESTIONNAIRE_VERSION,
  assessAnswers,
  getQuestions,
  validateAnswers,
} from "../services/investorProfileService.js";

// @desc    Get the investor questionnaire
// @route   GET /api/investor-profile/questions
// @access  Private
export const getQuestionnaire = (req, res) => {
  res.json({ success: true, ...getQuestions() });
};

// @desc    Submit questionnaire answers and save the resulting risk profile
// @route   PUT /api/investor-profile
// @access  Private
export const saveInvestorProfile = async (req, res, next) => {
  try {
    const { answers } = req.body;

    const problems = validateAnswers(answers);
    if (problems.length > 0) {
      throw new ApiError(400, problems.join(". "));
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      throw new ApiError(401, "Account not found");
    }

    user.investorProfile = {
      ...assessAnswers(answers),
      answers,
      version: QUESTIONNAIRE_VERSION,
      completedAt: new Date(),
    };
    await user.save();

    res.json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};
