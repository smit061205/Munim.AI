import mongoose from "mongoose";
import { AiUsage, Conversation, Message } from "../models/Assistant.js";
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
  getLimits,
  getUsage,
  loadUser,
  recordTokens,
  refundMessage,
  reserveMessage,
  titleFrom,
  truncateFileContext,
} from "../services/assistantService.js";

const findConversation = async (userId, id) => {
  const conversation = mongoose.isValidObjectId(id)
    ? await Conversation.findOne({ _id: id, user_id: userId })
    : null;
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  return conversation;
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
      .select("role content attachments status created_at")
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
    contexts.push(`${file.originalname}:\n${JSON.stringify(parsed)}`);

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
    if (!isConfigured()) {
      throw new ApiError(503, "The assistant is not set up yet");
    }

    const permissions = await UserPermissions.getUserPermissions(userId);
    if (!permissions.aiChat) {
      throw new ApiError(
        403,
        "The assistant is turned off. Turn it on in Settings.",
      );
    }

    const usage = await getUsage(userId);
    if (usage.tokensUsed >= usage.tokensLimit) {
      throw new ApiError(
        429,
        "You've used this month's assistant allowance. It resets on the 1st.",
      );
    }

    const existing = req.body.conversationId
      ? await findConversation(userId, req.body.conversationId)
      : null;

    if (!(await reserveMessage(userId))) {
      throw new ApiError(
        429,
        `You've used all ${limits.dailyMessages} messages for today. They reset at midnight IST.`,
      );
    }
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
    const prompt = await buildPrompt({
      user,
      conversation,
      userText: text,
      fileContext,
    });

    const abort = new AbortController();
    res.on("close", () => abort.abort());

    let reply = "";
    let model;
    let tokenUsage;
    let stopped = false;

    try {
      for await (const part of streamChat({
        messages: prompt.messages,
        maxTokens: limits.maxOutputTokens,
        signal: abort.signal,
      })) {
        if (part.model) model = part.model;
        if (part.usage) tokenUsage = part.usage;
        if (part.text) {
          reply += part.text;
          send("delta", { text: part.text });
        }
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        console.error("Assistant stream failed:", error.message);
        if (!reply) {
          await refundMessage(userId);
          await Message.deleteOne({ _id: userMessage.id });
          conversation.messageCount -= 1;
          if (conversation.messageCount === 0) {
            await conversation.deleteOne();
          } else {
            await conversation.save();
          }
          send("error", {
            message:
              error instanceof ProviderError && error.status === 429
                ? "The assistant is busy right now. Try again in a minute."
                : "The assistant couldn't answer. Your message wasn't counted.",
          });
          return res.end();
        }
      }
      stopped = true;
    }

    const tokens = {
      prompt: tokenUsage?.prompt_tokens ?? prompt.contextTokens,
      completion: tokenUsage?.completion_tokens ?? estimateTokens(reply),
    };

    const assistantMessage = await Message.create({
      conversation_id: conversation.id,
      user_id: userId,
      role: "assistant",
      content: reply,
      status: stopped ? "stopped" : "complete",
      model,
      tokens,
    });

    conversation.messageCount += 1;
    conversation.updated_at = new Date();
    await conversation.save();
    await recordTokens(
      userId,
      tokens.prompt + tokens.completion + prompt.summaryTokens,
    );

    if (!res.writableEnded && !abort.signal.aborted) {
      send("done", {
        messageId: assistantMessage.id,
        stopped,
        contextTokens: tokens.prompt,
        summarizedCount: prompt.summarizedCount,
        usage: await getUsage(userId),
      });
      res.end();
    }
  } catch (error) {
    if (reserved) await refundMessage(userId).catch(() => {});
    if (res.headersSent) {
      console.error("Assistant request failed:", error);
      return res.end();
    }
    next(error);
  }
};

// Removes everything the assistant has stored about a user
export const clearAssistantData = async (userId) => {
  await Promise.all([
    Conversation.deleteMany({ user_id: userId }),
    Message.deleteMany({ user_id: userId }),
    AiUsage.deleteMany({ user_id: userId }),
  ]);
};
