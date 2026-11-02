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

const postCompletion = async ({ model, messages, maxTokens, signal, stream }) => {
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
      temperature: 0.4,
      stream,
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

// Yields { text } for each token and finally { usage }
async function* streamModel({ model, messages, maxTokens, signal }) {
  const response = await postCompletion({
    model,
    messages,
    maxTokens,
    signal,
    stream: true,
  });

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });

    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);

      // Blank lines and ": OPENROUTER PROCESSING" keep-alives carry no data
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return;

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

      const text = event.choices?.[0]?.delta?.content;
      if (text) yield { text };
      if (event.usage) yield { usage: event.usage };
    }
  }
}

// Streams from the primary model, moving to the fallback only if nothing has
// reached the user yet
export async function* streamChat({ messages, maxTokens, signal }) {
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
      })) {
        if (part.text) started = true;
        yield part;
      }
      return;
    } catch (error) {
      if (signal?.aborted || started || model === fallback) throw error;
      console.warn(`Model ${model} failed, trying fallback:`, error.message);
    }
  }
}

// One-shot completion for background work such as summarising
export const completeChat = async ({ messages, maxTokens }) => {
  const response = await postCompletion({
    model: getModels().primary,
    messages,
    maxTokens,
    stream: false,
  });
  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    usage: data.usage,
  };
};
