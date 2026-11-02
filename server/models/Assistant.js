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
  // Changes the assistant proposed; nothing happens until the user confirms
  actions: [
    {
      id: String,
      kind: String,
      summary: String,
      params: mongoose.Schema.Types.Mixed,
      status: {
        type: String,
        enum: ["pending", "done", "dismissed", "failed"],
        default: "pending",
      },
      result: String,
    },
  ],
  // Small charts drawn under the answer, from the data a tool returned
  charts: [mongoose.Schema.Types.Mixed],
  followUps: [String],
  // Short labels for what the assistant looked up, e.g. "Searched transactions"
  steps: [String],
  feedback: { type: String, enum: ["up", "down"] },
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

// Facts the user asked the assistant to remember across conversations
const memorySchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  text: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Conversation = mongoose.model("Conversation", conversationSchema);
const Message = mongoose.model("Message", messageSchema);
const AiUsage = mongoose.model("AiUsage", aiUsageSchema);
const Memory = mongoose.model("Memory", memorySchema);

export { Conversation, Message, AiUsage, Memory };
