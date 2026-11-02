import mongoose from "mongoose";
import { AiUsage, Conversation, Memory, Message } from "../models/Assistant.js";
import UserPermissions from "../models/UserPermissions.js";
import { ApiError } from "../middleware/errorHandler.js";
import { IngestService } from "../services/ingestService.js";
import {
  isConfigured,
  ProviderError,
  streamChat,
} from "../services/openRouterClient.js";
import {
  buildPrompt,
  estimateTokens,
  FOLLOW_UP_MARKER,
  getLimits,
  getUsage,
  loadUser,
  recordTokens,
  refundMessage,
  reserveMessage,
  splitFollowUps,
  titleFrom,
  truncateFileContext,
} from "../services/assistantService.js";
import {
  runAction,
  runTool,
  stepLabel,
  TOOL_DEFINITIONS,
} from "../services/assistantTools.js";

// Rounds of tool calls before the model must answer with what it has
const MAX_TOOL_ROUNDS = 4;
const TOOL_TOKENS = estimateTokens(JSON.stringify(TOOL_DEFINITIONS));
const MESSAGE_FIELDS = "role content attachments status created_at actions charts followUps steps feedback";
const PAGE = /^\/[a-z-]{0,30}$/;

const findConversation = async (userId, id) => {
  const conversation = mongoose.isValidObjectId(id)
    ? await Conversation.findOne({ _id: id, user_id: userId })
    : null;
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  return conversation;
};

const findMessage = async (userId, id) => {
  const message = mongoose.isValidObjectId(id)
    ? await Message.findOne({ _id: id, user_id: userId, role: "assistant" })
    : null;
  if (!message) throw new ApiError(404, "Message not found");
  return message;
};

export const listConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ user_id: req.auth.userId })
      .sort({ updated_at: -1 })
      .limit(200)
      .select("title messageCount updated_at")
      .lean();
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const conversation = await findConversation(
      req.auth.userId,
      req.params.id,
    );
    const messages = await Message.find({ conversation_id: conversation.id })
      .sort({ created_at: 1 })
      .select(MESSAGE_FIELDS)
      .lean();
    res.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        summarizedCount: conversation.summarizedCount,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const renameConversation = async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim().slice(0, 80);
    if (!title) {
      throw new ApiError(400, "Enter a name for this conversation");
    }
    const conversation = await findConversation(
      req.auth.userId,
      req.params.id,
    );
    conversation.title = title;
    await conversation.save();
    res.json({ success: true, data: { id: conversation.id, title } });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await findConversation(
      req.auth.userId,
      req.params.id,
    );
    await Message.deleteMany({ conversation_id: conversation.id });
    await conversation.deleteOne();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getAssistantUsage = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: { ...(await getUsage(req.auth.userId)), available: isConfigured() },
    });
  } catch (error) {
    next(error);
  }
};

// Turns attached spreadsheets into prompt text, importing the rows when the
// user asked for that in their message
const readAttachments = async (userId, files, text) => {
  const attachments = [];
  const contexts = [];
  let imported = null;

  for (const file of files) {
    const { parsed, meta } = IngestService.parseExcel(
      file.buffer,
      file.originalname,
    );
    attachments.push({
      name: file.originalname,
      rows: Object.values(meta.rowsBySheet).reduce((a, b) => a + b, 0),
    });
    // The raw grid repeats the rows, so it stays out of the prompt
    contexts.push(
      `${file.originalname}:\n${JSON.stringify(parsed, (key, value) => (key === "raw" ? undefined : value))}`,
    );

    if (!imported && IngestService.wantsImport(text)) {
      imported = await IngestService.ingestTransactions(userId, parsed);
    }
  }

  return {
    attachments,
    imported,
    fileContext: truncateFileContext(contexts.join("\n\n")),
  };
};

