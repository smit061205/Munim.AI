import React, { createContext, useContext, useState } from "react";

const AIChatContext = createContext();

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
};

export const AIChatProvider = ({ children }) => {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isAIChatCollapsed, setIsAIChatCollapsed] = useState(false);

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

  const value = {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    openAIChat,
    closeAIChat,
    toggleAIChatCollapse,
  };

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
};
