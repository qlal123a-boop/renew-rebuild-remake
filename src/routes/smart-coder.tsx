import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  Check,
  ClipboardCopy,
  ExternalLink,
  FileCode2,
  GitPullRequest,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useAuthUser } from "@/lib/use-auth";
import { DiffView } from "@/components/diff-view";
import {
  agentApplyFile,
  agentExecute,
  agentHistory,
  agentPlan,
  agentRefreshChecks,
  agentRollback,
  agentStatus,
  type AgentOperation,
} from "@/lib/smart-coder.functions";

export const Route = createFileRoute("/smart-coder")({
  component: SmartCoderPage,
  head: () => ({
    meta: [
      { title: "المبرمج الذكي — لوحة تحكم المنارة التعليمية" },
      { name: "description", content: "وكيل برمجي ذكي ينفّذ تعديلات حقيقية على ملفات منصة المنارة التعليمية عبر خطة ومراجعة Pull Request." },
      { property: "og:title", content: "المبرمج الذكي — المنارة التعليمية" },
      { property: "og:description", content: "اكتب أمرك بالعربية، وسينفّذ المبرمج الذكي التعديل البرمجي مع خطة وفروقات ومراجعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const STATUS_AR: Record<string, string> = {
  planned: "خطة جاهزة",
  running: "قيد التنفيذ",
  pr_open: "طلب دمج مفتوح",
  failed: "فشلت",
  rolled_back: "تم التراجع",
};

const EXAMPLES = [
  "أضف في الصفحة الرئيسية قسمًا بعنوان مولد الفيديوهات الذكي مع بطاقة احترافية وزر دخول، وأنشئ صفحته واربطها بالقائمة.",
  "غيّر لون زر تسجيل الدخول إلى الأزرق واجعله أكثر احترافية.",
  "أضف ميزة تسمح للمستخدم باختيار الصف والمادة والدرس.",
];

function SmartCoderPage() {
  const { user, loading, isSuperAdmin } = useAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-2xl font-extrabold">غير مصرّح</h1>
        <p className="mt-2 text-sm text-muted-foreground">المبرمج الذكي متاح للمسؤول الأعلى فقط.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-gradient-royal px-5 py-2.5 text-sm font-bold text-gold">العودة</Link>
      </div>
    );
  }
  return <SmartCoder />;
}

function SmartCoder() {
  const plan = useServerFn(agentPlan);
  const execute = useServerFn(agentExecute);
  const history = useServerFn(agentHistory);
  const status = useServerFn(agentStatus);
  const refresh = useServerFn(agentRefreshChecks);
  const rollback = useServerFn(agentRollback);
  const applyFile = useServerFn(agentApplyFile);

  const [prompt, setPrompt] = useState("");
  const [current, setCurrent] = useState<AgentOperation | null>(null);
  const [ops, setOps] = useState<AgentOperation[]>([]);
  const [info, setInfo] = useState<Awaited<ReturnType<typeof agentStatus>> | null>(null);
  const [busy, setBusy] = useState<"" | "plan" | "exec" | "checks" | "rollback">("");
  const [confirmDanger, setConfirmDanger] = useState(false);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  async function onCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ الكود.");
    } catch {
      toast.error("تعذّر النسخ من المتصفح.");
    }
  }

  async function onApplyFile(path: string, content: string) {
    if (!current) return;
    setApplying(path);
    try {
      const r = await applyFile({ data: { operationId: current.id, path, content } });
      toast.success(`تم تطبيق التعديل على ${r.path}`);
      void loadHistory();
    } catch (e) {
      toast.error((e as Error).message || "فشل تطبيق التعديل على الملف.");
    } finally {
      setApplying(null);
    }
  }

  const loadHistory = useCallback(async () => {
    try {
      setOps(await history({ data: undefined as never }));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  useEffect(() => {
    status({ data: undefined as never }).then(setInfo).catch(() => undefined);
    void loadHistory();
  }, [status, loadHistory]);

  async function onPlan() {
    if (prompt.trim().length < 5) return toast.error("اكتب أمرًا واضحًا أولًا.");
    setBusy("plan");
    setCurrent(null);
    setConfirmDanger(false);
    try {
      const op = await plan({ data: { prompt: prompt.trim() } });
      setCurrent(op);
      toast.success("تم تحليل المشروع وإعداد الخطة.");
      void loadHistory();
    } catch (e) {
      toast.error((e as Error).message || "تعذر إعداد الخطة.");
    } finally {
      setBusy("");
    }
  }

  async function onExecute() {
    if (!current) return;
    if (current.dangerous && !confirmDanger) return toast.error("أكّد العملية الحسّاسة أولًا.");
    setBusy("exec");
    try {
      const op = await execute({ data: { operationId: current.id, confirmDangerous: confirmDanger } });
      setCurrent(op);
      toast.success("تم تنفيذ التغييرات وفتح طلب الدمج للمراجعة.");
      void loadHistory();
    } catch (e) {
      toast.error((e as Error).message || "فشل التنفيذ.");
      void loadHistory();
    } finally {
      setBusy("");
    }
  }

  async function onChecks() {
    if (!current) return;
    setBusy("checks");
    try {
      const checks = await refresh({ data: { operationId: current.id } });
      setCurrent({ ...current, checks });
      toast.success("تم تحديث نتائج الفحص.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function onRollback(id: string) {
    setBusy("rollback");
    try {
      await rollback({ data: { operationId: id } });
      toast.success("تم التراجع عن العملية.");
      if (current?.id === id) setCurrent({ ...current, status: "rolled_back" });
      void loadHistory();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">
            <Bot className="h-7 w-7 text-gold" /> المبرمج الذكي
          </h1>
          <p className="text-sm text-muted-foreground">
            اكتب أمرك بالعربية، ويقوم الوكيل بتحليل المشروع وتعديل الملفات فعليًا ثم فتح طلب دمج للمراجعة.
          </p>
        </div>
        <Link to="/admin" className="rounded-xl bg-gradient-royal px-4 py-2 text-sm font-bold text-gold">
          لوحة الإدارة
        </Link>
      </header>

      {info && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Stat label="المستودع" value={info.repo} />
          <Stat label="الفرع الأساسي" value={info.base} />
          <Stat label="ملفات المشروع" value={info.fileCount ? String(info.fileCount) : "—"} />
          <Stat label="الحد اليومي" value={info.dailyLimit > 0 ? `${info.dailyLimit} عملية` : "بلا حد"} />
        </div>
      )}

      {info && (!info.githubReady || !info.aiReady || info.repoError) && (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            {!info.githubReady && <p>ربط GitHub غير مُهيّأ.</p>}
            {!info.aiReady && <p>خدمة الذكاء الاصطناعي غير مُهيّأة.</p>}
            {info.repoError && <p>تعذّر قراءة المستودع: {info.repoError}</p>}
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-gold/30 bg-card p-5 shadow-card">
        <label className="text-sm font-bold">الأمر البرمجي</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="مثال: أضف صفحة مولد الفيديوهات الذكي واربطها بالقائمة الرئيسية مع بطاقة في الصفحة الرئيسية."
          className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-gold"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((x) => (
            <button
              key={x}
              onClick={() => setPrompt(x)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-gold hover:text-foreground"
            >
              {x.slice(0, 42)}…
            </button>
          ))}
        </div>
        <button
          onClick={onPlan}
          disabled={busy !== ""}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold transition-smooth hover:scale-[1.02] disabled:opacity-60"
          style={{ color: "var(--royal-deep)" }}
        >
          {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          تحليل المشروع وإعداد الخطة
        </button>
      </section>

      {current && (
        <section className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">الخطة المقترحة</h2>
            <span className="rounded-lg border border-border px-3 py-1 text-xs font-bold">
              {STATUS_AR[current.status] ?? current.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{current.plan?.summary}</p>

          {current.plan?.steps?.length > 0 && (
            <ol className="list-decimal space-y-1 pr-5 text-sm">
              {current.plan.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-bold"><FileCode2 className="h-4 w-4 text-gold" /> الملفات المتأثرة</h3>
            {current.plan?.files?.map((f) => (
              <div key={f.path} className="rounded-xl border border-border bg-background p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <code dir="ltr">{f.path}</code>
                  <span className="rounded bg-muted px-2 py-0.5 font-bold">{f.action}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{f.reason}</p>
              </div>
            ))}
          </div>

          {current.dangerous && current.status === "planned" && (
            <label className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <input type="checkbox" checked={confirmDanger} onChange={(e) => setConfirmDanger(e.target.checked)} className="mt-1" />
              <span>
                عملية حسّاسة{current.plan?.dangerReason ? `: ${current.plan.dangerReason}` : " (حذف ملفات أو تعديل ملفات جوهرية)"} — أؤكّد التنفيذ.
              </span>
            </label>
          )}

          {(current.status === "planned" || current.status === "failed") && (
            <button
              onClick={onExecute}
              disabled={busy !== ""}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-5 py-2.5 text-sm font-bold text-gold disabled:opacity-60"
            >
              {busy === "exec" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              تنفيذ التغييرات وفتح طلب دمج
            </button>
          )}

          {current.error && <p className="text-sm text-destructive">{current.error}</p>}

          {current.changes?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold">الفروقات</h3>
              {current.changes.map((c) => (
                <div key={c.path} className="rounded-xl border border-border">
                  <button
                    onClick={() => setOpenFile(openFile === c.path ? null : c.path)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-bold"
                  >
                    <code dir="ltr">{c.path}</code>
                    <span className="text-muted-foreground">{c.action}</span>
                  </button>
                  {openFile === c.path && (
                    <div className="p-3 pt-0">
                      <DiffView before={c.before} after={c.after} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {current.pr_url && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-background p-3 text-sm">
              <GitPullRequest className="h-4 w-4 text-gold" />
              <a href={current.pr_url} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
                طلب الدمج #{current.pr_number} <ExternalLink className="inline h-3 w-3" />
              </a>
              <span className="text-muted-foreground">الفحص: {current.checks?.state ?? "—"}</span>
              <button onClick={onChecks} disabled={busy !== ""} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold">
                {busy === "checks" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} تحديث الفحص
              </button>
              <button onClick={() => onRollback(current.id)} disabled={busy !== ""} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-destructive hover:text-destructive">
                <RotateCcw className="h-3 w-3" /> تراجع
              </button>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">سجل العمليات</h2>
        {ops.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا عمليات بعد.</p>
        ) : (
          <div className="space-y-2">
            {ops.map((o) => (
              <button
                key={o.id}
                onClick={() => { setCurrent(o); setConfirmDanger(false); }}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-right text-sm hover:border-gold"
              >
                <span className="line-clamp-1 flex-1 font-bold">{o.prompt}</span>
                <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar-EG")}</span>
                <span className="rounded-lg border border-border px-2 py-0.5 text-xs font-bold">{STATUS_AR[o.status] ?? o.status}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold" dir="auto">{value}</p>
    </div>
  );
}
