import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSummaries } from "@/lib/storage";
import { GRADES } from "@/lib/curriculum";
import { FileText, ChevronLeft, Sparkles, BookOpen } from "lucide-react";
import { usePagination, PaginationBar } from "@/components/paginated-list";
import { lazy, Suspense } from "react";

/** Heavy AI panel is code-split so the summaries library loads instantly. */
const SummaryAiTool = lazy(() =>
  import("@/components/summary-ai-tool").then((m) => ({ default: m.SummaryAiTool })),
);

export const Route = createFileRoute("/summaries")({
  component: SummariesPage,
  head: () => ({
    meta: [
      { title: "الملخصات الدراسية — المنارة" },
      { name: "description", content: "ملخصات شاملة لكل صف ومادة من المنهاج الفلسطيني، مع مولّد ملخصات ذكي." },
      { property: "og:title", content: "الملخصات الدراسية — المنارة" },
      { property: "og:description", content: "ملخصات جاهزة + مولّد ملخصات ذكي من المنهاج الفلسطيني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SummariesPage() {
  const { items } = useSummaries();
  const [grade, setGrade] = useState<number | "">("");
  const [active, setActive] = useState<string | null>(null);
  const [tab, setTab] = useState<"library" | "ai">("library");

  const filtered = useMemo(
    () => grade ? items.filter((s) => s.gradeId === Number(grade)) : items,
    [items, grade]
  );

  const opened = active ? items.find((x) => x.id === active) : null;

  if (opened) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <button onClick={() => setActive(null)} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-gold">
          <ChevronLeft className="h-4 w-4" /> العودة للقائمة
        </button>
        <article className="rounded-3xl border border-gold/40 bg-card p-6 shadow-luxury md:p-8">
          <div className="text-xs font-bold text-muted-foreground">{GRADES.find((g) => g.id === opened.gradeId)?.name} · {opened.subject}</div>
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{opened.title}</h1>
          <div className="gold-divider mt-4 w-24" />
          <pre className="mt-4 whitespace-pre-wrap font-sans text-base leading-loose text-foreground/90">{opened.content}</pre>
          {opened.fileUrl && (
            <a href={opened.fileUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-bold shadow-gold" style={{ color: "var(--royal-deep)" }}>
              <FileText className="h-4 w-4" /> تحميل ملف PDF
            </a>
          )}
        </article>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold md:text-4xl">الملخصات الدراسية</h1>
        <p className="mt-2 text-sm text-muted-foreground">ملخصات منظّمة جاهزة للمراجعة — أو ولّد ملخّصك الخاص بالذكاء الاصطناعي</p>
        <div className="gold-divider mx-auto mt-6 w-32" />
      </header>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setTab("library")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-smooth ${tab === "library" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border bg-card hover:border-gold/60"}`}
        >
          <BookOpen className="h-4 w-4" /> مكتبة الملخصات
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-smooth ${tab === "ai" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border bg-card hover:border-gold/60"}`}
        >
          <Sparkles className="h-4 w-4" /> مولّد الملخصات الذكي
        </button>
      </div>

      {tab === "ai" ? (
        <Suspense fallback={<div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">جارٍ تحميل المولّد الذكي…</div>}>
          <SummaryAiTool />
        </Suspense>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">تصفية حسب الصف:</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">كل الصفوف</option>
              {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              لا توجد ملخصات بعد. <Link to="/admin" className="text-primary underline">أضف من لوحة الإدارة</Link>
            </div>
          ) : (
            <PagedSummaries filtered={filtered} onOpen={setActive} />
          )}
        </>
      )}
    </div>
  );
}


function PagedSummaries({
  filtered, onOpen,
}: { filtered: ReturnType<typeof useSummaries>["items"]; onOpen: (id: string) => void }) {
  const { slice, page, pageCount, setPage } = usePagination(filtered, 12);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slice.map((s) => (
          <button key={s.id} onClick={() => onOpen(s.id)} className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-right shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury">
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-gold" />
              {GRADES.find((g) => g.id === s.gradeId)?.name} · {s.subject}
            </div>
            <div className="font-extrabold leading-snug">{s.title}</div>
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{s.content}</p>
          </button>
        ))}
      </div>
      <PaginationBar page={page} pageCount={pageCount} onChange={setPage} />
    </>
  );
}
