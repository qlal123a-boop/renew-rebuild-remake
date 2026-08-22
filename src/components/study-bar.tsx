import { useEffect, useState } from "react";
import { Moon, Sun, Timer } from "lucide-react";
import { Link } from "@tanstack/react-router";

function formatArabicDateTime(d: Date) {
  try {
    const date = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    }).format(d);
    return { date, time };
  } catch {
    return { date: d.toDateString(), time: d.toLocaleTimeString() };
  }
}

/**
 * Slim top bar: live clock, dark-mode toggle, and a shortcut to the dedicated
 * Pomodoro room. The old inline tree/timer widget was moved to /pomodoro.
 */
export function StudyBar() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("almanara-dark");
      const d = saved ? saved === "1" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setDark(!!d);
      document.documentElement.classList.toggle("dark", !!d);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("almanara-dark", dark ? "1" : "0"); } catch { /* ignore */ }
  }, [dark, mounted]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { date, time } = mounted ? formatArabicDateTime(now) : { date: "", time: "--:--:--" };

  return (
    <div className="border-b border-gold/20 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground" suppressHydrationWarning>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-extrabold tabular-nums text-foreground">{time}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pomodoro"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1 text-[11px] font-bold text-gold hover:bg-gold/10"
            title="غرفة بومودورو"
          >
            <Timer className="h-3.5 w-3.5" /> بومودورو
          </Link>
          <button
            onClick={() => setDark((d) => !d)}
            className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground hover:text-gold"
            title={dark ? "وضع نهاري" : "وضع ليلي"}
            aria-label="تبديل الوضع الليلي"
          >
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
