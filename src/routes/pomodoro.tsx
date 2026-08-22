import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, Trophy, TreePine, Flower2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/pomodoro")({
  component: PomodoroRoom,
  head: () => ({
    meta: [
      { title: "جلسة التركيز (بومودورو) — المنارة التعليمية" },
      { name: "description", content: "ادرس بجلسات تركيز قابلة للتخصيص وشاهد شجرتك تنمو مع كل جلسة." },
    ],
  }),
});

const PRESETS = [
  { id: "25-5", label: "25 / 5", focus: 25 * 60, brk: 5 * 60 },
  { id: "30-10", label: "30 / 10", focus: 30 * 60, brk: 10 * 60 },
  { id: "50-10", label: "50 / 10", focus: 50 * 60, brk: 10 * 60 },
] as const;

const VISUALS = [
  { id: "tree", label: "شجرة", icon: TreePine },
  { id: "flower", label: "زهرة", icon: Flower2 },
  { id: "rocket", label: "صاروخ", icon: Rocket },
] as const;

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

function GrowingVisual({ pct, phase, kind }: { pct: number; phase: "focus" | "break"; kind: "tree" | "flower" | "rocket" }) {
  const grow = Math.max(0.1, pct / 100);
  const isBreak = phase === "break";

  return (
    <div className="relative mx-auto grid h-[420px] w-full max-w-md place-items-end overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900/40 shadow-luxury">
      <div className={`absolute right-8 top-6 h-16 w-16 rounded-full blur-sm ${isBreak ? "bg-amber-200" : "bg-yellow-300"}`} />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-700/70 to-emerald-500/40" />

      {kind === "tree" && (
        <svg viewBox="0 0 200 300" className="relative z-10 h-full w-full">
          <rect x={95} y={260 - (40 + grow * 90)} width={10 + grow * 6} height={40 + grow * 90} rx={3} fill="#7c4a1e" className="transition-all duration-700" />
          <circle cx={100} cy={260 - (40 + grow * 90)} r={30 + grow * 70} fill="#16a34a" className="transition-all duration-700" />
          <circle cx={100 - (30 + grow * 70) * 0.45} cy={260 - (40 + grow * 90) + 8} r={(30 + grow * 70) * 0.7} fill="#15803d" className="transition-all duration-700" />
          <circle cx={100 + (30 + grow * 70) * 0.45} cy={260 - (40 + grow * 90) + 8} r={(30 + grow * 70) * 0.7} fill="#22c55e" className="transition-all duration-700" />
          {pct > 80 && (
            <>
              <circle cx={92} cy={260 - (40 + grow * 90) - 5} r={4} fill="#fbbf24" />
              <circle cx={112} cy={260 - (40 + grow * 90) + 6} r={4} fill="#f59e0b" />
              <circle cx={100} cy={260 - (40 + grow * 90) - 18} r={4} fill="#fbbf24" />
            </>
          )}
        </svg>
      )}

      {kind === "flower" && (
        <svg viewBox="0 0 200 300" className="relative z-10 h-full w-full">
          <rect x={97} y={260 - (30 + grow * 140)} width={6} height={30 + grow * 140} fill="#15803d" />
          <ellipse cx={85} cy={260 - (30 + grow * 140) + 30} rx={12} ry={5} fill="#22c55e" transform={`rotate(-30 85 ${260 - (30 + grow * 140) + 30})`} />
          <ellipse cx={115} cy={260 - (30 + grow * 140) + 60} rx={12} ry={5} fill="#22c55e" transform={`rotate(30 115 ${260 - (30 + grow * 140) + 60})`} />
          {pct > 25 && (
            <g transform={`translate(100 ${260 - (30 + grow * 140)}) scale(${0.5 + grow})`}>
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} cx={0} cy={-18} rx={10} ry={16} fill="#ec4899" transform={`rotate(${a})`} />
              ))}
              <circle r={9} fill="#fbbf24" />
            </g>
          )}
        </svg>
      )}

      {kind === "rocket" && (
        <svg viewBox="0 0 200 300" className="relative z-10 h-full w-full">
          <g transform={`translate(100 ${260 - grow * 220}) scale(${0.7 + grow * 0.5})`}>
            <path d="M0 -30 Q 15 -10 15 20 L -15 20 Q -15 -10 0 -30 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            <circle cx={0} cy={-5} r={6} fill="#3b82f6" />
            <path d="M-15 20 L -25 40 L -15 35 Z" fill="#ef4444" />
            <path d="M15 20 L 25 40 L 15 35 Z" fill="#ef4444" />
            {phase === "focus" && (
              <path d="M-8 22 Q 0 55 8 22 Z" fill="#f59e0b" opacity={0.9} />
            )}
          </g>
        </svg>
      )}

      <div className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold text-emerald-900 backdrop-blur dark:bg-slate-900/70 dark:text-emerald-200">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function PomodoroRoom() {
  const { user } = useAuthUser();
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>(PRESETS[0]);
  const [visual, setVisual] = useState<(typeof VISUALS)[number]["id"]>("tree");
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secs, setSecs] = useState(PRESETS[0].focus);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("almanara-pomo-count") || "0");
  });
  const beepRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { setSecs(preset.focus); setPhase("focus"); setRunning(false); }, [preset]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSecs((s) => {
        if (s > 1) return s - 1;
        try { beepRef.current?.play().catch(() => {}); } catch { /* */ }
        if (phase === "focus") {
          const next = completed + 1;
          setCompleted(next);
          try { localStorage.setItem("almanara-pomo-count", String(next)); } catch { /* */ }
          // Reward: 10 points per completed focus session
          if (user) {
            supabase.from("points_ledger" as never).insert({
              user_id: user.id, delta: 10, reason: "pomodoro", ref: preset.id,
            } as never).then(({ error }) => {
              if (!error) toast.success("+10 نقطة — أحسنت! 🌟");
            });
          }
          setPhase("break");
          return preset.brk;
        }
        setPhase("focus");
        return preset.focus;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, phase, completed, preset, user]);

  const total = phase === "focus" ? preset.focus : preset.brk;
  const pct = ((total - secs) / total) * 100;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-royal px-4 py-1.5 text-xs font-bold text-gold">
          <Brain className="h-3.5 w-3.5" /> غرفة الدراسة
        </span>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">جلسة التركيز <span className="text-gold">(بومودورو)</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">اختر مدّة الجلسة والشكل الذي ينمو معك — واكسب نقاطًا مع كل جلسة تركيز مكتملة!</p>
      </header>

      {/* Preset & visual pickers */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">المؤقّت:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${preset.id === p.id ? "border-gold bg-gold text-royal-deep shadow-gold" : "border-border hover:border-gold/60"}`}
            >
              {p.label} د
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">الشكل:</span>
          {VISUALS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setVisual(v.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${visual === v.id ? "border-gold bg-gold text-royal-deep shadow-gold" : "border-border hover:border-gold/60"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GrowingVisual pct={phase === "focus" ? pct : 100} phase={phase} kind={visual} />

        <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-gold/30 bg-card p-8 shadow-luxury">
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-bold ${phase === "focus" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
              {phase === "focus" ? <><Brain className="h-3.5 w-3.5" /> جلسة تركيز</> : <><Coffee className="h-3.5 w-3.5" /> استراحة</>}
            </div>
            <div className="mt-4 font-mono text-7xl font-black tabular-nums text-foreground md:text-8xl">{fmt(secs)}</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 text-sm font-bold shadow-gold transition hover:scale-105"
              style={{ color: "var(--royal-deep)" }}
            >
              {running ? <><Pause className="h-4 w-4" /> إيقاف مؤقت</> : <><Play className="h-4 w-4" /> ابدأ</>}
            </button>
            <button
              onClick={() => { setRunning(false); setPhase("focus"); setSecs(preset.focus); }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-bold"
            >
              <RotateCcw className="h-4 w-4" /> إعادة
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold">
            <Trophy className="h-4 w-4 text-gold" />
            <span>جلسات مكتملة: <span className="tabular-nums text-gold">{completed}</span></span>
          </div>

          <div className="w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all duration-500 ${phase === "focus" ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-amber-300 to-amber-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card/50 p-6 text-sm leading-relaxed text-muted-foreground">
        <h3 className="mb-2 font-extrabold text-foreground">كيف تعمل تقنية بومودورو؟</h3>
        <ol className="list-decimal space-y-1 pr-5">
          <li>اختر مؤقّتًا (25/5 للجلسات القصيرة، 30/10 أو 50/10 للدراسة العميقة).</li>
          <li>ركّز بدون مقاطعة حتى ينتهي الوقت.</li>
          <li>خذ استراحة — قف، اشرب ماء، استرح عينيك.</li>
          <li>كل جلسة تركيز = 10 نقاط تُضاف إلى رصيدك في متجر كنز المنارة! 🌟</li>
        </ol>
      </div>

      <audio ref={beepRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" preload="auto" />
    </div>
  );
}
