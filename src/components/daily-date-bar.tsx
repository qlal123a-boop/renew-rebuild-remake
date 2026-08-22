import { useEffect, useState } from "react";
import { CalendarDays, Clock, Moon } from "lucide-react";
import { academicYear, clockTime, fullDate, hijriDate } from "@/lib/date-utils";

/**
 * Dynamic Arabic date strip (day, date, month, year + Hijri + live clock).
 * Rendered client-side after hydration to avoid SSR/client time mismatch.
 */
export function DailyDateBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return <div className="h-[3.25rem]" aria-hidden />;
  }

  const hijri = hijriDate(now);
  const { label } = academicYear(now);

  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-extrabold text-royal-deep">
        <CalendarDays className="h-4 w-4 shrink-0 text-gold" aria-hidden />
        <time dateTime={now.toISOString().slice(0, 10)}>{fullDate(now, "ar")}</time>
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
        {hijri && (
          <span className="inline-flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5 text-gold" aria-hidden /> {hijri}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock className="h-3.5 w-3.5 text-gold" aria-hidden /> {clockTime(now, "ar")}
        </span>
        <span className="pill bg-gold/20 text-royal-deep">العام الدراسي {label}</span>
      </div>
    </div>
  );
}
