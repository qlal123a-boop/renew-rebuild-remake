import { useQuotes } from "@/lib/storage";

export function QuotesTicker() {
  const { items: quotes } = useQuotes();
  if (!quotes.length) return null;

  return (
    <div className="overflow-hidden border-t border-gold/40 bg-gradient-royal py-3 text-primary-foreground">
      <div className="flex items-center gap-3 px-4">
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-gold px-3 py-1 text-xs font-bold" style={{ color: "var(--royal-deep)" }}>
          <span aria-label="علم فلسطين" className="text-base leading-none">🇵🇸</span> اقتباسات ملهمة
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-ticker whitespace-nowrap text-sm font-semibold text-gold">
            {[...quotes, ...quotes].map((q, i) => (
              <span key={i} className="mx-8">🇵🇸 {q}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
