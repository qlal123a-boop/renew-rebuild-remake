import { Link } from "@tanstack/react-router";
import { QuotesTicker } from "./quotes-ticker";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-16">
      <QuotesTicker />
      <div className="bg-royal-deep py-6 text-center text-xs text-primary-foreground/70" style={{ backgroundColor: "var(--royal-deep)" }}>
        <div className="mb-2 flex flex-wrap items-center justify-center gap-4">
          <Link to="/about" className="font-bold text-gold/90 hover:text-gold">من نحن</Link>
          <Link to="/library" className="hover:text-gold">المكتبة</Link>
          <Link to="/moderator-request" className="hover:text-gold">انضم كمشرف</Link>
        </div>
        © {new Date().getFullYear()} {t("footer.rights")} ·
        <Link to="/admin" className="mx-2 text-gold/70 hover:text-gold">·</Link>
      </div>
    </footer>
  );
}