// Checks shared by new messages and regenerated replies
const checkCanAsk = async (userId) => {
  if (!isConfigured()) {
    throw new ApiError(503, "The assistant is not set up yet");
  }
  const permissions = await UserPermissions.getUserPermissions(userId);
  if (!permissions.aiChat) {
    throw new ApiError(403, "The assistant is turned off. Turn it on in Settings.");
  }
  const usage = await getUsage(userId);
  if (usage.tokensLimit !== null && usage.tokensUsed >= usage.tokensLimit) {
    throw new ApiError(429, "You've used this month's assistant allowance. It resets on the 1st.");
  }
};

const reserveOrThrow = async (userId) => {
  if (!(await reserveMessage(userId))) {
    throw new ApiError(
      429,
      `You've used all ${getLimits().dailyMessages} messages for today. They reset at midnight IST.`,
    );
  }
};

// Passes text through to the client but holds back the follow-up line,
// which arrives at the very end and is sent separately as chips
const followUpFilter = (emit) => {
  let held = "";
  let hidden = false;
  return (text) => {
    if (hidden) return;
    held += text;
    const index = held.indexOf(FOLLOW_UP_MARKER);
    if (index !== -1) {
      if (index > 0) emit(held.slice(0, index));
      hidden = true;
      return;
    }
    // Keep back the longest ending that could be the start of the marker,
    // since "<<" and "followups:" often arrive in separate pieces
    let safe = held.length;
    for (let index = Math.max(held.length - FOLLOW_UP_MARKER.length, 0); index < held.length; index += 1) {
      if (FOLLOW_UP_MARKER.startsWith(held.slice(index))) {
        safe = index;
        break;
      }
    }
    if (safe > 0) emit(held.slice(0, safe));
    held = held.slice(safe);
  };
};

// Streams an answer to the conversation's latest user message, calling tools
// as the model asks for them. Writes server-sent events to res.
const respond = async ({ req, res, userId, conversation, userMessage, text, fileContext, imported }) => {
  const limits = getLimits();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  send("meta", {
    conversationId: conversation.id,
    title: conversation.title,
    userMessageId: userMessage.id,
    imported,
  });

  const user = await loadUser(userId);
  const page = PAGE.test(req.body.page || "") ? req.body.page : null;
  const prompt = await buildPrompt({
    user,
    conversation,
    userText: text,
    fileContext,
    page,
    toolTokens: TOOL_TOKENS,
  });

  const abort = new AbortController();
  res.on("close", () => abort.abort());

  const ctx = {
    userId,
    user,
    permissions: prompt.permissions,
    overview: prompt.overview,
    charts: [],
    actions: [],
  };
  const steps = [];
  const messages = [...prompt.messages];
  const tokens = { prompt: 0, completion: 0 };
  const emitText = followUpFilter((part) => send("delta", { text: part }));
  let reply = "";
  let model;
  let stopped = false;
  let reportedUsage = false;

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      let roundText = "";
      let calls = null;
      let roundUsage = null;

      for await (const part of streamChat({
        messages,
        maxTokens: limits.maxOutputTokens,
        signal: abort.signal,
        // The last round has no tools, so the model has to answer
        tools: round < MAX_TOOL_ROUNDS ? TOOL_DEFINITIONS : undefined,
      })) {
        if (part.model) model = part.model;
        if (part.usage) roundUsage = part.usage;
        if (part.toolCalls) calls = part.toolCalls;
        if (part.text) {
          roundText += part.text;
          reply += part.text;
          emitText(part.text);
        }
      }

      if (roundUsage) {
        reportedUsage = true;
        tokens.prompt += roundUsage.prompt_tokens || 0;
        tokens.completion += roundUsage.completion_tokens || 0;
      } else {
        tokens.prompt += messages.reduce((sum, message) => sum + estimateTokens(message.content || ""), 0) + TOOL_TOKENS;
        tokens.completion += estimateTokens(roundText);
      }

      if (!calls?.length) break;

      messages.push({ role: "assistant", content: roundText || null, tool_calls: calls });
      for (const call of calls) {
        let args = {};
        try {
          args = JSON.parse(call.function?.arguments || "{}");
        } catch {
          // runTool reports the bad arguments to the model
        }
        const label = stepLabel(call.function?.name, args);
        steps.push(label);
        send("step", { label });

        const chartsBefore = ctx.charts.length;
        const actionsBefore = ctx.actions.length;
        const result = await runTool(ctx, call);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });

        ctx.charts.slice(chartsBefore).forEach((chart) => send("chart", chart));
        ctx.actions.slice(actionsBefore).forEach((action) => send("action", action));
      }
      // Text before a tool call ("Let me check") runs straight into the answer
      if (roundText && !/\s$/.test(roundText)) {
        reply += "\n\n";
        emitText("\n\n");
      }
    }
  } catch (error) {
    if (!abort.signal.aborted) {
      console.error("Assistant stream failed:", error.message);
      if (!reply.trim() && !ctx.actions.length) {
        await refundMessage(userId);
        send("error", {
          message:
            error instanceof ProviderError && error.status === 429
              ? "The assistant is busy right now. Try again in a minute."
              : "The assistant couldn't answer. Your message wasn't counted.",
        });
        return { failed: true };
      }
    }
    stopped = true;
  }

  const { text: content, followUps } = splitFollowUps(reply);
  if (followUps.length && !abort.signal.aborted) send("followups", { items: followUps });

  const assistantMessage = await Message.create({
    conversation_id: conversation.id,
    user_id: userId,
    role: "assistant",
    content,
    status: stopped ? "stopped" : "complete",
    model,
    tokens,
    actions: ctx.actions,
    charts: ctx.charts,
    followUps,
    steps,
  });

  conversation.messageCount += 1;
  conversation.updated_at = new Date();
  await conversation.save();
  await recordTokens(userId, tokens.prompt + tokens.completion + prompt.summaryTokens);

  if (!res.writableEnded && !abort.signal.aborted) {
    send("done", {
      messageId: assistantMessage.id,
      // The cleaned text, in case the model wrote the follow-up line in a
      // form the stream filter didn't recognise
      content,
      stopped,
      contextTokens: reportedUsage ? tokens.prompt : prompt.contextTokens,
      summarizedCount: prompt.summarizedCount,
      usage: await getUsage(userId),
    });
  }
  return { failed: false };
};

