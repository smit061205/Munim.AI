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

  const appendToReply = (text) =>
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, content: last.content + text };
      return next;
    });

  const send = useCallback(
    async (text, files = []) => {
      setError(null);
      setStreaming(true);
      setMessages((current) => [
        ...current,
        {
          role: "user",
          content: text,
          attachments: files.map((file) => ({ name: file.name })),
        },
        { role: "assistant", content: "", pending: true },
      ]);

      const removeDraft = () =>
        setMessages((current) => current.slice(0, -2));

      const form = new FormData();
      form.append("message", text);
      if (conversationId) form.append("conversationId", conversationId);
      files.forEach((file) => form.append("files", file));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`${API_URL}/assistant/messages`, {
          method: "POST",
          headers: authHeaders(),
          body: form,
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
            appendToReply(data.text);
          } else if (event === "done") {
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
                  index === current.length - 1
                    ? { ...message, status: "stopped" }
                    : message,
                )
              : current.slice(0, -1);
          });
        } else {
          removeDraft();
          setError(
            err.message === "Failed to fetch"
              ? "Munim.AI can't be reached. Check your connection and try again."
              : err.message,
          );
        }
      } finally {
        setMessages((current) =>
          current.map((message) =>
            message.pending ? { ...message, pending: false } : message,
          ),
        );
        setStreaming(false);
        abortRef.current = null;
        loadConversations().catch(() => {});
        loadUsage().catch(() => {});
      }
    },
    [conversationId, loadConversations, loadUsage, refresh],
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
