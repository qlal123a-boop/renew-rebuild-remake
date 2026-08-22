import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Sparkles, CheckCircle2, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { GRADES, subjectsForGrade } from "@/lib/curriculum";
import { generateQuiz, type QuizQuestion } from "@/lib/quiz-generator.functions";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/quiz-generator")({
  component: QuizGeneratorPage,
  head: () => ({
    meta: [
      { title: "مولّد الاختبارات الذكي — المنارة" },
      { name: "description", content: "أنشئ اختبارات تفاعلية بالذكاء الاصطناعي حسب الصف والمادة والدرس وعدد الأسئلة." },
    ],
  }),
});

function QuizGeneratorPage() {
  return (
    <RequireAuth>
      <QuizGeneratorInner />
    </RequireAuth>
  );
}

function QuizGeneratorInner() {
  const [grade, setGrade] = useState<number>(7);
  const [subject, setSubject] = useState<string>(subjectsForGrade(7)[0] || "");
  const [lesson, setLesson] = useState<string>("");
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gen = useServerFn(generateQuiz);
  const subjects = subjectsForGrade(grade);

  async function handleGenerate() {
    if (!lesson.trim()) {
      setError("اكتب اسم الدرس أو الوحدة أولًا");
      return;
    }
    setLoading(true);
    setError(null);
    setQuestions(null);
    setAnswers({});
    setSubmitted(false);
    try {
      const gradeName = GRADES.find((g) => g.id === grade)?.name || `الصف ${grade}`;
      const res = await gen({ data: { grade: gradeName, subject, lesson: lesson.trim(), count, difficulty } });
      if ("error" in res) setError(res.error ?? "حدث خطأ");
      else setQuestions(res.questions);
    } catch (e) {
      setError("تعذّر الاتصال بالخدمة. حاول مجددًا.");
    } finally {
      setLoading(false);
    }
  }

  const score = questions ? questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-royal px-4 py-1.5 text-xs font-bold text-gold">
          <Sparkles className="h-3.5 w-3.5" /> ذكاء اصطناعي
        </span>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">مولّد الاختبارات الذكي</h1>
        <p className="mt-2 text-sm text-muted-foreground">اختر الصف، المادة، الدرس، وعدد الأسئلة — وسنولّد لك اختبارًا فوريًا.</p>
      </header>

      <div className="rounded-3xl border border-gold/30 bg-card p-6 shadow-luxury">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">الصف</label>
            <select
              value={grade}
              onChange={(e) => {
                const g = Number(e.target.value);
                setGrade(g);
                const subs = subjectsForGrade(g);
                if (!subs.includes(subject)) setSubject(subs[0] || "");
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">المادة</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold text-muted-foreground">الدرس / الوحدة</label>
            <input
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              placeholder="مثال: الجملة الاسمية، أو الكسور، أو Past Simple…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">عدد الأسئلة</label>
            <div className="mb-1 text-[11px] text-muted-foreground">يمكنك توليد ما يصل إلى 50 سؤالًا.</div>
            <input
              type="number" min={1} max={50} value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">المستوى</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as "easy"|"medium"|"hard")} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-400/40 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 text-sm font-bold shadow-gold transition hover:scale-[1.01] disabled:opacity-60"
          style={{ color: "var(--royal-deep)" }}
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري التوليد…</> : <><Brain className="h-4 w-4" /> ولّد الاختبار</>}
        </button>
      </div>

      {questions && (
        <div className="mt-8 space-y-4">
          {submitted && (
            <div className="rounded-2xl border border-gold/40 bg-gradient-royal p-5 text-center text-gold shadow-luxury">
              <div className="text-sm font-bold">نتيجتك</div>
              <div className="mt-1 text-3xl font-black tabular-nums">{score} / {questions.length}</div>
              <button
                onClick={() => { setSubmitted(false); setAnswers({}); }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-bold"
                style={{ color: "var(--royal-deep)" }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> أعد المحاولة
              </button>
            </div>
          )}

          {questions.map((q, i) => {
            const userAns = answers[i];
            const correct = q.answer;
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-start gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-royal text-xs font-bold text-gold">{i + 1}</span>
                  <h3 className="font-bold leading-relaxed">{q.q}</h3>
                </div>
                <div className="grid gap-2">
                  {q.options.map((opt, idx) => {
                    const picked = userAns === idx;
                    const isCorrect = submitted && idx === correct;
                    const isWrong = submitted && picked && idx !== correct;
                    return (
                      <button
                        key={idx}
                        disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: idx }))}
                        className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-right text-sm transition ${
                          isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : isWrong ? "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
                          : picked ? "border-gold bg-gold/10"
                          : "border-border hover:bg-secondary"
                        }`}
                      >
                        <span>{opt}</span>
                        {isCorrect && <CheckCircle2 className="h-4 w-4" />}
                        {isWrong && <XCircle className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">الشرح: </span>{q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {!submitted && (
            <button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length < questions.length}
              className="w-full rounded-xl bg-gradient-royal px-6 py-3 text-sm font-bold text-gold shadow-luxury disabled:opacity-60"
            >
              تسليم الاختبار
            </button>
          )}
        </div>
      )}
    </div>
  );
}
