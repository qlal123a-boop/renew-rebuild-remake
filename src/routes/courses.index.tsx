import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GRADES } from "@/lib/curriculum";
import { COURSE_CATEGORY_LABELS } from "@/lib/certificate-theme";
import { PlayCircle, GraduationCap, Code2, BookOpen, Calculator, BookMarked, Leaf, Languages, Sparkles } from "lucide-react";

export const Route = createFileRoute("/courses/")({
  component: CoursesPage,
  head: () => ({
    meta: [
      { title: "الكورسات — المنارة" },
      { name: "description", content: "كورسات تعليمية متكاملة لطلاب المنهاج الفلسطيني مصنّفة حسب الموضوع." },
    ],
  }),
});

type CourseRow = {
  id: string; title: string; description: string; subject: string;
  grade_id: number | null; thumbnail_url: string | null;
  category: string | null;
};

const CATEGORY_TABS: { id: string; label: string; Icon: typeof Code2 }[] = [
  { id: "all", label: "كل الكورسات", Icon: Sparkles },
  { id: "programming", label: COURSE_CATEGORY_LABELS.programming, Icon: Code2 },
  { id: "arabic", label: COURSE_CATEGORY_LABELS.arabic, Icon: BookOpen },
  { id: "math", label: COURSE_CATEGORY_LABELS.math, Icon: Calculator },
  { id: "tajweed", label: COURSE_CATEGORY_LABELS.tajweed, Icon: BookMarked },
  { id: "science", label: COURSE_CATEGORY_LABELS.science, Icon: Leaf },
  { id: "english", label: COURSE_CATEGORY_LABELS.english, Icon: Languages },
  { id: "other", label: COURSE_CATEGORY_LABELS.other, Icon: GraduationCap },
];

function CoursesPage() {
  const [items, setItems] = useState<CourseRow[]>([]);
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    supabase.from("courses").select("id,title,description,subject,grade_id,thumbnail_url,category")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as CourseRow[]) || []));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (category !== "all" && (c.category || "other") !== category) return false;
      return true;
    });
  }, [items, category]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold md:text-4xl">الكورسات التعليمية</h1>
        <p className="mt-2 text-sm text-muted-foreground">كورسات مصنّفة حسب الموضوع — اختر فئتك</p>
        <div className="gold-divider mx-auto mt-6 w-32" />
      </header>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {CATEGORY_TABS.map((t) => {
          const active = category === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCategory(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-smooth ${
                active
                  ? "border-transparent bg-gradient-royal text-gold shadow-luxury"
                  : "border-border bg-card hover:border-gold/60"
              }`}
            >
              <t.Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <p className="mb-6 text-center text-xs text-muted-foreground">كورسات مدرسية وعامة — متاحة للجميع</p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          لا توجد كورسات في هذا التصنيف. <Link to="/admin-panel" className="text-primary underline">أضف من لوحة الإدارة</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/courses/$courseId"
              params={{ courseId: c.id }}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury"
            >
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt={c.title} className="h-44 w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-44 w-full place-items-center bg-gradient-royal text-gold">
                  <GraduationCap className="h-14 w-14" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>{c.subject}{c.grade_id ? ` · ${GRADES.find((g) => g.id === c.grade_id)?.name}` : " · كورس عام"}</span>
                  {c.category && c.category !== "other" && (
                    <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
                      {COURSE_CATEGORY_LABELS[c.category] || ""}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-extrabold leading-snug">{c.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                  <PlayCircle className="h-4 w-4" /> ابدأ الكورس
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
