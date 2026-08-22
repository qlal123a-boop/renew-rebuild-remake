import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { tutorChat } from "@/lib/tutor.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "أهلًا يا طالبي العزيز! أنا مساعد المنارة الذكي، اسألني أي شيء عن المنهاج الفلسطيني." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(tutorChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fn({ data: { messages: next.slice(-12) } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "تعذّر الاتصال بالخدمة، حاول مرة أخرى." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="فتح المساعد الذكي"
        className="fixed bottom-[5.25rem] left-4 z-50 grid h-12 w-12 md:bottom-5 md:left-5 md:h-14 md:w-14 place-items-center rounded-full bg-gradient-gold text-royal-deep shadow-luxury transition-smooth hover:scale-110"
        style={{ color: "var(--royal-deep)" }}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
      </button>

      {open && (
        <div className="fixed bottom-[9.5rem] left-4 z-50 flex h-[min(520px,60vh)] md:bottom-24 md:left-5 md:h-[520px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-gold/40 bg-card/95 shadow-luxury backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-gold/30 bg-gradient-royal px-4 py-3 text-primary-foreground">
            <Sparkles className="h-4 w-4 text-gold" />
            <div className="flex-1">
              <div className="text-sm font-extrabold text-gold">مساعد المنارة الذكي</div>
              <div className="text-[10px] text-primary-foreground/70">المنهاج الفلسطيني — جميع الصفوف</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ms-auto bg-gradient-gold text-royal-deep"
                  : "me-auto border border-gold/20 bg-background"
              }`} style={m.role === "user" ? { color: "var(--royal-deep)" } : undefined}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="me-auto inline-flex items-center gap-2 rounded-2xl border border-gold/20 bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold" /> الأستاذ يكتب…
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-border bg-background/80 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button disabled={loading} className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-gold disabled:opacity-50" aria-label="إرسال" style={{ color: "var(--royal-deep)" }}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
