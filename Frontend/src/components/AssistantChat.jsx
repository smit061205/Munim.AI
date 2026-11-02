import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, FileSpreadsheet, Paperclip, Square, X } from "lucide-react";
import { useAssistant } from "../context/AssistantContext";
import { IconButton } from "./ui";

const SUGGESTIONS = [
  "How is my portfolio doing against my target mix?",
  "Where did most of my money go this month?",
  "Is my emergency fund large enough?",
];

const Message = ({ message }) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-accent-soft rounded-xl px-3.5 py-2">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          {message.attachments?.map((file) => (
            <p
              key={file.name}
              className="flex items-center gap-1.5 text-sm text-muted mt-1"
            >
              <FileSpreadsheet size={14} /> {file.name}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="prose-chat break-words">
      {message.content ? (
        <ReactMarkdown>{message.content}</ReactMarkdown>
      ) : (
        <p className="text-muted animate-pulse">Thinking...</p>
      )}
      {message.status === "stopped" && (
        <p className="text-sm text-muted mt-1">Stopped</p>
      )}
    </div>
  );
};

const UsageLine = () => {
  const { usage, contextTokens } = useAssistant();
  if (!usage) return null;

  const left = Math.max(usage.messagesLimit - usage.messagesUsed, 0);
  return (
    <p className="text-xs text-muted tnum">
      {left} of {usage.messagesLimit} messages left today
      {contextTokens > 0 && (
        <>
          . Conversation memory{" "}
          {Math.min(
            Math.round((contextTokens / usage.contextLimit) * 100),
            100,
          )}
          % full
        </>
      )}
    </p>
  );
};

export default function AssistantChat() {
  const { messages, usage, isStreaming, error, send, stop } = useAssistant();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const scroller = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const outOfMessages = usage && usage.messagesUsed >= usage.messagesLimit;
  const unavailable = usage && usage.available === false;
  const maxChars = usage?.maxMessageChars || 4000;

  const submit = (value = text) => {
    const message = value.trim();
    if (!message || isStreaming) return;
    send(message, files);
    setText("");
    setFiles([]);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const placeholder = unavailable
    ? "The assistant isn't set up yet"
    : outOfMessages
      ? "You've used today's messages. They reset at midnight IST."
      : "Ask about your money";

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div
        ref={scroller}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="pt-6">
            <p className="font-display text-2xl leading-snug mb-1">
              Ask Munimji about your money
            </p>
            <p className="text-muted mb-5">
              Answers use the data you've chosen to share in Settings.
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={outOfMessages || unavailable}
                  onClick={() => submit(suggestion)}
                  className="block w-full text-left px-3 py-2 rounded-lg border border-line hover:bg-wash transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message key={message._id || index} message={message} />
          ))
        )}
        {error && (
          <p role="alert" className="text-sm text-loss">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-line p-3">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((file) => (
              <span
                key={file.name}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-wash rounded-md text-sm"
              >
                <FileSpreadsheet size={14} />
                <span className="max-w-40 truncate">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setFiles(files.filter((item) => item !== file))
                  }
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1 border border-line-strong rounded-xl p-1.5 focus-within:border-accent bg-surface">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              setFiles([...files, ...event.target.files].slice(0, 3));
              event.target.value = "";
            }}
          />
          <IconButton
            label="Attach a spreadsheet"
            disabled={isStreaming}
            onClick={() => fileInput.current.click()}
          >
            <Paperclip size={18} />
          </IconButton>
          <textarea
            rows={1}
            value={text}
            maxLength={maxChars}
            disabled={outOfMessages || unavailable}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label="Message"
            className="flex-1 min-w-0 resize-none max-h-32 py-1.5 bg-transparent placeholder:text-faint focus:outline-none"
          />
          {isStreaming ? (
            <IconButton
              label="Stop"
              onClick={stop}
              className="bg-accent !text-canvas hover:bg-accent-hover"
            >
              <Square size={14} fill="currentColor" />
            </IconButton>
          ) : (
            <IconButton
              label="Send"
              disabled={!text.trim() || outOfMessages || unavailable}
              onClick={() => submit()}
              className="bg-accent !text-canvas hover:bg-accent-hover disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </IconButton>
          )}
        </div>
        <div className="flex justify-between gap-3 mt-2">
          <UsageLine />
        </div>
      </div>
    </div>
  );
}
