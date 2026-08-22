import { Link, useRouterState } from "@tanstack/react-router";
import { Home, GraduationCap, Bot, Library, Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Primary destinations for the app-like mobile shell (existing routes only). */
const TABS = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/grades", key: "nav.grades", icon: GraduationCap },
  { to: "/tutor", key: "nav.tutor", icon: Bot },
  { to: "/library", key: "nav.library", icon: Library },
  { to: "/courses", key: "nav.courses", icon: Menu },
] as const;

export function MobileTabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("nav.menu")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.to === "/" ? path === "/" : path.startsWith(tab.to);
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors active:scale-95"
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                    active ? "bg-gold/25 text-royal-deep" : "text-muted-foreground"
                  }`}
                >
                  <tab.icon className="h-[1.15rem] w-[1.15rem]" />
                </span>
                <span
                  className={`text-[0.66rem] font-bold leading-none ${
                    active ? "text-royal-deep" : "text-muted-foreground"
                  }`}
                >
                  {t(tab.key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}