// @desc    Send a message and stream the reply as server-sent events
// @route   POST /api/assistant/messages
export const sendMessage = async (req, res, next) => {
  const userId = req.auth.userId;
  let reserved = false;

  try {
    const limits = getLimits();
    const text = String(req.body.message || "").trim();

    if (!text) {
      throw new ApiError(400, "Enter a message");
    }
    if (text.length > limits.maxMessageChars) {
      throw new ApiError(
        400,
        `Messages can be up to ${limits.maxMessageChars} characters`,
      );
    }
    await checkCanAsk(userId);

    const existing = req.body.conversationId
      ? await findConversation(userId, req.body.conversationId)
      : null;

    await reserveOrThrow(userId);
    reserved = true;

    const conversation =
      existing ||
      (await Conversation.create({ user_id: userId, title: titleFrom(text) }));

    const { attachments, fileContext, imported } = await readAttachments(
      userId,
      req.files || [],
      text,
    );

    const userMessage = await Message.create({
      conversation_id: conversation.id,
      user_id: userId,
      role: "user",
      content: text,
      attachments,
    });
    conversation.messageCount += 1;
    conversation.updated_at = new Date();
    await conversation.save();

    const { failed } = await respond({ req, res, userId, conversation, userMessage, text, fileContext, imported });

    if (failed) {
      // Nothing came back, so the question is taken back too
      await Message.deleteOne({ _id: userMessage.id });
      conversation.messageCount -= 1;
      if (conversation.messageCount === 0) await conversation.deleteOne();
      else await conversation.save();
    }
    res.end();
  } catch (error) {
    if (reserved) await refundMessage(userId).catch(() => {});
    if (res.headersSent) {
      console.error("Assistant request failed:", error);
      return res.end();
    }
    next(error);
  }
};

