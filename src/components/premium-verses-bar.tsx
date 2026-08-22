import { useEffect, useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { useVersesList } from "@/components/quranic-verses";
import { useQuotes } from "@/lib/storage";

/**
 * Premium glassmorphism banner that alternates between a Quranic verse
 * (calligraphy font) and an inspirational quote. No marquee — a calm
 * cross-fade so the text stays readable on slow connections and small screens.
 */
export function PremiumVersesBar() {
  const verses = useVersesList();
  const { items: quotes } = useQuotes();
  const [i, setI] = useState(0);

  const slides = [
    ...verses.map((v) => ({ kind: "verse" as const, text: v })),
    ...quotes.map((q) => ({ kind: "quote" as const, text: q })),
  ];

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[i % slides.length];
  const isVerse = slide.kind === "verse";

  return (
    <div>
      <div
        className="glass-gold relative overflow-hidden rounded-2xl px-4 py-4 md:rounded-3xl md:px-8 md:py-6"
        aria-live="polite"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-white/40 px-3 py-1 text-[11px] font-bold text-royal-deep backdrop-blur">
            {isVerse ? <BookOpen className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isVerse ? "آية اليوم" : "اقتباس ملهم"}
          </span>

          <p
            key={`${slide.kind}-${i}`}
            dir="rtl"
            className={`animate-fade-in leading-loose text-royal-deep ${
              isVerse ? "font-quran font-bold" : "font-extrabold"
            }`}
            style={{ fontSize: isVerse ? "clamp(1.05rem, 2.6vw, 1.9rem)" : "clamp(0.95rem, 2vw, 1.4rem)" }}
          >
            {isVerse ? `﴿ ${slide.text} ﴾` : `« ${slide.text} »`}
          </p>

          <div className="mt-1 flex items-center gap-1.5">
            {slides.slice(0, 10).map((_, n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-smooth ${
                  n === i % 10 ? "w-6 bg-gold" : "w-1.5 bg-royal-deep/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
