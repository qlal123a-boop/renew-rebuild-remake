import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Bot, Send, Sparkles, User, Loader2, ImagePlus, X } from "lucide-react";
import { tutorChat } from "@/lib/tutor.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/tutor")({
  component: () => <RequireAuth title="روبوت المنارة للطلاب المسجّلين"><TutorPage /></RequireAuth>,
  head: () => ({
    meta: [
      { title: "روبوت المنارة — المساعد الذكي" },
      { name: "description", content: "معلّم ذكي للنحو والإعراب وحلّ مسائل الرياضيات — مع دعم صور الواجبات." },
      { property: "og:title", content: "روبوت المنارة — المساعد الذكي" },
      { property: "og:description", content: "معلّم ذكي للنحو والإعراب وحلّ مسائل الرياضيات — مع دعم صور الواجبات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string; imageDataUrl?: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function TutorPage() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: t("tutor.greeting") },
  ]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ask = useServerFn(tutorChat);

  const starters = [t("tutor.starter1"), t("tutor.starter2"), t("tutor.starter3"), t("tutor.starter4")];

  async function readImage(file: File) {
    if (!file.type.startsWith("image/")) { toast.error(t("tutor.pickImage")); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast.error(t("tutor.imgTooLarge")); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setPendingImage(dataUrl);
  }

  async function send(text: string) {
    if ((!text.trim() && !pendingImage) || sending) return;
    const userMsg: Msg = {
      role: "user",
      content: text.trim() || "اقرأ الصورة وحلّ السؤال خطوة بخطوة.",
      imageDataUrl: pendingImage || undefined,
    };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setPendingImage(null);
    setSending(true);
    try {
      const res = await ask({ data: { messages: next.map(({ role, content, imageDataUrl }) => ({ role, content, imageDataUrl })) } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: t("tutor.error") }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-gold shadow-gold">
          <Bot className="h-8 w-8" style={{ color: "var(--royal-deep)" }} />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold md:text-4xl">{t("tutor.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("tutor.subtitle")}</p>
        <div className="gold-divider mx-auto mt-5 w-32" />
      </header>

      <div className="mt-8 overflow-hidden rounded-3xl border border-gold/30 bg-card shadow-luxury">
        <div className="border-b border-gold/25 bg-gradient-royal px-5 py-3 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="grid h-2 w-2 place-items-center rounded-full bg-emerald-400 animate-pulse" />
            {t("tutor.online")}
          </div>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-secondary" : "bg-gradient-royal text-gold"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-card ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
                {m.imageDataUrl && (
                  <img src={m.imageDataUrl} alt="صورة الواجب" loading="lazy" className="max-h-64 w-auto rounded-lg border border-white/20" />
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-royal text-gold">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin" /> {t("tutor.thinking")}
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="border-t border-border bg-secondary/40 px-5 py-3">
            <div className="mb-2 flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> {t("tutor.suggestions")}
            </div>
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-smooth hover:border-gold hover:bg-gold/10">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {pendingImage && (
          <div className="flex items-center gap-3 border-t border-border bg-secondary/40 px-4 py-3">
            <img src={pendingImage} alt="معاينة" className="h-16 w-16 rounded-lg border border-gold/30 object-cover" />
            <div className="min-w-0 flex-1 text-xs font-bold text-muted-foreground">{t("tutor.imageReady")}</div>
            <button onClick={() => setPendingImage(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card text-destructive hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-2 border-t border-border bg-card p-3 sm:p-4"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void readImage(f); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/40 bg-secondary text-secondary-foreground transition-smooth hover:bg-gold/10"
            title={t("tutor.uploadImage")}
            aria-label={t("tutor.uploadImage")}
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingImage ? t("tutor.placeholderImage") : t("tutor.placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-gold"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !pendingImage)}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-gold shadow-gold transition-smooth hover:scale-105 disabled:opacity-50"
            style={{ color: "var(--royal-deep)" }}
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
