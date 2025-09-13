import React, { useState, useRef, useEffect } from "react";
import { usePermissions } from "../context/PermissionsContext";
import { createAuthenticatedApi, sendQuery } from "../services/api";
import { useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";

const AIChatSidebar = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { getToken } = useAuth();
  const { getAllowedCategories } = usePermissions();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content:
        "Hello! I'm your AI financial assistant. Ask me anything about your finances and I'll help you with insights based on your data.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const sidebarVariants = {
    initial: {
      x: "100%",
      opacity: 0,
      scale: 0.95,
    },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      width: isCollapsed ? 64 : 384,
    },
    exit: {
      x: "100%",
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.35,
        ease: [0.32, 0.72, 0, 1], // Custom easing for smoother exit
      },
    },
  };

  const contentVariants = {
    collapsed: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    expanded: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, delay: 0.1, ease: "easeOut" },
    },
  };

  const chevronVariants = {
    collapsed: { rotate: 180 },
    expanded: { rotate: 0 },
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      const authApi = createAuthenticatedApi(getToken);
      const allowedCategories = getAllowedCategories();

      const response = await sendQuery(
        authApi,
        userMessage.content,
        allowedCategories
      );

      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content:
          response.data.response ||
          "I apologize, but I couldn't process your request at the moment. Please try again.",
        timestamp: new Date(),
        metadata: {
          dataAvailable: response.data.data_available,
          categoriesUsed: response.data.categories_used,
          allowedCategories: response.data.allowedCategories,
        },
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending query:", error);

      let errorMessage =
        "I'm sorry, I encountered an error while processing your request.";

      if (error.response?.status === 401) {
        errorMessage = "Authentication error. Please sign in again.";
      } else if (error.response?.status === 400) {
        errorMessage =
          "Invalid request. Please check your query and try again.";
      } else if (error.response?.data?.response) {
        errorMessage = error.response.data.response;
      }

      const errorAiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: errorMessage,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    const newFiles = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((file, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: 0.4,
            ease: [0.32, 0.72, 0, 1], // Optimized easing curve
            width: {
              duration: 0.25,
              ease: [0.4, 0.0, 0.2, 1],
            },
          }}
          className="bg-black border-l border-gray-800 shadow-2xl flex flex-col h-full"
          style={{
            willChange: "transform, width, opacity",
            transform: "translate3d(0, 0, 0)", // Force GPU acceleration
            backfaceVisibility: "hidden", // Prevent flickering
          }}
        >
          {/* Header */}
          <div className="bg-black border-b border-gray-800 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.h2
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-lg font-medium text-white whitespace-nowrap"
                    >
                      AI Assistant
                    </motion.h2>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center space-x-2">
                {/* Collapse/Expand Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleCollapse}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:cursor-pointer"
                  title={isCollapsed ? "Expand" : "Collapse"}
                >
                  <motion.svg
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </motion.svg>
                </motion.button>
                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>
              </div>
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-gray-400 text-sm mt-2"
                >
                  Ask me anything about your finances
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 ${
                          message.type === "user"
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-800 text-gray-100"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">
                          {message.content}
                        </p>
                        {message.files && message.files.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.files.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 text-xs bg-black bg-opacity-20 p-2"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <span>{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 text-gray-100 p-3 max-w-[80%]">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-emerald-400 animate-bounce"></div>
                            <div className="w-2 h-2 bg-emerald-400 animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-emerald-400 animate-bounce delay-200"></div>
                          </div>
                          <span className="text-sm">
                            Munimji is thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-800 p-4 flex-shrink-0 bg-black">
                  {uploadedFiles.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-800 p-2 rounded text-sm"
                        >
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span className="text-white">{file.name}</span>
                            <span className="text-gray-400">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me about finances"
                        className="w-full bg-gray-800 border border-gray-700 text-white p-3 rounded focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none h-12"
                        rows={1}
                      />
                    </div>
                    <div className="flex space-x-2 pb-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-emerald-500 transition-colors rounded h-12 w-12 flex items-center justify-center"
                        title="Upload files"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={
                          (!inputValue.trim() && uploadedFiles.length === 0) ||
                          isLoading
                        }
                        className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-colors rounded h-12 w-12 flex items-center justify-center"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col items-center justify-center p-4"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleCollapse}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  title="Expand AI Assistant"
                >
                  <svg
                    className="w-8 h-8"
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
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIChatSidebar;
