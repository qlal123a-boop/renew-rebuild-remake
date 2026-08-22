import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { useWorksheets } from "@/lib/storage";
import { FileText, Search, Loader2, Sparkles, Eye, Download, X } from "lucide-react";
import { usePagination, PaginationBar } from "@/components/paginated-list";
import { PdfReader } from "@/components/pdf-reader";
import { toInlinePdfSrc, toDownloadSrc } from "@/lib/pdf-src";
import { lazy, Suspense } from "react";

/** Heavy AI panel is code-split so the worksheet library loads instantly. */
const WorksheetAiTool = lazy(() =>
  import("@/components/worksheet-ai-tool").then((m) => ({ default: m.WorksheetAiTool })),
);


const search = z.object({
  grade: z.coerce.number().int().min(1).max(12).optional(),
  subject: z.string().optional(),
});

export const Route = createFileRoute("/worksheets")({
  validateSearch: search,
  component: WorksheetsPage,
  head: () => ({
    meta: [
      { title: "أوراق العمل — المنارة" },
      { name: "description", content: "أوراق عمل PDF رسمية حسب الصف والمادة، مع مولّد أوراق عمل ذكي وقابل للطباعة." },
      { property: "og:title", content: "أوراق العمل — المنارة" },
      { property: "og:description", content: "أوراق عمل رسمية + مولّد أوراق عمل ذكي من المنهاج الفلسطيني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function WorksheetsPage() {
  const initial = Route.useSearch();
  const [grade, setGrade] = useState<number | "">(initial.grade ?? "");
  const [subject, setSubject] = useState<string>(initial.subject ?? "");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"library" | "ai">("library");
  const { items } = useWorksheets();

  const subjects = useMemo(() => (grade ? subjectsForGrade(Number(grade)) : []), [grade]);

  useEffect(() => {
    if (grade && subject) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 1100);
      return () => clearTimeout(t);
    }
  }, [grade, subject]);

  const results = useMemo(() => {
    if (!grade || !subject) return [];
    return items.filter((w) => w.gradeId === Number(grade) && w.subject === subject);
  }, [items, grade, subject]);

  return (
    <div className="page-shell py-10 md:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold md:text-4xl">مركز أوراق العمل</h1>
        <p className="mt-2 text-sm text-muted-foreground">أوراق جاهزة من المصادر الرسمية — أو ولّد ورقة عمل ذكية فورًا</p>
        <div className="gold-divider mx-auto mt-6 w-32" />
      </header>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setTab("library")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-smooth ${tab === "library" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border bg-card hover:border-gold/60"}`}
        >
          <FileText className="h-4 w-4" /> أوراق جاهزة
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-smooth ${tab === "ai" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border bg-card hover:border-gold/60"}`}
        >
          <Sparkles className="h-4 w-4" /> مولّد ورقة عمل ذكية
        </button>
      </div>

      {tab === "ai" ? (
        <Suspense fallback={<div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">جارٍ تحميل المولّد الذكي…</div>}>
          <WorksheetAiTool defaultGrade={grade ? Number(grade) : 9} defaultSubject={subject} />
        </Suspense>
      ) : (
      <>


      <div className="rounded-3xl border border-gold/30 bg-gradient-royal p-6 shadow-luxury text-primary-foreground">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-bold text-gold">الصف</label>
            <select
              value={grade}
              onChange={(e) => { setGrade(e.target.value ? Number(e.target.value) : ""); setSubject(""); }}
              className="w-full rounded-xl border border-gold/30 bg-white/10 px-4 py-3 text-sm font-bold text-primary-foreground backdrop-blur outline-none transition-smooth focus:border-gold"
            >
              <option value="" className="text-foreground">— اختر الصف —</option>
              {GRADES.map((g) => (
                <option key={g.id} value={g.id} className="text-foreground">{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gold">المادة</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={!grade}
              className="w-full rounded-xl border border-gold/30 bg-white/10 px-4 py-3 text-sm font-bold text-primary-foreground backdrop-blur outline-none transition-smooth focus:border-gold disabled:opacity-50"
            >
              <option value="" className="text-foreground">— اختر المادة —</option>
              {subjects.map((s) => (
                <option key={s} value={s} className="text-foreground">{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              disabled={!grade || !subject}
              onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 900); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 text-sm font-bold text-royal-deep shadow-gold transition-smooth hover:scale-[1.02] disabled:opacity-50 md:w-auto"
              style={{ color: "var(--royal-deep)" }}
            >
              <Search className="h-4 w-4" /> بحث
            </button>
          </div>
        </div>
      </div>

      <section className="mt-10">
        {!grade || !subject ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-gold" />
            <p className="mt-3 text-sm text-muted-foreground">اختر الصف والمادة لعرض أوراق العمل</p>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-gold/30 bg-card p-10 text-center shadow-card">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-base font-bold">جاري جلب أحدث أوراق العمل من المصادر الرسمية...</p>
            <div className="mx-auto mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full animate-shimmer" />
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">لا توجد أوراق متاحة بعد لهذه المادة. أضفها من لوحة الإدارة.</p>
          </div>
        ) : (
          <PagedWorksheets results={results} />
        )}
      </section>
      </>
      )}
    </div>

  );
}

function PagedWorksheets({ results }: { results: ReturnType<typeof useWorksheets>["items"] }) {
  const { slice, page, pageCount, setPage } = usePagination(results, 12);
  const [viewing, setViewing] = useState<(typeof results)[number] | null>(null);
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "");
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {slice.map((w) => (
          <article
            key={w.id}
            className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury"
          >
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-royal text-gold">
                <FileText className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold" style={{ color: "var(--royal-deep)" }}>PDF</span>
            </div>
            <h3 className="mt-4 line-clamp-2 font-extrabold leading-snug">{w.title}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-muted-foreground">
              <span className="rounded-full border border-border px-2 py-0.5">{GRADES.find((g) => g.id === w.gradeId)?.name}</span>
              <span className="rounded-full border border-border px-2 py-0.5">{w.subject}</span>
              {w.createdAt && <span className="rounded-full border border-border px-2 py-0.5">{fmt(w.createdAt)}</span>}
            </div>
            {w.source && <p className="mt-2 text-xs text-muted-foreground">المصدر: {w.source}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setViewing(w)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-extrabold shadow-gold"
                style={{ color: "var(--royal-deep)" }}
              >
                <Eye className="h-3.5 w-3.5" /> فتح داخل الموقع
              </button>
              <a
                href={toDownloadSrc(w.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 px-3 py-2 text-xs font-bold hover:bg-gold/10"
              >
                <Download className="h-3.5 w-3.5" /> تنزيل
              </a>
            </div>
          </article>
        ))}
      </div>
      <PaginationBar page={page} pageCount={pageCount} onChange={setPage} />

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setViewing(null)}>
          <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-luxury" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-royal px-4 py-3 text-gold">
              <h3 className="truncate text-sm font-extrabold">{viewing.title}</h3>
              <button onClick={() => setViewing(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <PdfReader key={viewing.id} src={toInlinePdfSrc(viewing.url)} downloadUrl={viewing.url} title={viewing.title} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