// @desc    Replace the latest reply with a new one
// @route   POST /api/assistant/messages/:id/regenerate
export const regenerateMessage = async (req, res, next) => {
  const userId = req.auth.userId;
  let reserved = false;

  try {
    const message = await findMessage(userId, req.params.id);
    const conversation = await findConversation(userId, message.conversation_id);
    const latest = await Message.findOne({ conversation_id: conversation.id }).sort({ created_at: -1 });
    if (latest?.id !== message.id) {
      throw new ApiError(400, "Only the latest reply can be regenerated");
    }
    const userMessage = await Message.findOne({
      conversation_id: conversation.id,
      role: "user",
      created_at: { $lte: message.created_at },
    }).sort({ created_at: -1 });
    if (!userMessage) throw new ApiError(400, "There's no question to answer again");

    await checkCanAsk(userId);
    await reserveOrThrow(userId);
    reserved = true;

    await message.deleteOne();
    conversation.messageCount -= 1;
    await conversation.save();

    // Files aren't kept, so a regenerated answer works from the text alone
    await respond({ req, res, userId, conversation, userMessage, text: userMessage.content, fileContext: "", imported: null });
    res.end();
  } catch (error) {
    if (reserved) await refundMessage(userId).catch(() => {});
    if (res.headersSent) {
      console.error("Regenerate failed:", error);
      return res.end();
    }
    next(error);
  }
};

// @desc    Thumbs up or down on a reply
// @route   POST /api/assistant/messages/:id/feedback
export const setFeedback = async (req, res, next) => {
  try {
    const value = ["up", "down"].includes(req.body.value) ? req.body.value : null;
    const message = await findMessage(req.auth.userId, req.params.id);
    message.feedback = value;
    await message.save();
    if (value === "down" && req.body.comment) {
      console.info(`Assistant feedback on ${message.id}: ${String(req.body.comment).slice(0, 500)}`);
    }
    res.json({ success: true, data: { feedback: value } });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm or dismiss a change the assistant proposed
// @route   POST /api/assistant/messages/:id/actions/:actionId
export const decideAction = async (req, res, next) => {
  try {
    const message = await findMessage(req.auth.userId, req.params.id);
    const action = message.actions.find((item) => item.id === req.params.actionId);
    if (!action) throw new ApiError(404, "That suggestion wasn't found");
    if (action.status !== "pending") {
      throw new ApiError(409, action.status === "done" ? "This has already been done" : "This suggestion was dismissed");
    }

    if (req.body.decision === "dismiss") {
      action.status = "dismissed";
    } else if (req.body.decision === "confirm") {
      try {
        action.result = await runAction(req.auth.userId, action);
        action.status = "done";
      } catch (error) {
        console.error("Assistant action failed:", error);
        action.status = "failed";
        action.result = "This couldn't be done. Try it from the page instead.";
      }
    } else {
      throw new ApiError(400, "Choose confirm or dismiss");
    }

    message.markModified("actions");
    await message.save();
    res.json({ success: true, data: action });
  } catch (error) {
    next(error);
  }
};

// What the assistant remembers across conversations
export const listMemories = async (req, res, next) => {
  try {
    const memories = await Memory.find({ user_id: req.auth.userId })
      .sort({ created_at: -1 })
      .select("text created_at")
      .lean();
    res.json({ success: true, data: memories });
  } catch (error) {
    next(error);
  }
};

export const deleteMemory = async (req, res, next) => {
  try {
    if (req.params.id === "all") {
      await Memory.deleteMany({ user_id: req.auth.userId });
    } else if (mongoose.isValidObjectId(req.params.id)) {
      await Memory.deleteOne({ _id: req.params.id, user_id: req.auth.userId });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Removes everything the assistant has stored about a user
export const clearAssistantData = async (userId) => {
  await Promise.all([
    Conversation.deleteMany({ user_id: userId }),
    Message.deleteMany({ user_id: userId }),
    AiUsage.deleteMany({ user_id: userId }),
    Memory.deleteMany({ user_id: userId }),
  ]);
};
