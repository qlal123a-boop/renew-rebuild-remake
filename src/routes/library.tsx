import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, BookMarked, Download, GraduationCap, Library as LibraryIcon, Eye, X } from "lucide-react";
import { GRADES } from "@/lib/curriculum";
import { toInlinePdfSrc, toDownloadSrc } from "@/lib/pdf-src";
import { PdfReader } from "@/components/pdf-reader";


export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "المكتبة الإلكترونية — المنارة" },
      { name: "description", content: "الكتب المدرسية الرسمية للمنهاج الفلسطيني، إضافة إلى مكتبة كتب القراءة العامة." },
    ],
  }),
});

type Book = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  category: "textbook" | "reading";
  grade_id: number | null;
  subject: string | null;
  pdf_url: string;
  cover_url: string | null;
};

function LibraryPage() {
  const [items, setItems] = useState<Book[]>([]);
  const [tab, setTab] = useState<"textbook" | "reading">("textbook");
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Book | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("library_books")
      .select("id,title,author,description,category,grade_id,subject,pdf_url,cover_url")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as Book[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((b) => {
        if (b.category !== tab) return false;
        if (tab === "textbook" && gradeFilter !== "all" && b.grade_id !== gradeFilter) return false;
        return true;
      }),
    [items, tab, gradeFilter],
  );

  return (
    <div className="page-shell py-8 md:py-10">
      <header className="mb-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-royal text-gold shadow-luxury">
          <LibraryIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold md:text-4xl">المكتبة الإلكترونية</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          الكتب المدرسية الرسمية للمنهاج الفلسطيني — وقسم مخصّص للقراءة الخارجية (قصص، روايات، ثقافة عامة).
        </p>
        <div className="gold-divider mx-auto mt-5 w-24" />
      </header>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setTab("textbook")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-smooth ${
            tab === "textbook" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border bg-card hover:border-gold/60"
          }`}
        >
          <BookOpen className="h-4 w-4" /> الكتب المدرسية
        </button>
        <button
          onClick={() => setTab("reading")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-smooth ${
            tab === "reading" ? "bg-gradient-royal text-gold shadow-luxury" : "border border-border bg-card hover:border-gold/60"
          }`}
        >
          <BookMarked className="h-4 w-4" /> مكتبة القراءة
        </button>
      </div>

      {/* Grade filter for textbooks */}
      {tab === "textbook" && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setGradeFilter("all")}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-smooth ${
              gradeFilter === "all" ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/60"
            }`}
          >
            كل الصفوف
          </button>
          {GRADES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGradeFilter(g.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-smooth ${
                gradeFilter === g.id ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/60"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          لا توجد كتب بعد في هذا القسم.{" "}
          <Link to="/admin-panel" className="text-primary underline">أضف من لوحة الإدارة</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((b) => (
            <article key={b.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury">
              {b.cover_url ? (
                <img src={b.cover_url} alt={b.title} className="h-52 w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-52 w-full place-items-center bg-gradient-royal text-gold">
                  {b.category === "textbook" ? <GraduationCap className="h-14 w-14" /> : <BookMarked className="h-14 w-14" />}
                </div>
              )}
              <div className="p-4">
                {b.grade_id && (
                  <div className="text-[11px] font-bold text-muted-foreground">
                    {GRADES.find((g) => g.id === b.grade_id)?.name}
                    {b.subject ? ` · ${b.subject}` : ""}
                  </div>
                )}
                <h3 className="mt-1 line-clamp-2 text-base font-extrabold leading-snug">{b.title}</h3>
                {b.author && <p className="mt-0.5 text-xs text-muted-foreground">{b.author}</p>}
                {b.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{b.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setViewing(b)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-extrabold shadow-gold"
                    style={{ color: "var(--royal-deep)" }}
                  >
                    <Eye className="h-3.5 w-3.5" /> قراءة داخل الموقع
                  </button>
                  <a
                    href={toDownloadSrc(b.pdf_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 px-3 py-2 text-xs font-bold text-royal-deep hover:bg-gold/10"
                  >
                    <Download className="h-3.5 w-3.5" /> تنزيل
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setViewing(null)}>
          <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-luxury" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-royal px-4 py-3 text-gold">
              <h3 className="truncate text-sm font-extrabold">{viewing.title}</h3>
              <div className="flex items-center gap-2">
                <a href={toDownloadSrc(viewing.pdf_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-extrabold" style={{ color: "var(--royal-deep)" }}>
                  <Download className="h-3.5 w-3.5" /> تنزيل
                </a>
                <button onClick={() => setViewing(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <PdfReader key={viewing.id} src={toInlinePdfSrc(viewing.pdf_url)} downloadUrl={viewing.pdf_url} title={viewing.title} />
            </div>


          </div>
        </div>
      )}
    </div>
  );
}
