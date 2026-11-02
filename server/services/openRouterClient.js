const REQUEST_TIMEOUT_MS = 90 * 1000;

const baseUrl = () =>
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

export const getModels = () => ({
  primary: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
  fallback:
    process.env.OPENROUTER_FALLBACK_MODEL || "google/gemini-3.1-flash-lite",
});

export const isConfigured = () => !!process.env.OPENROUTER_API_KEY;

export class ProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const postCompletion = async ({
  model,
  messages,
  maxTokens,
  signal,
  stream,
  tools,
  json,
  temperature = 0.4,
}) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  const response = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
      "X-Title": "Munim.AI",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
      ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ProviderError(
      `OpenRouter returned ${response.status}: ${body.slice(0, 200)}`,
      response.status,
    );
  }
  return response;
};

// Yields { text } for each token, { toolCalls } once the model has finished
// asking for tools, and finally { usage }
async function* streamModel({ model, messages, maxTokens, signal, tools }) {
  const response = await postCompletion({
    model,
    messages,
    maxTokens,
    signal,
    stream: true,
    tools,
  });

  const decoder = new TextDecoder();
  let buffer = "";
  // Tool calls arrive in pieces, keyed by their position in the list
  const calls = [];

  const finishCalls = function* () {
    if (calls.length) {
      yield {
        toolCalls: calls.filter(Boolean).map((call, index) => ({
          id: call.id || `call_${index}`,
          type: "function",
          function: { name: call.name, arguments: call.arguments || "{}" },
        })),
      };
      calls.length = 0;
    }
  };

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });

    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);

      // Blank lines and ": OPENROUTER PROCESSING" keep-alives carry no data
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") {
        yield* finishCalls();
        return;
      }

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      if (event.error) {
        throw new ProviderError(
          event.error.message || "Provider error",
          event.error.code,
        );
      }

      const delta = event.choices?.[0]?.delta;
      if (delta?.content) yield { text: delta.content };
      for (const piece of delta?.tool_calls || []) {
        const index = piece.index ?? calls.length;
        const call = calls[index] || (calls[index] = { arguments: "" });
        if (piece.id) call.id = piece.id;
        if (piece.function?.name) call.name = piece.function.name;
        if (piece.function?.arguments) call.arguments += piece.function.arguments;
      }
      if (event.usage) yield { usage: event.usage };
    }
  }
  yield* finishCalls();
}

// Streams from the primary model, moving to the fallback only if nothing has
// reached the user yet
export async function* streamChat({ messages, maxTokens, signal, tools }) {
  const { primary, fallback } = getModels();

  for (const model of [primary, fallback]) {
    let started = false;
    try {
      yield { model };
      for await (const part of streamModel({
        model,
        messages,
        maxTokens,
        signal,
        tools,
      })) {
        if (part.text || part.toolCalls) started = true;
        yield part;
      }
      return;
    } catch (error) {
      if (signal?.aborted || started || model === fallback) throw error;
      console.warn(`Model ${model} failed, trying fallback:`, error.message);
    }
  }
}

// One-shot completion for background work such as summarising, with the same
// fallback model as the chat
export const completeChat = async ({ messages, maxTokens, json = false, temperature }) => {
  const { primary, fallback } = getModels();
  for (const model of [primary, fallback]) {
    try {
      const response = await postCompletion({
        model,
        messages,
        maxTokens,
        stream: false,
        json,
        temperature,
      });
      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || "",
        usage: data.usage,
      };
    } catch (error) {
      if (model === fallback) throw error;
      console.warn(`Model ${model} failed, trying fallback:`, error.message);
    }
  }
};

// A completion that must come back as JSON. Models sometimes wrap it in a
// code fence, so that's removed before parsing.
export const completeJson = async ({ messages, maxTokens = 2000 }) => {
  const { text, usage } = await completeChat({
    messages,
    maxTokens,
    json: true,
    temperature: 0,
  });
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return { data: JSON.parse(cleaned), usage };
  } catch {
    throw new ProviderError("The model didn't return valid JSON", 502);
  }
};
