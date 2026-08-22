import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseLessons, useCourseProgress } from "@/lib/course-progress";
import { toYouTubeEmbed, YT_IFRAME_ALLOW } from "@/lib/youtube";
import { themeForCategory } from "@/lib/certificate-theme";
import { CheckCircle2, Circle, Award, ArrowRight, ArrowLeft, PlayCircle, X, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateQuiz, type QuizQuestion } from "@/lib/exam.functions";
// auth gating removed — anyone can view course; login required only to save progress/issue cert

export const Route = createFileRoute("/courses/$courseId")({
  component: CourseDetailPage,
  head: () => ({ meta: [{ title: "تفاصيل الكورس — المنارة" }] }),
});

type CourseRow = {
  id: string; title: string; description: string; subject: string; grade_id: number | null;
  video_url: string | null; thumbnail_url: string | null;
  auto_certificate_theme: boolean; certificate_theme: string | null;
  category: string | null; pass_threshold: number | null;
};

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [examOpen, setExamOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [issuingCert, setIssuingCert] = useState(false);
  const { lessons, loading: lessonsLoading } = useCourseLessons(courseId);
  const { done, completedAt, markDone, completeCourse, user } = useCourseProgress(courseId);

  useEffect(() => {
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle()
      .then(({ data }) => setCourse(data as CourseRow));
  }, [courseId]);

  useEffect(() => {
    if (!active && lessons.length) setActive(lessons[0].id);
  }, [lessons, active]);

  if (!course) return <div className="p-12 text-center text-muted-foreground">جارٍ التحميل...</div>;

  const playList = lessons.length
    ? lessons
    : (course.video_url
      ? [{ id: course.id, title: course.title, description: course.description, video_url: course.video_url, position: 0 }]
      : []);

  const activeLesson = playList.find((l) => l.id === active) ?? playList[0];
  const totalCount = playList.length;
  const doneCount = playList.filter((l) => done.has(l.id)).length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && doneCount === totalCount;
  

  return (
    <div className="page-shell py-8 md:py-10">
      <Link to="/courses" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowRight className="h-4 w-4 rotate-180" /> العودة للكورسات
      </Link>

      <header className="mb-6">
        <div className="text-xs font-bold text-muted-foreground">{course.subject}</div>
        <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{course.title}</h1>
        {course.description && <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>}
      </header>

      <div className="mb-6 rounded-2xl border border-gold/30 bg-card p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span>التقدّم: {doneCount} / {totalCount}</span>
          <span className="text-gold">{pct}%</span>
        </div>
        <Progress value={pct} />
        {allDone && (
          completedAt ? (
            <Link to="/courses/$courseId/certificate" params={{ courseId }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-extrabold shadow-gold" style={{ color: "var(--royal-deep)" }}>
              <Award className="h-5 w-5" /> عرض شهادتك
            </Link>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => {
                if (!user) { toast.error("سجّل دخولك أولًا"); navigate({ to: "/login" }); return; }
                setNameOpen(true);
              }} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-extrabold shadow-gold animate-pulse" style={{ color: "var(--royal-deep)" }}>
                <Award className="h-5 w-5" /> احصل على شهادتك الآن
              </button>
              <button onClick={() => {
                if (!user) { toast.error("سجّل دخولك أولًا"); navigate({ to: "/login" }); return; }
                setExamOpen(true);
              }} className="inline-flex items-center gap-2 rounded-xl border border-gold/40 px-5 py-2.5 text-sm font-bold hover:bg-gold/10">
                <Sparkles className="h-4 w-4 text-gold" /> امتحان نهائي اختياري
              </button>
            </div>
          )
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">{allDone ? "أحسنت! أكملت جميع الدروس — استلم شهادتك." : `تابع مشاهدة الدروس — أكمل ${totalCount - doneCount} درس${(totalCount - doneCount) > 1 ? "ًا" : ""} للحصول على الشهادة.`}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {activeLesson && toYouTubeEmbed(activeLesson.video_url) ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                key={activeLesson.id}
                src={toYouTubeEmbed(activeLesson.video_url)}
                title={activeLesson.title}
                allow={YT_IFRAME_ALLOW}
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="grid aspect-video w-full place-items-center bg-secondary text-muted-foreground">
              <PlayCircle className="h-12 w-12" />
              <p className="mt-2 text-sm">لا يوجد فيديو متاح</p>
            </div>
          )}
          {activeLesson && (
            <div className="p-5">
              <h2 className="text-xl font-extrabold">{activeLesson.title}</h2>
              {activeLesson.description && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{activeLesson.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={async () => {
                    await markDone(activeLesson.id);
                    const idx = playList.findIndex(l => l.id === activeLesson.id);
                    const next = playList[idx + 1];
                    if (next) setActive(next.id);
                  }}
                  disabled={done.has(activeLesson.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-4 py-2 text-sm font-bold text-gold shadow-luxury disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" /> {done.has(activeLesson.id) ? "مُنجَز" : "إنهاء الدرس والانتقال للتالي"}
                </button>
                {(() => {
                  const idx = playList.findIndex(l => l.id === activeLesson.id);
                  const prev = playList[idx - 1];
                  const next = playList[idx + 1];
                  return (
                    <>
                      <button
                        onClick={() => prev && setActive(prev.id)}
                        disabled={!prev}
                        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-secondary disabled:opacity-40"
                      >
                        <ArrowRight className="h-4 w-4" /> السابق
                      </button>
                      <button
                        onClick={() => next && setActive(next.id)}
                        disabled={!next}
                        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-secondary disabled:opacity-40"
                      >
                        التالي <ArrowLeft className="h-4 w-4" />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="mb-2 px-2 text-sm font-extrabold">قائمة الدروس</div>
          {lessonsLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">جارٍ التحميل...</div>
          ) : playList.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">لا توجد دروس بعد.</div>
          ) : (
            <ul className="max-h-[600px] space-y-1 overflow-y-auto">
              {playList.map((l, i) => {
                const isDone = done.has(l.id);
                const isActive = active === l.id;
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setActive(l.id)}
                      className={`flex w-full items-start gap-2 rounded-lg p-2 text-right text-xs transition-smooth ${
                        isActive ? "bg-gradient-royal text-gold" : "hover:bg-secondary"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{i + 1}. {l.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {examOpen && (
        <FinalExamModal
          course={course}
          lessonTitles={playList.map(l => l.title)}
          onClose={() => setExamOpen(false)}
          onPass={async (score, total, name) => {
            const theme = course.auto_certificate_theme
              ? themeForCategory(course.category, `${course.title} ${course.subject}`)
              : (course.certificate_theme || themeForCategory(course.category, `${course.title} ${course.subject}`));
            const res = await completeCourse(theme);
            if (!res) return;
            await supabase.from("course_completions").update({
              final_exam_score: score, final_exam_total: total, student_name: name,
            }).eq("user_id", user!.id).eq("course_id", courseId);
            toast.success("مبارك! تم إصدار الشهادة 🎉");
            setExamOpen(false);
            navigate({ to: "/courses/$courseId/certificate", params: { courseId } });
          }}
        />
      )}

      {nameOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => !issuingCert && setNameOpen(false)}>
          <div className="relative w-full max-w-md rounded-2xl border border-gold/40 bg-card p-6 shadow-luxury" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => !issuingCert && setNameOpen(false)} className="absolute left-4 top-4 rounded-full p-1 hover:bg-secondary"><X className="h-5 w-5" /></button>
            <Award className="mx-auto h-12 w-12 text-gold" />
            <h2 className="mt-2 text-center text-xl font-extrabold">شهادة الإتمام</h2>
            <p className="mt-1 text-center text-xs text-muted-foreground">أكملت جميع دروس الكورس — اكتب اسمك الكامل ليظهر على الشهادة.</p>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="مثال: أحمد محمد علي"
              className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-sm outline-none focus:border-gold"
              autoFocus
            />
            <button
              disabled={issuingCert || !studentName.trim()}
              onClick={async () => {
                if (!studentName.trim()) { toast.error("اكتب اسمك الكامل"); return; }
                setIssuingCert(true);
                try {
                  const theme = course.auto_certificate_theme
                    ? themeForCategory(course.category, `${course.title} ${course.subject}`)
                    : (course.certificate_theme || themeForCategory(course.category, `${course.title} ${course.subject}`));
                  const res = await completeCourse(theme);
                  if (!res) return;
                  await supabase.from("course_completions").update({
                    student_name: studentName.trim(),
                  }).eq("user_id", user!.id).eq("course_id", courseId);
                  toast.success("مبارك! تم إصدار شهادتك 🎉");
                  setNameOpen(false);
                  navigate({ to: "/courses/$courseId/certificate", params: { courseId } });
                } finally { setIssuingCert(false); }
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-sm font-extrabold shadow-gold disabled:opacity-50"
              style={{ color: "var(--royal-deep)" }}
            >
              <Award className="h-4 w-4" /> {issuingCert ? "جارٍ الإصدار..." : "إصدار الشهادة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FinalExamModal({ course, lessonTitles, onClose, onPass }: {
  course: CourseRow;
  lessonTitles: string[];
  onClose: () => void;
  onPass: (score: number, total: number, name: string) => Promise<void>;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<"loading" | "quiz" | "result" | "name">("loading");
  const [score, setScore] = useState(0);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const gen = useServerFn(generateQuiz);
  const pass = course.pass_threshold ?? 50;

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const topic = `${course.title} — يغطّي: ${lessonTitles.slice(0, 10).join("، ")}`;
        const r = await gen({ data: { topic, count: 8, difficulty: "medium" } });
        if (cancel) return;
        if (!r.ok) { toast.error(r.error); onClose(); return; }
        setQuestions(r.questions);
        setPhase("quiz");
      } catch (e) { toast.error((e as Error).message); onClose(); }
    })();
    return () => { cancel = true; };
  }, [gen, course.title, lessonTitles, onClose]);

  const submit = () => {
    if (!questions) return;
    const s = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
    setScore(s);
    const pct = Math.round((s / questions.length) * 100);
    if (pct >= pass) setPhase("name");
    else setPhase("result");
  };

  const finish = async () => {
    if (!questions) return;
    if (!name.trim()) { toast.error("اكتب اسمك ثلاثيًا للشهادة"); return; }
    setSubmitting(true);
    await onPass(score, questions.length, name.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/40 bg-card p-6 shadow-luxury">
        <button onClick={onClose} className="absolute left-4 top-4 rounded-full p-1 hover:bg-secondary"><X className="h-5 w-5" /></button>
        <h2 className="mb-2 flex items-center gap-2 text-xl font-extrabold"><Sparkles className="h-5 w-5 text-gold" /> الامتحان النهائي</h2>
        <p className="mb-4 text-xs text-muted-foreground">اجتياز {pass}% فأعلى يمنحك شهادة الإتمام.</p>

        {phase === "loading" && <div className="py-12 text-center text-sm text-muted-foreground">جارٍ توليد الأسئلة...</div>}

        {phase === "quiz" && questions && (
          <>
            <ol className="space-y-4">
              {questions.map((q, i) => (
                <li key={i} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-2 text-sm font-bold">{i + 1}. {q.question}</div>
                  <div className="grid gap-1.5">
                    {q.options.map((opt, j) => (
                      <label key={j} className={`cursor-pointer rounded-md border p-2 text-xs transition-smooth ${answers[i] === j ? "border-gold bg-gold/10 font-bold" : "border-border hover:bg-secondary"}`}>
                        <input type="radio" name={`q-${i}`} className="ms-1 accent-gold" checked={answers[i] === j} onChange={() => setAnswers({ ...answers, [i]: j })} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <button onClick={submit} disabled={Object.keys(answers).length !== questions.length} className="mt-5 w-full rounded-xl bg-gradient-gold py-2.5 text-sm font-extrabold shadow-gold disabled:opacity-50" style={{ color: "var(--royal-deep)" }}>
              تسليم الامتحان
            </button>
          </>
        )}

        {phase === "result" && questions && (
          <div className="py-6 text-center">
            <div className="text-4xl font-extrabold text-destructive">{Math.round((score / questions.length) * 100)}%</div>
            <p className="mt-2 text-sm">حصلت على {score} من {questions.length}.</p>
            <p className="mt-1 text-xs text-muted-foreground">لم تجتز نسبة {pass}%. شاهد الدروس مجددًا وحاول مرة أخرى.</p>
            <button onClick={() => { setQuestions(null); setAnswers({}); setPhase("loading"); }} className="mt-4 rounded-xl bg-gradient-royal px-5 py-2 text-sm font-bold text-gold">
              امتحان جديد
            </button>
          </div>
        )}

        {phase === "name" && questions && (
          <div className="py-4 text-center">
            <Award className="mx-auto h-12 w-12 text-gold" />
            <div className="mt-2 text-3xl font-extrabold text-emerald-600">{Math.round((score / questions.length) * 100)}%</div>
            <p className="mt-1 text-sm font-bold">مبارك! اجتزت الامتحان 🎉</p>
            <label className="mx-auto mt-4 block max-w-sm text-right text-xs font-bold">اكتب اسمك كاملًا كما تريده على الشهادة:</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد محمد علي" className="mx-auto mt-1 block w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-center text-sm" />
            <button onClick={finish} disabled={submitting || !name.trim()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-6 py-2.5 text-sm font-extrabold shadow-gold disabled:opacity-50" style={{ color: "var(--royal-deep)" }}>
              <Award className="h-4 w-4" /> {submitting ? "جارٍ الإصدار..." : "إصدار الشهادة"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
