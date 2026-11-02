import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Check,
  Copy,
  FileSpreadsheet,
  Mic,
  Paperclip,
  RotateCcw,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useAssistant } from "../context/AssistantContext";
import { formatMonthShort } from "../lib/format";
import { SpendingBars } from "./charts";
import { Button, IconButton } from "./ui";

const SUGGESTIONS = [
  "How is my portfolio doing against the Nifty 50?",
  "Where did most of my money go this month?",
  "What bills and EMIs are due this week?",
  "Which tax regime is better for me?",
];

// Links to pages in the app stay in the app; anything else opens a new tab
const MarkdownLink = ({ href = "", children }) =>
  href.startsWith("/") ? (
    <Link to={href} className="underline text-accent">{children}</Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer noopener" className="underline">{children}</a>
  );

const MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="text-left font-medium border-b border-line-strong py-1 pr-3">{children}</th>,
  td: ({ children }) => <td className="border-b border-line py-1 pr-3 tnum">{children}</td>,
};

const ChatChart = ({ chart }) => (
  <div className="my-3 rounded-lg border border-line p-3">
    <p className="text-sm font-medium mb-3">{chart.title}</p>
    <SpendingBars
      limit={13}
      rows={chart.rows.map((row) => ({
        category: /^\d{4}-\d{2}$/.test(row.label) ? `${formatMonthShort(row.label)} ${row.label.slice(2, 4)}` : row.label,
        amount: row.value,
      }))}
    />
  </div>
);

