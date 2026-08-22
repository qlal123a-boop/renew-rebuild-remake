import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Tiny client-side pagination helper. Keeps long lists snappy by only
 * rendering a slice at a time. Resets to page 1 whenever the input array
 * identity changes (typically when filters change upstream).
 */
export function usePagination<T>(items: T[], pageSize = 12) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => { setPage(1); }, [items, pageSize]);

  const safePage = Math.min(page, pageCount);
  const slice = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return { page: safePage, pageCount, slice, setPage, total: items.length };
}

export function PaginationBar({
  page, pageCount, onChange,
}: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;

  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => { if (pages[pages.length - 1] !== n) pages.push(n); };
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) push(i);
    else if (Math.abs(i - page) === 2) push("…");
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="ترقيم الصفحات">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-bold transition-smooth hover:border-gold/60 disabled:opacity-40"
        aria-label="السابق"
      >
        <ChevronRight className="h-4 w-4" />
        السابق
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`h-9 min-w-9 rounded-lg px-3 text-sm font-bold transition-smooth ${
              p === page
                ? "bg-gradient-royal text-gold shadow-card"
                : "border border-border bg-card hover:border-gold/60"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-bold transition-smooth hover:border-gold/60 disabled:opacity-40"
        aria-label="التالي"
      >
        التالي
        <ChevronLeft className="h-4 w-4" />
      </button>
    </nav>
  );
}
