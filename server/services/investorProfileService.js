// Investor suitability questionnaire. This is the single source of truth: the
// frontend renders whatever GET /api/investor-profile/questions returns, and
// answers are validated and scored here so a client cannot pick its own result.
// Bump QUESTIONNAIRE_VERSION whenever questions or scoring change.
export const QUESTIONNAIRE_VERSION = 1;

const QUESTIONS = [
  {
    id: "goal",
    section: "Your goals",
    prompt: "What is your main reason for investing?",
    options: [
      { value: "wealth", label: "Grow my long-term wealth" },
      { value: "retirement", label: "Build a retirement corpus" },
      { value: "home", label: "Buy a home" },
      { value: "education", label: "Fund education" },
      { value: "income", label: "Earn regular income" },
      { value: "tax", label: "Save tax" },
    ],
  },
  {
    id: "horizon",
    section: "Your goals",
    prompt: "When will you need most of this money?",
    options: [
      { value: "under_1y", label: "Within 1 year", score: 0 },
      { value: "1_3y", label: "1 to 3 years", score: 1 },
      { value: "3_5y", label: "3 to 5 years", score: 2 },
      { value: "5_10y", label: "5 to 10 years", score: 3 },
      { value: "over_10y", label: "More than 10 years", score: 4 },
    ],
  },
  {
    id: "age",
    section: "Your situation",
    prompt: "Which age group are you in?",
    options: [
      { value: "under_25", label: "Under 25", score: 4 },
      { value: "25_34", label: "25 to 34", score: 3 },
      { value: "35_44", label: "35 to 44", score: 2 },
      { value: "45_54", label: "45 to 54", score: 1 },
      { value: "55_plus", label: "55 or older", score: 0 },
    ],
  },
  {
    id: "income",
    section: "Your situation",
    prompt: "What is your approximate annual income?",
    options: [
      { value: "under_5l", label: "Under ₹5 lakh" },
      { value: "5_10l", label: "₹5 to 10 lakh" },
      { value: "10_25l", label: "₹10 to 25 lakh" },
      { value: "25_50l", label: "₹25 to 50 lakh" },
      { value: "over_50l", label: "More than ₹50 lakh" },
    ],
  },
  {
    id: "monthlySurplus",
    section: "Your situation",
    prompt: "How much can you comfortably invest each month?",
    options: [
      { value: "under_5k", label: "Under ₹5,000", score: 0 },
      { value: "5_15k", label: "₹5,000 to ₹15,000", score: 1 },
      { value: "15_50k", label: "₹15,000 to ₹50,000", score: 2 },
      { value: "over_50k", label: "More than ₹50,000", score: 3 },
    ],
  },
  {
    id: "emergencyFund",
    section: "Your situation",
    prompt: "How many months of expenses do you keep as an emergency fund?",
    options: [
      { value: "none", label: "None yet", score: 0 },
      { value: "under_3m", label: "Less than 3 months", score: 1 },
      { value: "3_6m", label: "3 to 6 months", score: 2 },
      { value: "over_6m", label: "More than 6 months", score: 3 },
    ],
  },
  {
    id: "emiBurden",
    section: "Your situation",
    prompt: "What share of your monthly income goes to loan EMIs?",
    options: [
      { value: "none", label: "No EMIs", score: 3 },
      { value: "under_20", label: "Less than 20%", score: 2 },
      { value: "20_40", label: "20% to 40%", score: 1 },
      { value: "over_40", label: "More than 40%", score: 0 },
    ],
  },
  {
    id: "experience",
    section: "Your experience",
    prompt: "What is the most advanced investment you have held?",
    options: [
      { value: "none", label: "I have not invested before", score: 0 },
      { value: "deposits", label: "FDs, PPF or EPF only", score: 1 },
      { value: "funds", label: "Mutual funds or SIPs", score: 2 },
      { value: "stocks", label: "Direct stocks", score: 3 },
      { value: "derivatives", label: "Futures and options", score: 4 },
    ],
  },
  {
    id: "drawdownReaction",
    section: "Your comfort with risk",
    prompt: "Your portfolio falls 20% in a month. What do you do?",
    options: [
      { value: "sell_all", label: "Sell everything", score: 0 },
      { value: "sell_some", label: "Sell part of it", score: 2 },
      { value: "hold", label: "Hold and wait", score: 5 },
      { value: "buy_more", label: "Invest more at lower prices", score: 7 },
    ],
  },
  {
    id: "returnRange",
    section: "Your comfort with risk",
    prompt: "Which one-year range of outcomes would you accept?",
    options: [
      { value: "narrow", label: "Worst -2%, best +8%", score: 0 },
      { value: "mild", label: "Worst -10%, best +15%", score: 2 },
      { value: "wide", label: "Worst -20%, best +30%", score: 5 },
      { value: "widest", label: "Worst -35%, best +50%", score: 7 },
    ],
  },
];

