import { useEffect, useState } from "react";

/** Live Arabic day + Gregorian & Hijri date with a ticking clock. */
export function ArabicClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;

  const day = new Intl.DateTimeFormat("ar", { weekday: "long" }).format(now);
  const greg = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(now);
  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(now);
  } catch { /* ignore */ }
  const time = new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);

  return (
    <div className="hidden shrink-0 flex-col items-end leading-tight text-gold/90 2xl:flex">
      <span className="text-[11px] font-bold">{day}، {greg}</span>
      <span className="text-[10px] text-primary-foreground/70">{hijri ? `${hijri} · ` : ""}{time}</span>
    </div>
  );
}
