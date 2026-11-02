import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  title: { type: String, default: "New conversation" },
  // Rolling summary of the messages too old to fit in the context window
  summary: { type: String, default: "" },
  summarizedCount: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema({
  conversation_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, default: "" },
  attachments: [{ name: String, rows: Number }],
  status: {
    type: String,
    enum: ["complete", "stopped"],
    default: "complete",
  },
  model: String,
  tokens: { prompt: Number, completion: Number },
  created_at: { type: Date, default: Date.now },
});

// One document per user per day ("day:2026-11-02") and per month ("month:2026-11")
const aiUsageSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  key: { type: String, required: true },
  messages: { type: Number, default: 0 },
  tokens: { type: Number, default: 0 },
});
aiUsageSchema.index({ user_id: 1, key: 1 }, { unique: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
const Message = mongoose.model("Message", messageSchema);
const AiUsage = mongoose.model("AiUsage", aiUsageSchema);

export { Conversation, Message, AiUsage };
