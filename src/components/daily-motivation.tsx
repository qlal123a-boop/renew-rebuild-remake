import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { motivationOfTheDay } from "@/lib/motivation";

/**
 * "تحفيز اليوم" — deterministic daily message, reusable anywhere.
 * Hydration-safe: renders the message after mount so server/client agree.
 */
export function DailyMotivation({ className = "" }: { className?: string }) {
  const [item, setItem] = useState<{ text: string; author?: string } | null>(null);

  useEffect(() => {
    setItem(motivationOfTheDay(new Date()));
  }, []);

  return (
    <section
      aria-labelledby="daily-motivation-title"
      className={`surface-card relative overflow-hidden p-5 sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-gold/10 via-transparent to-transparent" />
      <div className="relative flex items-start gap-4">
        <span className="icon-tile shrink-0 bg-gradient-royal text-gold" aria-hidden>
          <Quote className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="daily-motivation-title" className="text-xs font-extrabold uppercase tracking-wide text-gold">
            تحفيز اليوم
          </h2>
          <p className="mt-1.5 text-base font-bold leading-relaxed text-royal-deep sm:text-lg">
            {item ? item.text : "\u00A0"}
          </p>
          {item?.author && <p className="mt-1 text-xs text-muted-foreground">— {item.author}</p>}
        </div>
      </div>
    </section>
  );
}
