import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap, LogIn, ShieldCheck, Menu, X, LogOut, Languages, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAuthUser, signOut } from "@/lib/use-auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notification-bell";
import { ArabicClock } from "@/components/arabic-clock";

const NAV = [
  { to: "/", key: "nav.home" },
  { to: "/grades", key: "nav.grades" },
  { to: "/courses", key: "nav.courses" },
  { to: "/summaries", key: "nav.summaries" },
  { to: "/worksheets", key: "nav.worksheets" },
  { to: "/library", key: "nav.library" },
  { to: "/smart-board", key: "nav.smartBoard" },
  { to: "/tutor", key: "nav.tutor" },
  { to: "/quiz-generator", key: "nav.quiz" },
  { to: "/pomodoro", key: "nav.pomodoro" },
  { to: "/games", key: "nav.games" },
  { to: "/store", key: "nav.store" },
  { to: "/tasks", key: "nav.tasks" },
  { to: "/schedule", key: "nav.schedule" },
  { to: "/gpa", key: "nav.gpa" },
] as const;

/** Clears cached layout state and reloads — helps when a stale cache breaks the UI. */
async function refreshUi() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    sessionStorage.clear();
  } catch { /* ignore */ }
  window.location.reload();
}


export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isSuperAdmin } = useAuthUser();
  const { t, toggle } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gold/25 bg-gradient-royal text-primary-foreground shadow-luxury">
      <div className="page-shell grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 md:py-4 lg:flex lg:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2 transition-smooth hover:opacity-90 md:gap-3" onClick={() => setOpen(false)}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-gold shadow-gold md:h-11 md:w-11">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6" style={{ color: "var(--royal-deep)" }} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-base font-extrabold tracking-tight text-gold md:text-xl">{t("brand.name")}</div>
            <div className="hidden truncate text-[11px] text-primary-foreground/70 sm:block">{t("brand.tagline")}</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {NAV.slice(0, 8).map((n) => {
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-smooth ${
                  active ? "shadow-gold" : "text-primary-foreground/85 hover:bg-white/10 hover:text-gold"
                }`}
                style={active ? { color: "var(--royal-deep)", backgroundColor: "var(--gold)" } : undefined}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <div className="hidden sm:block"><ArabicClock /></div>
          <button
            onClick={toggle}
            aria-label={t("lang.aria")}
            className="hidden items-center gap-1.5 rounded-xl border border-gold/40 px-2.5 py-2 text-xs font-bold text-gold transition-smooth hover:bg-white/10 sm:inline-flex md:px-3 md:text-sm"
          >
            <Languages className="h-4 w-4" /> {t("lang.switch")}
          </button>
          <button
            onClick={() => { toast.info("جارٍ تحديث واجهة الموقع…"); void refreshUi(); }}
            aria-label="تحديث الواجهة"
            title="تحديث الواجهة"
            className="hidden items-center gap-1.5 rounded-xl border border-gold/40 px-2.5 py-2 text-xs font-bold text-gold transition-smooth hover:bg-white/10 sm:inline-flex md:px-3 md:text-sm"
          >
            <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">تحديث الواجهة</span>
          </button>

          <NotificationBell />

          {isSuperAdmin && (
            <Link to="/admin-panel" className="hidden items-center gap-2 rounded-xl border border-gold/40 bg-white/5 px-3 py-2 text-xs font-bold text-gold transition-smooth hover:bg-white/10 sm:inline-flex md:text-sm">
              <ShieldCheck className="h-4 w-4" /> {t("nav.admin")}
            </Link>
          )}
          {user ? (
            <button onClick={async () => { await signOut(); toast.success(t("auth.loggedOut")); }} className="inline-flex items-center gap-2 rounded-xl border border-gold/40 px-2.5 py-2 text-xs font-bold text-gold transition-smooth hover:bg-white/10 md:px-3 md:text-sm">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{t("auth.logout")}</span>
            </button>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-2.5 py-2 text-xs font-bold shadow-gold transition-smooth hover:scale-[1.03] md:px-4 md:text-sm" style={{ color: "var(--royal-deep)" }}>
              <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">{t("auth.login")}</span>
            </Link>
          )}
          <button onClick={() => setOpen((v) => !v)} className="rounded-lg border border-gold/30 p-2 text-gold xl:hidden" aria-label={t("nav.menu")}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-gold/30 bg-royal-deep/40 px-4 py-3 xl:hidden">
          <div className="mb-3 flex items-center justify-between gap-2 sm:hidden">
            <ArabicClock />
            <div className="flex items-center gap-2">
              <button onClick={toggle} aria-label={t("lang.aria")} className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 px-2.5 py-2 text-xs font-bold text-gold">
                <Languages className="h-4 w-4" /> {t("lang.switch")}
              </button>
              <button
                onClick={() => { toast.info("جارٍ تحديث واجهة الموقع…"); void refreshUi(); }}
                aria-label="تحديث الواجهة"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 px-2.5 py-2 text-xs font-bold text-gold"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NAV.map((n) => {
              const active = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-center text-sm font-semibold transition-smooth ${
                    active ? "" : "border border-gold/30 text-gold hover:bg-white/10"
                  }`}
                  style={active ? { color: "var(--royal-deep)", backgroundColor: "var(--gold)" } : undefined}
                >
                  {t(n.key)}
                </Link>
              );
            })}
            <Link to="/moderator-request" onClick={() => setOpen(false)} className="rounded-lg border border-gold/30 px-3 py-2 text-center text-sm font-semibold text-gold">
              {t("nav.join")}
            </Link>
            {isSuperAdmin && (
              <Link to="/admin-panel" onClick={() => setOpen(false)} className="rounded-lg border border-gold/30 px-3 py-2 text-center text-sm font-semibold text-gold">
                {t("nav.admin")}
              </Link>
            )}
          </div>
        </nav>
      )}

      <div className="gold-divider" />
    </header>
  );
}
