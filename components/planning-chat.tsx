"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Scope = { type: "project" | "opportunity"; id: string };
type Message = { role: "user" | "model"; text: string; sources?: string[] };

const prompts = {
  project: ["What is planned?", "When will work happen?", "What is the weather now?", "What is uncertain?"],
  opportunity: ["Why is this a lead?", "What could they share?", "What are the area challenges?", "Could they save money?"],
};

export default function PlanningChat({ scope }: { scope: Scope }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const ready = Boolean(configured);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/chat", { signal: controller.signal }).then((response) => response.json()).then((body) => setConfigured(Boolean((body as { configured?: boolean }).configured))).catch(() => { if (!controller.signal.aborted) setConfigured(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || !ready || messages.length >= 12) return;
    const next: Message[] = [...messages, { role: "user", text: question }];
    setMessages(next);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, messages: next.map(({ role, text }) => ({ role, text })) }),
      });
      const body = await response.json() as { answer?: string; sources?: string[]; error?: string };
      if (!response.ok || !body.answer) throw new Error(body.error || "The agent could not answer. Try again.");
      setMessages([...next, { role: "model", text: body.answer, sources: body.sources }]);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The agent could not answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(draft); }

  return <section className="planning-chat" aria-label="Ask Gridlock Scout">
    <div className="chat-heading"><div><span className="eyebrow">Ask about this {scope.type === "project" ? "project" : "opportunity"}</span><h4>Gridlock Scout assistant</h4></div><span className={`chat-state ${ready ? "ready" : ""}`}>{configured === null ? "Connecting" : configured ? "Gemini ready" : "Setup needed"}</span></div>
    {configured === false ? <p className="chat-setup">Gemini is not configured on the server.</p> : <>
      <div className="chat-thread" role="log" aria-live="polite">
        {messages.length === 0 && <p className="chat-empty">Ask about timing, possible shared work, sources, weather, or local conditions.</p>}
        {messages.map((message, index) => <article key={index} className={`chat-bubble ${message.role}`}><span>{message.role === "user" ? "You" : "Scout"}</span><p>{message.text}</p>{message.sources?.length ? <details className="chat-sources"><summary>Sources</summary>{message.sources.map((source) => <a key={source} href={source} target="_blank" rel="noopener noreferrer">{new URL(source).hostname} ↗</a>)}</details> : null}</article>)}
        {busy && <p className="chat-thinking" role="status">Checking the plans…</p>}
        <div ref={bottomRef} />
      </div>
        {messages.length === 0 && <div className="chat-prompts">{prompts[scope.type].map((prompt) => <button key={prompt} type="button" disabled={!ready} onClick={() => void send(prompt)}>{prompt}</button>)}</div>}
      {error && <p className="chat-error" role="alert">{error}</p>}
      {messages.length >= 12 ? <button className="chat-reset" type="button" onClick={() => { setMessages([]); setError(""); }}>Start a new chat</button> : <form className="chat-form" onSubmit={submit}><input aria-label="Ask a question" placeholder="Ask a question…" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} disabled={!ready || busy} /><button type="submit" disabled={!ready || busy || !draft.trim()}>Send</button></form>}
    </>}
    <small>Answers use public planning records. Live conditions describe today near mapped points, not future work dates.</small>
  </section>;
}
