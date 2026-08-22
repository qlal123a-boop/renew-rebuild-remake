import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { useLessons, useWorksheets } from "@/lib/storage";
import { BookOpen, ArrowLeft, ArrowRight, FileText, Youtube, Bot, PlayCircle, ChevronLeft, CheckCircle2, Circle } from "lucide-react";
import { useLessonProgress } from "@/lib/lesson-progress";
import { usePagination, PaginationBar } from "@/components/paginated-list";

const search = z.object({
  g: z.coerce.number().int().min(1).max(12).optional(),
  s: z.string().optional(),
  sem: z.coerce.number().int().min(1).max(2).optional(),
  l: z.string().optional(),
});

export const Route = createFileRoute("/grades")({
  validateSearch: search,
  component: GradesPage,
  head: () => ({
    meta: [
      { title: "الصفوف المدرسية — المنارة" },
      { name: "description", content: "اختر صفك من الصف الأول حتى الثاني عشر لاستكشاف المواد والدروس." },
    ],
  }),
});

const STAGE_COLORS: Record<string, string> = {
  "الأساسية": "from-emerald-500/20 to-teal-500/10",
  "الإعدادية": "from-amber-400/20 to-orange-500/10",
  "الثانوية": "from-fuchsia-500/20 to-rose-500/10",
};

import { toYouTubeEmbed, YT_IFRAME_ALLOW } from "@/lib/youtube";

