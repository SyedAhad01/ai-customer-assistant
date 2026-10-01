"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RefundBadge from "./RefundBadge";
import ReasoningLog from "./ReasoningLog";
import VoiceInput from "./VoiceInput";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface LogEntry {
  step: string;
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: string;
}

const STORAGE_KEY = "ai-support-chat";

export default function ChatInterface() {
  const [customerId, setCustomerId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<"APPROVED" | "DENIED" | "PENDING">("PENDING");
  const [decisionReason, setDecisionReason] = useState("");
  const [reasoningLog, setReasoningLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const elevenLabsKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || null;
  const ttsEnabled = Boolean(elevenLabsKey);
  const restoredRef = useRef(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.messages?.length)    setMessages(d.messages);
        if (d.sessionId)           setSessionId(d.sessionId);
        if (d.decision)            setDecision(d.decision);
        if (d.decisionReason)      setDecisionReason(d.decisionReason);
        if (d.reasoningLog?.length) setReasoningLog(d.reasoningLog);
        if (d.customerId)          setCustomerId(d.customerId);
      }
    } catch { /* ignore */ }
    restoredRef.current = true;
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!restoredRef.current) return;
    const settled = messages.filter((m) => !m.isStreaming);
    if (settled.length === 0 && !sessionId) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: settled,
        sessionId,
        decision,
        decisionReason,
        reasoningLog,
        customerId,
      }));
    } catch { /* ignore */ }
  }, [messages, sessionId, decision, decisionReason, reasoningLog, customerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const normalizeTranscript = (raw: string): string => {
    const wordNum: Record<string, string> = {
      zero: "0", oh: "0", one: "1", two: "2", three: "3",
      four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
    };

    let t = raw.trim();

    // Collapse spelled-out chars: "C U S T 0 0 1" → "CUST001"
    t = t.replace(/\b([A-Za-z0-9])(?:\s+([A-Za-z0-9])){2,}\b/g, (match) =>
      match.replace(/\s+/g, "").toUpperCase()
    );

    // "customer / cust + word-digits or digits" → CUSTXXX
    t = t.replace(
      /\b(?:customer|cust)[\s#]*((?:\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|\d)\b\s*){1,4})/gi,
      (_, nums) => {
        const digits = nums.trim().split(/\s+/).map((n: string) => wordNum[n.toLowerCase()] ?? n).join("");
        return `CUST${digits.padStart(3, "0")}`;
      }
    );

    // "order / ord (id|number|#)? + word-digits or digits" → ORDXXXX
    t = t.replace(
      /\b(?:order(?:\s+(?:id|number|#))?|ord)[\s#]*((?:\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|\d)\b\s*){1,4})/gi,
      (_, nums) => {
        const digits = nums.trim().split(/\s+/).map((n: string) => wordNum[n.toLowerCase()] ?? n).join("");
        return `ORD${digits}`;
      }
    );

    // Convert any remaining standalone word-numbers
    t = t.replace(
      /\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi,
      (w) => wordNum[w.toLowerCase()] ?? w
    );

    return t;
  };

  const stripMarkdown = (text: string) =>
    text
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/^[-*+]\s/gm, "")
      .replace(/\n{2,}/g, ". ")
      .trim();

  const speakText = async (text: string) => {
    const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
    if (!elevenLabsKey || !text) return;
    try {
      setSpeaking(true);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: "POST",
        headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text: stripMarkdown(text), model_id: "eleven_monolingual_v1" }),
      });
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play();
    } catch { setSpeaking(false); }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, customer_id: customerId || null, message: text }),
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "session" && !sessionId) {
              setSessionId(event.session_id);
            } else if (event.type === "token") {
              fullContent += event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent, isStreaming: true };
                return updated;
              });
            } else if (event.type === "tool_call" || event.type === "tool_result") {
              if (event.data) setReasoningLog((prev) => [...prev, event.data]);
            } else if (event.type === "done") {
              setDecision(event.refund_decision || "PENDING");
              setDecisionReason(event.decision_reason || "");
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent, isStreaming: false };
                return updated;
              });
              if (fullContent) await speakText(fullContent);
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again.", isStreaming: false };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setDecision("PENDING");
    setDecisionReason("");
    setReasoningLog([]);
    setInput("");
    setCustomerId("");
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden max-w-4xl w-full mx-auto">
      {/* Page controls bar */}
      <div className="bg-background-surface border-b border-border-col px-6 py-2.5 flex items-center justify-between shrink-0">
        <p className="text-xs text-text-col-tertiary font-mono">
          {sessionId ? <span>Session <span className="text-accent">{sessionId.slice(0, 8)}…</span></span> : "No active session"}
        </p>
        <div className="flex items-center gap-2">
          {speaking && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-accent border border-accent/30 bg-accent/5 px-2.5 py-1 rounded animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              Speaking…
            </span>
          )}
          {ttsEnabled && !speaking && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-text-col-tertiary border border-border-col px-2.5 py-1 rounded" title="ElevenLabs voice enabled">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Voice on
            </span>
          )}
          {decision !== "PENDING" && <RefundBadge decision={decision} />}
          <button
            onClick={() => setShowLog((v) => !v)}
            className="text-xs text-text-col-tertiary hover:text-accent font-mono transition-colors duration-150 border border-border-col hover:border-accent px-3 py-1.5 rounded"
          >
            {showLog ? "Hide" : "Show"} reasoning ({reasoningLog.length})
          </button>
          {messages.length > 0 && (
            <button
              onClick={startNew}
              className="text-xs px-3 py-1.5 rounded border border-border-col text-text-col-secondary hover:border-accent hover:text-accent transition-colors duration-150 font-mono"
            >
              New Session
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Customer ID bar */}
          {!sessionId && (
            <div className="bg-background-raised border-b border-border-col px-6 py-3 flex items-center gap-3">
              <label className="text-xs font-mono font-semibold text-text-col-tertiary uppercase tracking-widest">Customer ID</label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value.toUpperCase())}
                placeholder="e.g. CUST001"
                className="flex-1 max-w-xs text-sm border border-border-col rounded px-3 py-1.5 bg-background-surface text-text-col-primary placeholder:text-text-col-tertiary focus:outline-none focus:border-accent transition-colors duration-150 font-mono"
              />
              <p className="text-xs text-text-col-tertiary">Optional — you can also tell the agent your ID in chat</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-background-base">
            {messages.length === 0 && (
              <div className="text-center py-20 text-text-col-tertiary">
                <p className="text-4xl mb-4">🛍️</p>
                <p className="text-lg font-display font-semibold text-text-col-primary mb-1">How can we help you today?</p>
                <p className="text-sm">Start a conversation to request a refund or check order status.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded bg-accent flex items-center justify-center text-accent-subtle text-xs font-bold font-mono mr-2 mt-1 shrink-0">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-accent-subtle font-medium whitespace-pre-wrap"
                      : `bg-background-surface border border-border-col text-text-col-primary ${msg.isStreaming ? "cursor-blink" : ""}`
                  }`}
                >
                  {msg.role === "user" ? (
                    msg.content || (msg.isStreaming ? "" : "…")
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p:          ({ children }) => <p className="mb-2 last:mb-0 text-text-col-secondary">{children}</p>,
                        ul:         ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-text-col-secondary">{children}</ul>,
                        ol:         ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-text-col-secondary">{children}</ol>,
                        li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong:     ({ children }) => <strong className="font-semibold text-text-col-primary">{children}</strong>,
                        em:         ({ children }) => <em className="italic text-text-col-secondary">{children}</em>,
                        code:       ({ children }) => <code className="bg-background-raised text-accent px-1 py-0.5 rounded text-xs font-mono border border-border-col">{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-accent/40 pl-3 text-text-col-tertiary italic my-2">{children}</blockquote>,
                        hr:         () => <hr className="border-border-col my-3" />,
                      }}
                    >
                      {msg.content || (msg.isStreaming ? "​" : "…")}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Decision reason */}
          {decisionReason && (
            <div className={`mx-6 mb-3 px-4 py-3 rounded border text-sm font-mono ${
              decision === "APPROVED"
                ? "bg-success/5 border-success/30 text-success"
                : "bg-danger/5 border-danger/30 text-danger"
            }`}>
              {decisionReason}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border-col bg-background-surface px-6 py-4">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
              <VoiceInput onTranscript={(t) => setInput(normalizeTranscript(t))} disabled={loading} elevenLabsKey={elevenLabsKey} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                disabled={loading}
                className="flex-1 border border-border-col rounded px-4 py-2.5 text-sm bg-background-raised text-text-col-primary placeholder:text-text-col-tertiary focus:outline-none focus:border-accent disabled:opacity-50 transition-colors duration-150"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-accent text-accent-subtle px-4 py-2.5 rounded text-sm font-semibold hover:opacity-90 active:opacity-75 transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
              >
                {loading ? "…" : "Send"}
              </button>
            </form>
          </div>
        </div>

        {/* Reasoning log sidebar */}
        {showLog && (
          <aside className="w-96 border-l border-border-col bg-background-base flex flex-col">
            <div className="px-4 py-3 border-b border-border-col bg-background-surface">
              <h2 className="font-display font-semibold text-sm text-text-col-primary">Agent Reasoning Log</h2>
              <p className="text-xs text-text-col-tertiary font-mono mt-0.5">Tool calls and results</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ReasoningLog entries={reasoningLog} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