// Ordered lowest to highest risk. Allocations are indicative percentages.
const RISK_PROFILES = [
  {
    key: "conservative",
    label: "Conservative",
    minScore: 0,
    description:
      "You put protecting your capital first and accept lower returns for stability.",
    allocation: { equity: 15, debt: 75, gold: 10 },
  },
  {
    key: "moderately_conservative",
    label: "Moderately Conservative",
    minScore: 11,
    description:
      "You want stability with a modest share of growth assets for inflation-beating returns.",
    allocation: { equity: 30, debt: 60, gold: 10 },
  },
  {
    key: "balanced",
    label: "Balanced",
    minScore: 18,
    description:
      "You are comfortable with moderate ups and downs in exchange for steady growth.",
    allocation: { equity: 50, debt: 40, gold: 10 },
  },
  {
    key: "growth",
    label: "Growth",
    minScore: 25,
    description:
      "You are investing for the long term and can sit through sizeable market falls.",
    allocation: { equity: 70, debt: 22, gold: 8 },
  },
  {
    key: "aggressive",
    label: "Aggressive",
    minScore: 32,
    description:
      "You are seeking maximum long-term growth and accept large short-term swings.",
    allocation: { equity: 85, debt: 10, gold: 5 },
  },
];

// A high appetite for risk does not make money you need soon safe to risk, so
// these limit the result regardless of total score.
const RISK_CAPS = [
  {
    applies: (answers) => answers.horizon === "under_1y",
    maxProfile: "conservative",
    reason: "you need this money within a year",
  },
  {
    applies: (answers) => answers.horizon === "1_3y",
    maxProfile: "moderately_conservative",
    reason: "you need this money within three years",
  },
  {
    applies: (answers) => answers.emergencyFund === "none",
    maxProfile: "balanced",
    reason: "you do not have an emergency fund yet",
  },
  {
    applies: (answers) => answers.emiBurden === "over_40",
    maxProfile: "balanced",
    reason: "EMIs take up more than 40% of your income",
  },
];

const MAX_SCORE = QUESTIONS.reduce(
  (total, question) =>
    total + Math.max(0, ...question.options.map((option) => option.score || 0)),
  0,
);

// Questions for the client, without the scoring weights
export const getQuestions = () => ({
  version: QUESTIONNAIRE_VERSION,
  questions: QUESTIONS.map(({ options, ...question }) => ({
    ...question,
    options: options.map(({ value, label }) => ({ value, label })),
  })),
});

// Returns a list of problems with the submitted answers (empty when valid)
export const validateAnswers = (answers) => {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return ["Answers are required"];
  }

  return QUESTIONS.filter(
    (question) =>
      !question.options.some((option) => option.value === answers[question.id]),
  ).map((question) => `Missing or invalid answer for "${question.id}"`);
};

// Score validated answers and work out the investor's risk profile
export const assessAnswers = (answers) => {
  const score = QUESTIONS.reduce((total, question) => {
    const option = question.options.find(
      (candidate) => candidate.value === answers[question.id],
    );
    return total + (option.score || 0);
  }, 0);

  const scoredIndex = RISK_PROFILES.reduce(
    (best, profile, index) => (score >= profile.minScore ? index : best),
    0,
  );

  let finalIndex = scoredIndex;
  const capReasons = [];
  for (const cap of RISK_CAPS) {
    if (!cap.applies(answers)) continue;
    const capIndex = RISK_PROFILES.findIndex(
      (profile) => profile.key === cap.maxProfile,
    );
    if (capIndex < scoredIndex) {
      capReasons.push(cap.reason);
      finalIndex = Math.min(finalIndex, capIndex);
    }
  }

  const { key, label, description, allocation } = RISK_PROFILES[finalIndex];

  return {
    riskProfile: key,
    riskLabel: label,
    description,
    allocation,
    score,
    maxScore: MAX_SCORE,
    capReasons,
  };
};

// Plain-text summary used to give the AI assistant the investor's context
export const describeInvestorProfile = (profile) => {
  if (!profile?.riskProfile) return "";

  const labelFor = (questionId) =>
    QUESTIONS.find((question) => question.id === questionId)?.options.find(
      (option) => option.value === profile.answers?.[questionId],
    )?.label;

  const { equity, debt, gold } = profile.allocation;

  return [
    "INVESTOR PROFILE:",
    `Risk Profile: ${profile.riskLabel}`,
    `Indicative Allocation: ${equity}% equity, ${debt}% debt, ${gold}% gold`,
    `Main Goal: ${labelFor("goal")}`,
    `Time Horizon: ${labelFor("horizon")}`,
    `Monthly Investable Amount: ${labelFor("monthlySurplus")}`,
    `Emergency Fund: ${labelFor("emergencyFund")}`,
    `Experience: ${labelFor("experience")}`,
  ].join("\n");
};
