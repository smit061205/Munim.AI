import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

const AIChatContext = createContext();

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
};

// Store messages in sessionStorage with user-specific keys
const getStoredMessages = (userId) => {
  try {
    if (!userId) return getDefaultMessages();

    const stored = sessionStorage.getItem(`ai-chat-messages-${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (error) {
    console.error("Error loading stored messages:", error);
  }

  return getDefaultMessages();
};

const getDefaultMessages = () => {
  return [
    {
      id: 1,
      type: "ai",
      content:
        "Hello! I'm your AI financial assistant. Ask me anything about your finances and I'll help you with insights based on your data.",
      timestamp: new Date(),
    },
  ];
};

const storeMessages = (messages, userId) => {
  try {
    if (!userId) return;
    sessionStorage.setItem(
      `ai-chat-messages-${userId}`,
      JSON.stringify(messages)
    );
  } catch (error) {
    console.error("Error storing messages:", error);
  }
};

export const AIChatProvider = ({ children }) => {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isAIChatCollapsed, setIsAIChatCollapsed] = useState(false);
  const [messages, setMessages] = useState(getDefaultMessages());

  // Load messages when user changes or component mounts
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn || !userId) {
        // User signed out - use default messages
        setMessages(getDefaultMessages());
      } else {
        // User signed in - load their stored messages
        const storedMessages = getStoredMessages(userId);
        setMessages(storedMessages);
      }
    }
  }, [isSignedIn, userId, isLoaded]);

  // Store messages whenever they change
  useEffect(() => {
    if (userId && messages.length > 0) {
      storeMessages(messages, userId);
    }
  }, [messages, userId]);

  const toggleAIChat = () => {
    setIsAIChatOpen(!isAIChatOpen);
  };

  const openAIChat = () => {
    setIsAIChatOpen(true);
  };

  const closeAIChat = () => {
    setIsAIChatOpen(false);
  };

  const toggleAIChatCollapse = () => {
    setIsAIChatCollapsed(!isAIChatCollapsed);
  };

  const addMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const clearMessages = () => {
    const defaultMessages = getDefaultMessages();
    setMessages(defaultMessages);
    if (userId) {
      storeMessages(defaultMessages, userId);
    }
  };

  const value = {
    isAIChatOpen,
    isAIChatCollapsed,
    messages,
    setMessages,
    addMessage,
    clearMessages,
    toggleAIChat,
    openAIChat,
    closeAIChat,
    toggleAIChatCollapse,
  };

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
};
