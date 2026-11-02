import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, API_URL, authHeaders } from "../lib/api";
import { useData } from "./DataContext";

const AssistantContext = createContext(null);

// Reads server-sent events from a fetch response
const readEvents = async (response, onEvent) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const event = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.+)$/m)?.[1];
      if (event && data) onEvent(event, JSON.parse(data));
    }
  }
};

const draftReply = () => ({
  role: "assistant",
  content: "",
  pending: true,
  steps: [],
  charts: [],
  actions: [],
  followUps: [],
});

export const AssistantProvider = ({ children }) => {
  const { refresh } = useData();
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [usage, setUsage] = useState(null);
  const [contextTokens, setContextTokens] = useState(0);
  const [isStreaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const loadConversations = useCallback(async () => {
    const { data } = await api("/assistant/conversations");
    setConversations(data);
  }, []);

  const loadUsage = useCallback(async () => {
    const { data } = await api("/assistant/usage");
    setUsage(data);
  }, []);

  useEffect(() => {
    loadConversations().catch(() => {});
    loadUsage().catch(() => {});
  }, [loadConversations, loadUsage]);

  const startNew = useCallback(() => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setContextTokens(0);
    setError(null);
  }, []);

  const openConversation = useCallback(async (id) => {
    abortRef.current?.abort();
    setError(null);
    try {
      const { data } = await api(`/assistant/conversations/${id}`);
      setConversationId(data.id);
      setMessages(data.messages);
      setContextTokens(0);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const renameConversation = useCallback(
    async (id, title) => {
      await api(`/assistant/conversations/${id}`, {
        method: "PATCH",
        body: { title },
      });
      await loadConversations();
    },
    [loadConversations],
  );

  const deleteConversation = useCallback(
    async (id) => {
      await api(`/assistant/conversations/${id}`, { method: "DELETE" });
      if (id === conversationId) startNew();
      await loadConversations();
    },
    [conversationId, loadConversations, startNew],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const updateReply = (change) =>
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, ...change(last) };
      return next;
    });

  // Posts to a streaming endpoint and fills in the last (draft) reply.
  // `draftCount` is how many messages to remove if nothing came back.
  const stream = useCallback(
    async (path, init, draftCount) => {
      setError(null);
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`${API_URL}${path}`, {
          method: "POST",
          ...init,
          headers: { ...authHeaders(), ...init.headers },
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "The assistant couldn't answer.");
        }

        let failure = null;
        await readEvents(response, (event, data) => {
          if (event === "meta") {
            setConversationId(data.conversationId);
            if (data.imported?.inserted) refresh();
          } else if (event === "delta") {
            updateReply((last) => ({ content: last.content + data.text }));
          } else if (event === "step") {
            updateReply((last) => ({ steps: [...(last.steps || []), data.label] }));
          } else if (event === "chart") {
            updateReply((last) => ({ charts: [...(last.charts || []), data] }));
          } else if (event === "action") {
            updateReply((last) => ({ actions: [...(last.actions || []), data] }));
          } else if (event === "followups") {
            updateReply(() => ({ followUps: data.items }));
          } else if (event === "done") {
            updateReply((last) => ({ _id: data.messageId, content: data.content ?? last.content.trimEnd() }));
            setUsage((current) => ({ ...current, ...data.usage }));
            setContextTokens(data.contextTokens);
          } else if (event === "error") {
            failure = data.message;
          }
        });

        if (failure) throw new Error(failure);
      } catch (err) {
        if (err.name === "AbortError") {
          setMessages((current) => {
            const last = current[current.length - 1];
            return last?.content
              ? current.map((message, index) =>
                  index === current.length - 1 ? { ...message, status: "stopped" } : message,
                )
              : current.slice(0, -1);
          });
        } else {
          setMessages((current) => current.slice(0, -draftCount));
          setError(
            err.message === "Failed to fetch"
              ? "Munim.AI can't be reached. Check your connection and try again."
              : err.message,
          );
        }
      } finally {
        setMessages((current) =>
          current.map((message) => (message.pending ? { ...message, pending: false } : message)),
        );
        setStreaming(false);
        abortRef.current = null;
        loadConversations().catch(() => {});
        loadUsage().catch(() => {});
      }
    },
    [loadConversations, loadUsage, refresh],
  );

  const send = useCallback(
    async (text, files = []) => {
      setMessages((current) => [
        ...current,
        { role: "user", content: text, attachments: files.map((file) => ({ name: file.name })) },
        draftReply(),
      ]);

      const form = new FormData();
      form.append("message", text);
      // The page the user is on, so "this" in a question makes sense
      form.append("page", window.location.pathname);
      if (conversationId) form.append("conversationId", conversationId);
      files.forEach((file) => form.append("files", file));

      await stream("/assistant/messages", { body: form }, 2);
    },
    [conversationId, stream],
  );

  // Opens the panel and asks a question, e.g. from an "Ask about this" button
  const ask = useCallback(
    (text) => {
      setPanelOpen(true);
      if (!abortRef.current) send(text);
    },
    [send],
  );

  const regenerate = useCallback(
    async (messageId) => {
      let previous = null;
      setMessages((current) => {
        previous = current[current.length - 1];
        return [...current.slice(0, -1), draftReply()];
      });
      await stream(
        `/assistant/messages/${messageId}/regenerate`,
        { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page: window.location.pathname }) },
        1,
      );
      // A failed regenerate leaves the old reply deleted on the server only
      // if it got that far, so put the old one back on screen either way
      setMessages((current) => (current[current.length - 1]?.role === "user" && previous ? [...current, previous] : current));
    },
    [stream],
  );

  const setFeedback = useCallback(async (messageId, value) => {
    setMessages((current) => current.map((message) => (message._id === messageId ? { ...message, feedback: value } : message)));
    await api(`/assistant/messages/${messageId}/feedback`, { method: "POST", body: { value } }).catch(() => {});
  }, []);

  const decideAction = useCallback(
    async (messageId, actionId, decision) => {
      const { data } = await api(`/assistant/messages/${messageId}/actions/${actionId}`, {
        method: "POST",
        body: { decision },
      });
      setMessages((current) =>
        current.map((message) =>
          message._id === messageId
            ? { ...message, actions: message.actions.map((action) => (action.id === actionId ? data : action)) }
            : message,
        ),
      );
      if (data.status === "done") refresh();
      return data;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      isPanelOpen,
      setPanelOpen,
      conversations,
      conversationId,
      messages,
      usage,
      contextTokens,
      isStreaming,
      error,
      startNew,
      openConversation,
      renameConversation,
      deleteConversation,
      send,
      ask,
      regenerate,
      setFeedback,
      decideAction,
      stop,
    }),
    [
      isPanelOpen,
      conversations,
      conversationId,
      messages,
      usage,
      contextTokens,
      isStreaming,
      error,
      startNew,
      openConversation,
      renameConversation,
      deleteConversation,
      send,
      ask,
      regenerate,
      setFeedback,
      decideAction,
      stop,
    ],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => useContext(AssistantContext);
