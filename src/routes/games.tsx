import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Brain, Trophy, Timer, Sparkles, RotateCcw, ArrowRight, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/use-auth";
import { toast } from "sonner";
import { GAMES, GAME_GROUP_LABELS, type Difficulty, type GameDef, type GameQuestion } from "@/lib/games";

export const Route = createFileRoute("/games")({
  component: GamesPage,
  head: () => ({
    meta: [
      { title: "ألعاب ذهنية — المنارة" },
      { name: "description", content: "ألعاب رياضيات ومنطق وتركيز ومعرفة عامة تكسب فيها نقاطًا لمتجر كنز المنارة." },
    ],
  }),
});

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "سهل" },
  { id: "medium", label: "متوسط" },
  { id: "hard", label: "صعب" },
];

function GamesPage() {
  const { user } = useAuthUser();
  const [game, setGame] = useState<GameDef | null>(null);
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [groupFilter, setGroupFilter] = useState<GameDef["group"] | "all">("all");

  const [q, setQ] = useState<GameQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [time, setTime] = useState(60);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; correct: string } | null>(null);
  const [best, setBest] = useState<Record<string, number>>({});
  const [top, setTop] = useState<{ score: number; user_id: string }[]>([]);

  useEffect(() => {
    try { setBest(JSON.parse(localStorage.getItem("almanara-game-best") || "{}")); } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!game) return;
    supabase.from("game_scores" as never)
      .select("score,user_id").eq("game", game.id).order("score", { ascending: false }).limit(10)
      .then(({ data }) => setTop((data as never as { score: number; user_id: string }[]) || []));
  }, [game]);

  const finish = useCallback(async (finalScore: number, gameId: string) => {
    setBest((prev) => {
      const next = { ...prev, [gameId]: Math.max(prev[gameId] || 0, finalScore) };
      try { localStorage.setItem("almanara-game-best", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
    if (finalScore <= 0) return;
    if (!user) { toast.info(`النتيجة: ${finalScore} — سجّل دخولك لكسب النقاط`); return; }
    try {
      await supabase.from("game_scores" as never).insert({ user_id: user.id, game: gameId, score: finalScore } as never);
      const points = Math.min(50, Math.floor(finalScore / 2));
      if (points > 0) {
        await supabase.from("points_ledger" as never).insert({ user_id: user.id, delta: points, reason: "game", ref: gameId } as never);
        toast.success(`+${points} نقطة! نتيجتك: ${finalScore}`);
      }
    } catch { toast.error("تعذّر حفظ النتيجة"); }
  }, [user]);

  useEffect(() => {
    if (!running || !game) return;
    if (time <= 0) { setRunning(false); finish(score, game.id); return; }
    const t = setTimeout(() => setTime((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [running, time, game, score, finish]);

  const start = (g: GameDef) => {
    setGame(g); setScore(0); setStreak(0); setTime(60); setFeedback(null);
    setQ(g.make(diff)); setRunning(true);
  };

  // Changing difficulty must take effect instantly on the current question.
  useEffect(() => {
    if (!game || !running) return;
    setFeedback(null);
    setQ(game.make(diff));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff]);

  const answer = (choice: string) => {
    if (!running || !q || !game || feedback) return;
    const ok = choice === q.correct;
    setFeedback({ ok, correct: q.correct });
    if (ok) { setScore((s) => s + 5 + Math.floor(streak / 3)); setStreak((s) => s + 1); }
    else { setStreak(0); setTime((t) => Math.max(0, t - 3)); }
    setTimeout(() => { setFeedback(null); setQ(game.make(diff)); }, ok ? 350 : 900);
  };

  // ---------- Game picker ----------
  if (!game) {
    const groups = Array.from(new Set(GAMES.map((g) => g.group)));
    const visible = GAMES.filter((g) => groupFilter === "all" || g.group === groupFilter);
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-royal px-4 py-1.5 text-xs font-bold text-gold">
            <Sparkles className="h-3.5 w-3.5" /> ألعاب ذهنية
          </span>
          <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">اختر التحدّي</h1>
          <p className="mt-2 text-sm text-muted-foreground">رياضيات، منطق، ذاكرة، تركيز ومعرفة عامة — 60 ثانية لكل جولة، واكسب نقاطًا لمتجر كنز المنارة.</p>
        </header>

        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {DIFFS.map((d) => (
            <button key={d.id} onClick={() => setDiff(d.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-smooth ${diff === d.id ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/60"}`}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button onClick={() => setGroupFilter("all")}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-smooth ${groupFilter === "all" ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/60"}`}>
            كل الفئات
          </button>
          {groups.map((g) => (
            <button key={g} onClick={() => setGroupFilter(g)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-smooth ${groupFilter === g ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/60"}`}>
              {GAME_GROUP_LABELS[g]}
            </button>
          ))}
        </div>

        {groups
          .filter((grp) => visible.some((g) => g.group === grp))
          .map((grp) => (
          <section key={grp} className="mb-8">
            <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">{GAME_GROUP_LABELS[grp]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.filter((g) => g.group === grp).map((g, i) => (
                <button key={g.id} onClick={() => start(g)} style={{ animationDelay: `${i * 60}ms` }}
                  className="group reveal-up rounded-2xl border border-border bg-card p-5 text-right shadow-card transition-smooth hover:-translate-y-1 hover:border-gold/60 hover:shadow-luxury">
                  <div className="text-3xl">{g.emoji}</div>
                  <h3 className="mt-2 text-base font-extrabold">{g.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-gold">
                    <span>أفضل نتيجة: {best[g.id] || 0}</span>
                    <ArrowRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }


  // ---------- Active game ----------
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <button onClick={() => { setGame(null); setRunning(false); }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowRight className="h-4 w-4" /> كل الألعاب
      </button>

      <header className="mb-6 text-center">
        <div className="text-4xl">{game.emoji}</div>
        <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">{game.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{game.description}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-gold/30 bg-card p-6 shadow-luxury md:col-span-2 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-bold">
              <Timer className="h-4 w-4 text-gold" /> <span className="tabular-nums">{time}s</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-bold">
              <Trophy className="h-4 w-4 text-gold" /> <span className="tabular-nums">{score}</span>
            </div>
          </div>

          {running && q ? (
            <>
              <div className="my-8 text-center text-3xl font-black leading-snug md:text-5xl" dir="auto">{q.prompt}</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {q.choices.map((c, i) => {
                  const isCorrect = feedback && c === feedback.correct;
                  return (
                    <button
                      key={`${c}-${i}`}
                      onClick={() => answer(c)}
                      disabled={!!feedback}
                      dir="auto"
                      className={`rounded-xl border px-4 py-4 text-xl font-extrabold transition-smooth disabled:opacity-90 ${
                        isCorrect ? "border-emerald-500 bg-emerald-500/15" : "border-border bg-secondary hover:border-gold hover:bg-gold/10"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {feedback && (
                <p className={`mt-4 flex items-center justify-center gap-1.5 text-sm font-bold ${feedback.ok ? "text-emerald-600" : "text-destructive"}`}>
                  {feedback.ok ? <><Check className="h-4 w-4" /> إجابة صحيحة</> : <><X className="h-4 w-4" /> الإجابة الصحيحة: {feedback.correct}</>}
                </p>
              )}
              {streak >= 3 && !feedback && <p className="mt-4 text-center text-sm font-bold text-emerald-600">🔥 سلسلة {streak}!</p>}
            </>
          ) : (
            <div className="py-12 text-center">
              <Brain className="mx-auto h-16 w-16 text-gold" />
              <p className="mt-4 text-lg font-bold">انتهت الجولة — نتيجتك {score}</p>
              <p className="mt-1 text-sm text-muted-foreground">أفضل نتيجة: <span className="font-extrabold text-gold">{best[game.id] || 0}</span></p>
              <button onClick={() => start(game)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-8 py-3 text-sm font-bold shadow-gold hover:scale-105" style={{ color: "var(--royal-deep)" }}>
                <RotateCcw className="h-4 w-4" /> العب مجددًا
              </button>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
            <Trophy className="h-5 w-5 text-gold" /> أعلى النتائج
          </h3>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">كن أول لاعب!</p>
          ) : (
            <ol className="space-y-2">
              {top.map((t, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
                  <span className="font-bold">#{i + 1}</span>
                  <span className="font-extrabold tabular-nums text-gold">{t.score}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {DIFFS.map((d) => (
              <button key={d.id} onClick={() => setDiff(d.id)}
                className={`rounded-full border px-3 py-1 text-[11px] font-bold ${diff === d.id ? "border-gold bg-gold/10 text-gold" : "border-border"}`}>
                {d.label}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