const ActionCard = ({ messageId, action }) => {
  const { decideAction } = useAssistant();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const decide = async (decision) => {
    setBusy(true);
    setError(null);
    try {
      await decideAction(messageId, action.id, decision);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="my-3 rounded-lg border border-line-strong p-3 bg-surface">
      <p className="text-sm">{action.summary}</p>
      {action.status === "pending" ? (
        <div className="flex gap-2 mt-2.5">
          <Button size="sm" disabled={busy || !messageId} onClick={() => decide("confirm")}>Confirm</Button>
          <Button size="sm" variant="secondary" disabled={busy || !messageId} onClick={() => decide("dismiss")}>Dismiss</Button>
        </div>
      ) : (
        <p className={`text-sm mt-1.5 ${action.status === "failed" ? "text-loss" : "text-muted"}`}>
          {action.status === "done" ? (
            <span className="inline-flex items-center gap-1"><Check size={14} /> {action.result}</span>
          ) : action.status === "dismissed" ? (
            "Dismissed"
          ) : (
            action.result
          )}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-loss mt-1.5">{error}</p>}
    </div>
  );
};

const ReplyTools = ({ message, isLast }) => {
  const { regenerate, setFeedback, isStreaming } = useAssistant();
  const [copied, setCopied] = useState(false);
  if (!message._id || message.pending) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex gap-0.5 mt-1 -ml-1.5 text-muted">
      <IconButton label={copied ? "Copied" : "Copy"} onClick={copy}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </IconButton>
      {isLast && (
        <IconButton label="Answer again" disabled={isStreaming} onClick={() => regenerate(message._id)}>
          <RotateCcw size={15} />
        </IconButton>
      )}
      <IconButton
        label="Good answer"
        aria-pressed={message.feedback === "up"}
        className={message.feedback === "up" ? "!text-accent" : ""}
        onClick={() => setFeedback(message._id, message.feedback === "up" ? null : "up")}
      >
        <ThumbsUp size={15} />
      </IconButton>
      <IconButton
        label="Bad answer"
        aria-pressed={message.feedback === "down"}
        className={message.feedback === "down" ? "!text-accent" : ""}
        onClick={() => setFeedback(message._id, message.feedback === "down" ? null : "down")}
      >
        <ThumbsDown size={15} />
      </IconButton>
    </div>
  );
};

const Message = ({ message, isLast, onFollowUp }) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-accent-soft rounded-xl px-3.5 py-2">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          {message.attachments?.map((file) => (
            <p key={file.name} className="flex items-center gap-1.5 text-sm text-muted mt-1">
              <FileSpreadsheet size={14} /> {file.name}
            </p>
          ))}
        </div>
      </div>
    );
  }

  const steps = message.steps || [];
  const waiting = message.pending && !message.content;

  return (
    <div>
      {steps.length > 0 && (
        <ul className="text-sm text-muted mb-2 space-y-0.5">
          {steps.map((step, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <Check size={13} /> {step}
            </li>
          ))}
        </ul>
      )}
      <div className="prose-chat break-words">
        {message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {message.content}
          </ReactMarkdown>
        ) : waiting ? (
          <p className="text-muted animate-pulse">{steps.length ? "Working it out..." : "Thinking..."}</p>
        ) : null}
      </div>
      {message.charts?.map((chart, index) => <ChatChart key={index} chart={chart} />)}
      {message.actions?.map((action) => <ActionCard key={action.id} messageId={message._id} action={action} />)}
      {message.status === "stopped" && <p className="text-sm text-muted mt-1">Stopped</p>}
      <ReplyTools message={message} isLast={isLast} />
      {isLast && !message.pending && message.followUps?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {message.followUps.map((question) => (
            <button
              key={question}
              onClick={() => onFollowUp(question)}
              className="text-sm text-left px-2.5 py-1 rounded-full border border-line hover:bg-wash transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const UsageLine = () => {
  const { usage, contextTokens } = useAssistant();
  if (!usage) return null;
  if (usage.unlimited) return <p className="text-xs text-muted">Demo account: no message limit</p>;

  const left = Math.max(usage.messagesLimit - usage.messagesUsed, 0);
  return (
    <p className="text-xs text-muted tnum">
      {left} of {usage.messagesLimit} messages left today
      {contextTokens > 0 && (
        <>
          . Conversation memory{" "}
          {Math.min(Math.round((contextTokens / usage.contextLimit) * 100), 100)}% full
        </>
      )}
    </p>
  );
};

const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

// Voice input through the browser's own speech recognition. Indian English
// handles Hinglish well enough; the browser decides where the audio goes.
const useDictation = (onText) => {
  const [listening, setListening] = useState(false);
  const recognition = useRef(null);

  const toggle = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const engine = new SpeechRecognition();
    engine.lang = "en-IN";
    engine.interimResults = false;
    engine.onresult = (event) => onText(Array.from(event.results).map((result) => result[0].transcript).join(" "));
    engine.onend = () => setListening(false);
    engine.onerror = () => setListening(false);
    recognition.current = engine;
    engine.start();
    setListening(true);
  };

  return { supported: !!SpeechRecognition, listening, toggle };
};

export default function AssistantChat() {
  const { messages, usage, isStreaming, error, send, stop } = useAssistant();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const scroller = useRef(null);
  const fileInput = useRef(null);
  const dictation = useDictation((spoken) => setText((current) => `${current} ${spoken}`.trim()));

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const outOfMessages = usage && !usage.unlimited && usage.messagesUsed >= usage.messagesLimit;
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
      : dictation.listening
        ? "Listening..."
        : "Ask about your money";

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 ? (
          <div className="pt-6">
            <p className="font-display text-2xl leading-snug mb-1">Ask Munimji about your money</p>
            <p className="text-muted mb-5">
              It can look up your transactions, holdings and tax, and set up budgets or goals once you confirm. English, Hindi or Hinglish.
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
            <Message
              key={message._id || index}
              message={message}
              isLast={index === messages.length - 1}
              onFollowUp={(question) => submit(question)}
            />
          ))
        )}
        {error && (
          <p role="alert" className="text-sm text-loss">{error}</p>
        )}
      </div>

      <div className="border-t border-line p-3">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((file) => (
              <span key={file.name} className="inline-flex items-center gap-1.5 px-2 py-1 bg-wash rounded-md text-sm">
                <FileSpreadsheet size={14} />
                <span className="max-w-40 truncate">{file.name}</span>
                <button aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((item) => item !== file))}>
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
          <IconButton label="Attach a spreadsheet" disabled={isStreaming} onClick={() => fileInput.current.click()}>
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
          {dictation.supported && !isStreaming && (
            <IconButton
              label={dictation.listening ? "Stop listening" : "Speak"}
              aria-pressed={dictation.listening}
              disabled={outOfMessages || unavailable}
              onClick={dictation.toggle}
              className={dictation.listening ? "!text-loss" : ""}
            >
              <Mic size={18} />
            </IconButton>
          )}
          {isStreaming ? (
            <IconButton label="Stop" onClick={stop} className="bg-accent !text-canvas hover:bg-accent-hover">
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
