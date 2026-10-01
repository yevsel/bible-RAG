"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Source = {
  reference?: string; // e.g. "John 3:16"
  text?: string;
};

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: boolean;
};

const SUGGESTIONS = [
  "What does the Bible say about forgiveness?",
  "Summarize the Sermon on the Mount",
  "Where does the Bible talk about wisdom?",
];

let nextId = 1;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const history = messages
      .filter((m) => !m.error)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: "user", content: question },
    ]);
    setInput("");
    setLoading(true);

    try {
      // Expected backend contract: POST /chat { message, history }
      //   -> { answer: string, sources?: { reference?, text? }[] }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "assistant",
          content: data.answer ?? "",
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "assistant",
          error: true,
          content:
            err instanceof Error
              ? `Something went wrong: ${err.message}`
              : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <h1 className="text-lg font-semibold">Bible Chat</h1>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-sm text-zinc-500 hover:text-foreground"
          >
            New chat
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-6 text-center">
              <p className="text-zinc-500">
                Ask a question about the Bible and get answers grounded in the
                text.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-black/10 px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : m.error
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {m.content}
                {m.sources && m.sources.length > 0 && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-zinc-500">
                      Sources ({m.sources.length})
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {m.sources.map((s, i) => (
                        <li
                          key={i}
                          className="border-l-2 border-zinc-400/50 pl-3"
                        >
                          {s.reference && (
                            <div className="font-medium">{s.reference}</div>
                          )}
                          {s.text && (
                            <div className="text-zinc-600 dark:text-zinc-400">
                              {s.text}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl bg-black/5 px-4 py-3.5 dark:bg-white/10">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <form
        onSubmit={onSubmit}
        className="border-t border-black/10 px-4 py-3 dark:border-white/10"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about the Bible…"
            className="max-h-40 flex-1 resize-none rounded-2xl border border-black/10 bg-transparent px-4 py-2.5 outline-none focus:border-foreground/40 dark:border-white/15"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-11 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
