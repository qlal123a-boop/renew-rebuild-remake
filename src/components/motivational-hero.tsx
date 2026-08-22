import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, GraduationCap, Bot, Quote } from "lucide-react";
import { useQuotes } from "@/lib/storage";

export function MotivationalHero() {
  const { items: quotes } = useQuotes();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!quotes.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % quotes.length), 5000);
    return () => clearInterval(t);
  }, [quotes.length]);

  if (!quotes.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 pt-10 md:pt-14">
      <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-royal p-8 text-primary-foreground shadow-luxury md:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-gold opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-4 py-1.5 text-xs font-bold text-gold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> اقتباس اليوم
          </span>

          <div className="mt-6 flex items-start gap-4">
            <Quote className="hidden h-12 w-12 shrink-0 text-gold/80 md:block" />
            <div className="min-h-[6rem] flex-1">
              <p
                key={idx}
                className="animate-fade-in text-2xl font-extrabold leading-relaxed text-gold md:text-4xl"
              >
                «{quotes[idx]}»
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            {quotes.slice(0, 8).map((_, i) => (
              <button
                key={i}
                aria-label={`quote ${i + 1}`}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-smooth ${i === idx % 8 ? "w-8 bg-gold" : "w-3 bg-gold/30"}`}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/grades"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 text-sm font-extrabold shadow-gold transition-smooth hover:scale-[1.03]"
              style={{ color: "var(--royal-deep)" }}
            >
              <GraduationCap className="h-4 w-4" /> ابدأ التعلّم الآن
            </Link>
            <Link
              to="/tutor"
              className="inline-flex items-center gap-2 rounded-xl border border-gold/50 bg-white/5 px-6 py-3 text-sm font-bold text-gold backdrop-blur transition-smooth hover:bg-white/10"
            >
              <Bot className="h-4 w-4" /> اسأل المعلّم الذكي
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
