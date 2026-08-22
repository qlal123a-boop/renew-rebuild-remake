import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

export type AppNotification = { id: string; text: string; time: string };

const SEED: AppNotification[] = [
  { id: "n1", text: "📢 اختبار قادم غدًا — راجع ملخّصات المادة", time: "الآن" },
  { id: "n2", text: "📚 درس جديد متاح في قسم الصفوف المدرسية", time: "قبل ساعة" },
  { id: "n3", text: "🏆 تم إضافة لعبة جديدة إلى الألعاب الذهنية", time: "اليوم" },
];

const READ_KEY = "almanara-notifs-read";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>(SEED);
  const [read, setRead] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { setRead(localStorage.getItem(READ_KEY) === "1"); } catch { /* ignore */ }
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Auto-dismiss the panel after 5 seconds.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(t);
  }, [open]);

  const unread = !read && items.length > 0;

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        setRead(true);
        try { localStorage.setItem(READ_KEY, "1"); } catch { /* ignore */ }
      }
      return next;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="الإشعارات"
        className="relative inline-flex items-center rounded-xl border border-gold/40 p-2 text-gold transition-smooth hover:bg-white/10"
      >
        <Bell className="h-4 w-4" />
        {unread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-royal-deep" />}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-72 animate-fade-in rounded-2xl border border-gold/30 bg-card p-2 text-foreground shadow-luxury">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-extrabold">الإشعارات</span>
            <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded p-1 hover:bg-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {items.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">لا توجد إشعارات</p>
            ) : items.map((n) => (
              <div key={n.id} className="group flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-relaxed">{n.text}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{n.time}</p>
                </div>
                <button
                  onClick={() => setItems((x) => x.filter((i) => i.id !== n.id))}
                  aria-label="إخفاء الإشعار"
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
