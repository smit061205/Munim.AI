import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const ChatPage = () => {
  const { user } = useUser();
  const { permissions } = usePermissions();
  const { isAIChatOpen, toggleAIChat, openAIChat } = useAIChat();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content:
        "Hello! I'm your AI financial assistant. I can help you analyze your financial data and answer questions about your assets, expenses, investments, and more. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = React.useRef(null);
  const { getAllowedCategories } = usePermissions();

  // Ensure AI chat is open when on chat page
  useEffect(() => {
    if (!isAIChatOpen) {
      openAIChat();
    }
  }, [isAIChatOpen, openAIChat]);

  const handleAIToggle = () => {
    toggleAIChat();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      const allowedCategories = getAllowedCategories();
      console.log("Sending query:", currentInput);
      console.log("Allowed categories:", allowedCategories);

      const response = await sendQuery(currentInput, allowedCategories);
      console.log("Response received:", response);

      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content:
          response.data?.answer ||
          response?.answer ||
          "I apologize, but I couldn't process your request at the moment. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending query:", error);

      let errorContent =
        "I'm sorry, I'm having trouble connecting to the server right now.";

      if (
        error.code === "ECONNREFUSED" ||
        error.message.includes("Network Error")
      ) {
        errorContent =
          "Backend server is not running. Please start the backend server on http://localhost:5000 and try again.";
      } else if (error.response?.status === 404) {
        errorContent =
          "API endpoint not found. Please check if the backend has the /api/query endpoint.";
      } else if (error.response?.status === 500) {
        errorContent = "Server error occurred. Please check the backend logs.";
      } else {
        errorContent = `Error: ${error.message || "Unknown error occurred"}`;
      }

      const errorMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: errorContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-screen bg-black">
      <Sidebar onAIToggle={handleAIToggle} isAIChatOpen={isAIChatOpen} />

      <div className="flex-1 overflow-auto bg-black">
        <Navbar
          title="AI Assistant"
          subtitle="Chat with Munimji about your finances and get personalized insights."
        />

        {/* Content - Show message when chat is closed */}
        {!isAIChatOpen && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">
                AI Assistant
              </h3>
              <p className="text-gray-400 mb-6">
                Click the AI Assistant button in the sidebar to start chatting
                with Munimji
              </p>
              <button
                onClick={() => openAIChat()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Open Chat
              </button>
            </div>
          </div>
        )}

        {isAIChatOpen && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <span>💬</span>
                    <span>AI Financial Assistant</span>
                  </h1>
                  <p className="text-gray-400 mt-1">
                    Ask me anything about your finances. I can access:{" "}
                    {getAllowedCategories().join(", ")}
                  </p>
                </div>
                <div className="bg-gray-700 p-2">
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-2xl px-6 py-4 rounded-xl shadow-sm ${
                      message.type === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-800 text-gray-100 border border-gray-700"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p
                      className={`text-xs mt-3 ${
                        message.type === "user"
                          ? "text-emerald-100"
                          : "text-gray-400"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-100 border border-gray-700 max-w-xs lg:max-w-md px-6 py-4 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-300">
                        AI is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-gray-800 border-t border-gray-700 p-8">
              <div className="flex space-x-4">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your finances..."
                  className="flex-1 bg-black text-white placeholder-gray-500 border border-gray-700 px-6 py-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                  rows="1"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 transition-colors font-medium"
                >
                  Send
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-3">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        )}
      </div>

      {isAIChatOpen && (
        <AIChatSidebar isOpen={isAIChatOpen} onClose={() => toggleAIChat()} />
      )}
    </div>
  );
};

export default ChatPage;
