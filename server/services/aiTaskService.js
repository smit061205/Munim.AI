import { AiUsage } from "../models/Assistant.js";
import { completeJson, completeChat, isConfigured } from "./openRouterClient.js";

// Background AI work (reading statements, sorting transactions, the weekly
// note) shares the user's monthly token allowance with the chat, but doesn't
// use up their daily messages.

const monthlyTokenLimit = () => {
  const value = Number(process.env.AI_MONTHLY_TOKEN_LIMIT);
  return Number.isFinite(value) && value > 0 ? value : 1000000;
};

const monthKey = () =>
  `month:${new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(new Date())}`;

// Whether there's an AI model to use and allowance left for this user
export const canUseAi = async (userId) => {
  if (!isConfigured()) return false;
  const month = await AiUsage.findOne({ user_id: userId, key: monthKey() }).lean();
  return (month?.tokens || 0) < monthlyTokenLimit();
};

const record = (userId, usage, fallback) =>
  AiUsage.updateOne(
    { user_id: userId, key: monthKey() },
    { $inc: { tokens: usage?.total_tokens || fallback } },
    { upsert: true },
  );

export const aiJson = async (userId, messages, maxTokens) => {
  const { data, usage } = await completeJson({ messages, maxTokens });
  await record(userId, usage, maxTokens);
  return data;
};

export const aiText = async (userId, messages, maxTokens) => {
  const { text, usage } = await completeChat({ messages, maxTokens });
  await record(userId, usage, maxTokens);
  return text.trim();
};