function GradesPage() {
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const { items: lessons } = useLessons();
  const { items: worksheets } = useWorksheets();
  const { isCompleted, toggle: toggleProgress } = useLessonProgress();

  const grade = sp.g ? GRADES.find((g) => g.id === sp.g) : null;
  const subjects = grade ? subjectsForGrade(grade.id) : [];
  const subject = sp.s && subjects.includes(sp.s) ? sp.s : null;
  const sem = (sp.sem as 1 | 2 | undefined) ?? 1;

  const lessonList = useMemo(
    () => grade && subject
      ? lessons.filter((x) => x.gradeId === grade.id && x.subject === subject && x.semester === sem)
      : [],
    [lessons, grade, subject, sem]
  );

  const lesson = sp.l ? lessons.find((x) => x.id === sp.l) : null;

  // ---------- Lesson view ----------
  if (lesson) {
    const embed = toYouTubeEmbed(lesson.videoUrl);
    return (
      <div className="mx-auto max-w-5xl px-5 py-10">
        <button onClick={() => navigate({ search: { g: lesson.gradeId, s: lesson.subject, sem: lesson.semester } })} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-gold">
          <ChevronLeft className="h-4 w-4" /> العودة لقائمة الدروس
        </button>
        <div className="rounded-3xl border border-gold/40 bg-card p-6 shadow-luxury md:p-8">
          <div className="mb-2 text-xs font-bold text-muted-foreground">
            {GRADES.find((g) => g.id === lesson.gradeId)?.name} · {lesson.subject} · الفصل {lesson.semester === 1 ? "الأول" : "الثاني"}
          </div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{lesson.title}</h1>
          <div className="gold-divider mt-4 w-24" />
          <p className="mt-4 leading-loose text-foreground/90">{lesson.description}</p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-black aspect-video">
            {embed ? (
              <iframe
                src={embed}
                title={lesson.title}
                className="h-full w-full"
                allow={YT_IFRAME_ALLOW}
                allowFullScreen
              />
            ) : (
              <div className="grid h-full place-items-center p-8 text-center text-primary-foreground">
                <div>
                  <PlayCircle className="mx-auto h-16 w-16 text-gold" />
                  <p className="mt-3 text-sm">لا يوجد فيديو مُضمّن — افتحه على يوتيوب لمشاهدته.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-bold shadow-gold transition-smooth hover:scale-[1.02]" style={{ color: "var(--royal-deep)" }}>
              <Youtube className="h-4 w-4" /> فتح على يوتيوب
            </a>
            {lesson.worksheetUrl ? (
              <a href={lesson.worksheetUrl} target="_blank" rel="noreferrer" download={lesson.worksheetName} className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-5 py-3 text-sm font-bold text-gold shadow-luxury transition-smooth hover:scale-[1.02]">
                <FileText className="h-4 w-4" /> تحميل ورقة العمل
              </a>
            ) : null}
            <Link to="/tutor" className="inline-flex items-center gap-2 rounded-xl border border-gold/50 bg-card px-5 py-3 text-sm font-bold transition-smooth hover:border-gold">
              <Bot className="h-4 w-4 text-gold" /> اسأل المعلم الذكي
            </Link>
            <button
              onClick={() => toggleProgress(lesson.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-smooth hover:scale-[1.02] ${isCompleted(lesson.id) ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40" : "border border-border bg-card hover:border-emerald-500/60"}`}
            >
              {isCompleted(lesson.id) ? <><CheckCircle2 className="h-4 w-4" /> تم الإنجاز — إلغاء</> : <><Circle className="h-4 w-4" /> وضع كمُنجَز</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Lesson list ----------
  if (grade && subject) {
    const doneCount = lessonList.filter((l) => isCompleted(l.id)).length;
    const pct = lessonList.length ? Math.round((doneCount / lessonList.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <button onClick={() => navigate({ search: { g: grade.id } })} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-gold">
          <ChevronLeft className="h-4 w-4" /> العودة لمواد {grade.name}
        </button>
        <header className="mb-6">
          <div className="text-xs font-bold uppercase text-muted-foreground">{grade.name}</div>
          <h1 className="mt-1 text-3xl font-extrabold">دروس {subject}</h1>
          {lessonList.length > 0 && (
            <div className="mt-4 rounded-xl border border-gold/30 bg-card/60 p-3 backdrop-blur">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>تقدّمك في هذا الفصل</span>
                <span className="text-gold">{doneCount} / {lessonList.length} ({pct}%)</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-gold transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </header>

        <div className="mb-6 inline-flex rounded-xl border border-gold/30 bg-card p-1 shadow-card">
          {[1, 2].map((s) => (
            <button
              key={s}
              onClick={() => navigate({ search: { g: grade.id, s: subject, sem: s as 1 | 2 } })}
              className={`rounded-lg px-5 py-2 text-sm font-bold transition-smooth ${sem === s ? "bg-gradient-royal text-gold" : "text-muted-foreground hover:text-foreground"}`}
            >
              الفصل {s === 1 ? "الأول" : "الثاني"}
            </button>
          ))}
        </div>

        {lessonList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            لا توجد دروس مُضافة بعد لهذا الفصل. يمكن إضافتها من لوحة الإدارة.
          </div>
        ) : (
          <PagedLessons
            lessonList={lessonList}
            gradeId={grade.id}
            subject={subject}
            sem={sem}
            isCompleted={isCompleted}
            navigate={navigate}
          />
        )}
      </div>
    );
  }

  // ---------- Subjects view ----------
  if (grade) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10">
        <button onClick={() => navigate({ search: {} })} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-gold">
          <ChevronLeft className="h-4 w-4" /> العودة للصفوف
        </button>
        <header className="mb-8">
          <div className="text-xs font-bold uppercase text-muted-foreground">المرحلة {grade.stage}</div>
          <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">مواد {grade.name}</h1>
          <div className="gold-divider mt-4 w-24" />
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => navigate({ search: { g: grade.id, s, sem: 1 } })}
              className="group rounded-2xl border border-border bg-card p-5 text-right shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-royal text-gold">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-extrabold">{s}</div>
                  <div className="text-xs text-muted-foreground">الفصل الأول والثاني</div>
                </div>
                <ArrowLeft className="h-4 w-4 text-gold opacity-0 transition-smooth group-hover:opacity-100" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
                <Link to="/worksheets" search={{ grade: grade.id, subject: s }} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 hover:bg-gold/20">
                  <FileText className="h-3 w-3" /> أوراق عمل
                </Link>
                <Link to="/channels" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 hover:bg-gold/20">
                  <Youtube className="h-3 w-3" /> قنوات
                </Link>
              </div>
            </button>
          ))}
        </div>

        {/* Worksheets section for this grade */}
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-extrabold">
                <FileText className="h-6 w-6 text-gold" /> أوراق العمل — {grade.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">حمّل أوراق العمل الرسمية لكل مادة</p>
            </div>
            <Link to="/worksheets" search={{ grade: grade.id }} className="text-sm font-bold text-primary hover:text-gold">عرض الكل ←</Link>
          </div>
          {(() => {
            const list = worksheets.filter((w) => w.gradeId === grade.id);
            if (list.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  لا توجد أوراق عمل بعد لهذا الصف. ستظهر هنا فور إضافتها من لوحة الإدارة.
                </div>
              );
            }
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((w) => (
                  <a
                    key={w.id}
                    href={w.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-royal text-gold">
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold" style={{ color: "var(--royal-deep)" }}>
                        {w.subject}
                      </span>
                    </div>
                    <h3 className="mt-4 font-extrabold leading-snug">{w.title}</h3>
                    {w.source && <p className="mt-1 text-xs text-muted-foreground">{w.source}</p>}
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-gold">
                      تحميل / عرض ←
                    </div>
                  </a>
                ))}
              </div>
            );
          })()}
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold md:text-4xl">الصفوف المدرسية</h1>
        <p className="mt-2 text-sm text-muted-foreground">اختر صفك لاستعراض موادك ودروس الفصلين الأول والثاني</p>
        <div className="gold-divider mx-auto mt-6 w-32" />
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {GRADES.map((g) => (
          <button
            key={g.id}
            onClick={() => navigate({ search: { g: g.id } })}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-right shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury"
          >
            <div className={`absolute inset-0 bg-gradient-to-br opacity-60 ${STAGE_COLORS[g.stage]}`} />
            <div className="relative">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{g.stage}</div>
              <div className="mt-1 text-base font-extrabold leading-tight">{g.name}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-royal text-gold">
                  <BookOpen className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-gold opacity-0 transition-smooth group-hover:opacity-100" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type Lesson = ReturnType<typeof useLessons>["items"][number];
function PagedLessons({
  lessonList, gradeId, subject, sem, isCompleted, navigate,
}: {
  lessonList: Lesson[];
  gradeId: number;
  subject: string;
  sem: 1 | 2;
  isCompleted: (id: string) => boolean;
  navigate: ReturnType<typeof Route.useNavigate>;
}) {
  const { slice, page, pageCount, setPage } = usePagination(lessonList, 15);
  const startIndex = (page - 1) * 15;
  return (
    <>
      <ol className="grid gap-3">
        {slice.map((les, i) => {
          const done = isCompleted(les.id);
          return (
            <li key={les.id}>
              <button
                onClick={() => navigate({ search: { g: gradeId, s: subject, sem, l: les.id } })}
                className={`group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-right shadow-card transition-smooth hover:-translate-y-0.5 hover:shadow-luxury ${done ? "border-emerald-500/50 hover:border-emerald-500" : "border-border hover:border-gold/60"}`}
              >
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl font-extrabold ${done ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" : "bg-gradient-royal text-gold"}`}>
                  {done ? <CheckCircle2 className="h-6 w-6" /> : startIndex + i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-extrabold">{les.title}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{les.description}</div>
                </div>
                <PlayCircle className="h-7 w-7 shrink-0 text-gold opacity-70 group-hover:opacity-100" />
                <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-gold" />
              </button>
            </li>
          );
        })}
      </ol>
      <PaginationBar page={page} pageCount={pageCount} onChange={setPage} />
    </>
  );
}
