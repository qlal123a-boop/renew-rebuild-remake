import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAiWithFallback, parseJsonLoose, AI_ERROR_AR } from "./ai-gateway";

/** ---------- shared types (client-safe) ---------- */

export type PlanFile = { path: string; action: "create" | "update" | "delete"; reason: string };
export type AgentPlan = {
  summary: string;
  steps: string[];
  files: PlanFile[];
  dangerous: boolean;
  dangerReason?: string;
  notes?: string;
};
export type AgentChange = { path: string; action: string; before: string; after: string };
export type AgentOperation = {
  id: string;
  prompt: string;
  status: string;
  plan: AgentPlan;
  changes: AgentChange[];
  dangerous: boolean;
  branch: string | null;
  pr_number: number | null;
  pr_url: string | null;
  checks: { state?: string; runs?: Array<{ name: string; status: string; conclusion: string | null }> };
  error: string | null;
  model: string | null;
  created_at: string;
};

const MAX_FILES = 30;
/** 0 = بلا حد يومي (الافتراضي). */
const DAILY_LIMIT = Number(process.env["AGENT_DAILY_LIMIT"] ?? 0);

/** ---------- helpers ---------- */

async function assertSuperAdmin(ctx: { supabase: { rpc: (n: "is_super_admin") => Promise<{ data: unknown; error: unknown }> } }) {
  const { data, error } = await ctx.supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("غير مصرّح: هذه الأداة للمسؤول الأعلى فقط.");
}

/** Own provider keys (اختيارية) — تُستخدم تلقائيًا عند نفاد رصيد Lovable. */
function customKeys() {
  return {
    geminiKey: process.env["GEMINI_API_KEY"] ?? process.env["VITE_GEMINI_API_KEY"],
    openaiKey: process.env["OPENAI_API_KEY"],
  };
}

/** true when the independent engine (own Gemini key) is available. */
function directMode() {
  return Boolean(process.env["GEMINI_API_KEY"] ?? process.env["VITE_GEMINI_API_KEY"]);
}

function fail(code: keyof typeof AI_ERROR_AR): never {
  throw new Error(AI_ERROR_AR[code]);
}

const PLAN_SYSTEM = `أنت "المبرمج الذكي" لمنصة "المنارة التعليمية": وكيل برمجي خبير في TanStack Start (React 19 + Vite 7) وTailwind v4 وSupabase.
مهمتك في هذه المرحلة: تحليل الطلب وقائمة ملفات المشروع، ثم إرجاع خطة تنفيذ دقيقة.
قواعد:
- لا تخترع ملفات غير موجودة عند التعديل؛ استخدم المسارات كما هي في القائمة.
- الصفحات الجديدة تُنشأ داخل src/routes باسم مسار صحيح، والمكوّنات داخل src/components.
- عند إضافة رابط في القائمة أو الصفحة الرئيسية، أدرج ملفاتها في الخطة أيضًا.
- لا تلمس ملفات الأسرار أو الملفات المولّدة تلقائيًا.
- الحد الأقصى ${MAX_FILES} ملفًا.
أرجع JSON فقط بالشكل:
{"summary":"وصف عربي مختصر","steps":["..."],"files":[{"path":"src/...","action":"create|update|delete","reason":"..."}],"dangerous":false,"dangerReason":"","notes":""}
اعتبر العملية dangerous=true إذا شملت حذف ملفات، أو تعديل ملفات المصادقة/قاعدة البيانات/الجذر (__root.tsx, start.ts, migrations).`;

const CODE_SYSTEM = `أنت "المبرمج الذكي": مبرمج خبير ينفّذ تعديلات حقيقية على مشروع TanStack Start + React 19 + Tailwind v4 + Supabase، بواجهة عربية RTL.
قواعد إلزامية:
- أرجع المحتوى الكامل والنهائي لكل ملف (لا مقاطع، لا "...").
- حافظ على كل الوظائف والنصوص الحالية؛ عدّل فقط ما يلزم للطلب.
- استخدم الرموز الدلالية للألوان من نظام التصميم (bg-card, text-muted-foreground, bg-gradient-royal...) ولا تستخدم ألوانًا مكتوبة صراحة.
- ملفات المسارات تستخدم createFileRoute("/path") مع head() فيه عنوان ووصف فريدين، وتُصدَّر باسم Route.
- استوردات @tanstack/react-router للتوجيه، و@tanstack/react-start لدوال السيرفر.
- النصوص الظاهرة للمستخدم بالعربية الفصحى.
- تعمل على ملف واحد في كل مرة: أرجع محتوى ذلك الملف فقط كاملًا.
أرجع JSON فقط: {"path":"المسار","content":"المحتوى الكامل للملف","summary":"ملخص عربي مختصر"}`;

/** ---------- 1) plan ---------- */

export const agentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prompt: z.string().min(5).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);

    if (DAILY_LIMIT > 0) {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count } = await context.supabase
        .from("agent_operations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      if ((count ?? 0) >= DAILY_LIMIT) {
        throw new Error(`تم بلوغ الحد اليومي للعمليات (${DAILY_LIMIT}). حاول غدًا أو ارفع الحد.`);
      }
    }

    const { repoConfig, listFiles } = await import("./github.server");
    const repo = repoConfig();
    const files = await listFiles(repo);

    const res = await callAiWithFallback(process.env["LOVABLE_API_KEY"], customKeys(), {
      label: "smart-coder-plan",
      preferDirect: directMode(),
      json: true,
      timeoutMs: 90_000,
      messages: [
        { role: "system", content: PLAN_SYSTEM },
        {
          role: "user",
          content: `طلب المدير:\n${data.prompt}\n\nملفات المشروع (${files.length}):\n${files.join("\n")}`,
        },
      ],
    });
    if (!res.ok) fail(res.code);

    const plan = parseJsonLoose<AgentPlan>(res.content);
    if (!plan || !Array.isArray(plan.files) || plan.files.length === 0) fail("empty");

    const { isAllowedPath } = await import("./github.server");
    plan.files = plan.files.filter((f) => f.path && isAllowedPath(f.path)).slice(0, MAX_FILES);
    if (plan.files.length === 0) throw new Error("الخطة لا تتضمّن ملفات يُسمح بتعديلها.");
    const dangerous = Boolean(plan.dangerous) || plan.files.some((f) => f.action === "delete");

    const { data: row, error } = await context.supabase
      .from("agent_operations")
      .insert({
        user_id: context.userId,
        prompt: data.prompt,
        status: "planned",
        plan: plan as never,
        dangerous,
        model: res.model,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as AgentOperation;
  });

/** ---------- 2) execute: generate code, branch, commit, PR ---------- */

export const agentExecute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ operationId: z.string().uuid(), confirmDangerous: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);

    const { data: op, error: opErr } = await context.supabase
      .from("agent_operations")
      .select("*")
      .eq("id", data.operationId)
      .single();
    if (opErr || !op) throw new Error("العملية غير موجودة.");
    if (op.status !== "planned" && op.status !== "failed") throw new Error("تم تنفيذ هذه العملية مسبقًا.");
    if (op.dangerous && !data.confirmDangerous) throw new Error("هذه عملية حسّاسة وتحتاج تأكيدًا صريحًا.");

    const plan = op.plan as unknown as AgentPlan;
    const gh = await import("./github.server");
    const repo = gh.repoConfig();

    await context.supabase.from("agent_operations").update({ status: "running" }).eq("id", op.id);

    try {
      const planned = plan.files.slice(0, MAX_FILES);

      // read current contents of the planned files (shared context, trimmed)
      const current: Record<string, string> = {};
      for (const f of planned) {
        const file = await gh.readFile(repo, f.path);
        if (file) current[f.path] = file.content;
      }

      const changes: AgentChange[] = [];
      const skipped: string[] = [];
      const branch = `smart-coder/${new Date().toISOString().slice(0, 10)}-${op.id.slice(0, 8)}`;
      await gh.createBranch(repo, branch);

      // one AI call per file → no truncation, the whole plan always gets executed
      for (const target of planned) {
        if (!target.path || !gh.isAllowedPath(target.path)) {
          skipped.push(`${target.path} (مسار غير مسموح)`);
          continue;
        }
        const before = current[target.path] ?? (await gh.readFile(repo, target.path))?.content ?? "";

        if (target.action === "delete") {
          if (!op.dangerous || !data.confirmDangerous) {
            skipped.push(`${target.path} (حذف بحاجة تأكيد)`);
            continue;
          }
          await gh.deleteFile(repo, branch, target.path, `chore(المبرمج الذكي): حذف ${target.path}`);
          changes.push({ path: target.path, action: "delete", before, after: "" });
          continue;
        }

        const related = Object.entries(current)
          .filter(([p]) => p !== target.path)
          .map(([p, c]) => `--- ملف مرجعي: ${p} ---\n${c.slice(0, 8_000)}`)
          .join("\n\n");

        let written = false;
        for (let attempt = 1; attempt <= 2 && !written; attempt++) {
          const res = await callAiWithFallback(process.env["LOVABLE_API_KEY"], customKeys(), {
            label: `smart-coder-code:${target.path}`,
            preferDirect: directMode(),
            json: true,
            timeoutMs: 180_000,
            messages: [
              { role: "system", content: CODE_SYSTEM },
              {
                role: "user",
                content: [
                  `طلب المدير:\n${op.prompt}`,
                  `الخطة الكاملة:\n${JSON.stringify(plan, null, 2)}`,
                  `الملف المطلوب الآن: ${target.path} (${target.action})\nسبب التعديل: ${target.reason ?? ""}`,
                  before
                    ? `المحتوى الحالي لهذا الملف:\n${before.slice(0, 40_000)}`
                    : "هذا ملف جديد لا يوجد له محتوى حالي.",
                  related ? `ملفات مرجعية للسياق:\n${related}` : "",
                  `أرجع JSON لهذا الملف وحده فقط.`,
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              },
            ],
          });
          if (!res.ok) continue;

          const out = parseJsonLoose<{ path?: string; content?: string; summary?: string }>(res.content);
          const content = (out?.content ?? "").trim();
          if (!content || content === before.trim()) continue;

          await gh.writeFile(repo, branch, target.path, content, `feat(المبرمج الذكي): تحديث ${target.path}`);
          changes.push({ path: target.path, action: before ? "update" : "create", before, after: content });
          written = true;
        }
        if (!written) skipped.push(`${target.path} (تعذّر توليد محتوى صالح)`);
      }

      if (changes.length === 0) {
        await gh.deleteBranch(repo, branch);
        throw new Error("لم يُنتج المولّد أي تغيير فعلي على الملفات.");
      }

      const body = [
        `### طلب المدير`,
        op.prompt,
        "",
        `### الخطة`,
        ...(plan.steps ?? []).map((s) => `- ${s}`),
        "",
        `### الملفات المعدّلة`,
        ...changes.map((c) => `- \`${c.path}\` (${c.action})`),
        "",
        ...(skipped.length ? [`### ملفات لم تُعدّل`, ...skipped.map((s) => `- ${s}`), ""] : []),
        `_تم إنشاء هذا الطلب بواسطة المبرمج الذكي — عملية ${op.id}_`,
      ].join("\n");

      const pr = await gh.openPullRequest(
        repo,
        branch,
        `المبرمج الذكي: ${(plan.summary || op.prompt).slice(0, 70)}`,
        body,
      );
      const checks = await gh.branchChecks(repo, branch);

      const { data: updated, error: upErr } = await context.supabase
        .from("agent_operations")
        .update({
          status: "pr_open",
          changes: changes as never,
          branch,
          pr_number: pr.number,
          pr_url: pr.html_url,
          checks: checks as never,
          error: null,
        })
        .eq("id", op.id)
        .select("*")
        .single();
      if (upErr) throw new Error(upErr.message);
      return updated as unknown as AgentOperation;
    } catch (e) {
      const message = (e as Error).message?.slice(0, 800) ?? "خطأ غير معروف";
      await context.supabase.from("agent_operations").update({ status: "failed", error: message }).eq("id", op.id);
      throw new Error(message);
    }
  });

/** ---------- 3) refresh CI checks ---------- */

export const agentRefreshChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ operationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { data: op } = await context.supabase
      .from("agent_operations")
      .select("id, branch")
      .eq("id", data.operationId)
      .single();
    if (!op?.branch) throw new Error("لا يوجد فرع لهذه العملية.");
    const gh = await import("./github.server");
    const checks = await gh.branchChecks(gh.repoConfig(), op.branch);
    await context.supabase.from("agent_operations").update({ checks: checks as never }).eq("id", op.id);
    return checks;
  });

/** ---------- 4) rollback ---------- */

export const agentRollback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ operationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { data: op } = await context.supabase
      .from("agent_operations")
      .select("id, branch, pr_number")
      .eq("id", data.operationId)
      .single();
    if (!op) throw new Error("العملية غير موجودة.");
    const gh = await import("./github.server");
    const repo = gh.repoConfig();
    if (op.pr_number) await gh.closePullRequest(repo, op.pr_number).catch(() => undefined);
    if (op.branch) await gh.deleteBranch(repo, op.branch).catch(() => undefined);
    await context.supabase.from("agent_operations").update({ status: "rolled_back" }).eq("id", op.id);
    return { ok: true };
  });

/** ---------- 5) history ---------- */

export const agentHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as never);
    const { data, error } = await context.supabase
      .from("agent_operations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AgentOperation[];
  });

/** ---------- 6) repo/config status ---------- */

export const agentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as never);
    const gh = await import("./github.server");
    const repo = gh.repoConfig();
    const githubReady = Boolean(process.env["GITHUB_API_KEY"]);
    const aiReady = Boolean(process.env["LOVABLE_API_KEY"]);
    let fileCount = 0;
    let repoError: string | null = null;
    if (githubReady) {
      try {
        fileCount = (await gh.listFiles(repo)).length;
      } catch (e) {
        repoError = (e as Error).message.slice(0, 300);
      }
    }
    return {
      repo: `${repo.owner}/${repo.repo}`,
      base: repo.base,
      githubReady,
      aiReady,
      geminiReady: Boolean(process.env["GEMINI_API_KEY"]),
      openaiReady: Boolean(process.env["OPENAI_API_KEY"]),
      fileCount,
      repoError,
      dailyLimit: DAILY_LIMIT,
    };
  });

/** ---------- 7) تطبيق تعديل ملف واحد مباشرة ---------- */

export const agentApplyFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        operationId: z.string().uuid(),
        path: z.string().min(3).max(300),
        content: z.string().min(1).max(400_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);

    const { data: op } = await context.supabase
      .from("agent_operations")
      .select("id, branch, changes")
      .eq("id", data.operationId)
      .single();
    if (!op) throw new Error("العملية غير موجودة.");

    const gh = await import("./github.server");
    const repo = gh.repoConfig();
    if (!gh.isAllowedPath(data.path)) throw new Error(`مسار غير مسموح: ${data.path}`);

    const branch = op.branch ?? `smart-coder/manual-${op.id.slice(0, 8)}`;
    if (!op.branch) await gh.createBranch(repo, branch);

    const before = (await gh.readFile(repo, data.path, branch))?.content ?? "";
    if (before.trim() === data.content.trim()) throw new Error("لا يوجد تغيير على هذا الملف.");

    await gh.writeFile(repo, branch, data.path, data.content, `feat(المبرمج الذكي): تطبيق ${data.path}`);

    const changes = ((op.changes as unknown as AgentChange[]) ?? []).filter((c) => c.path !== data.path);
    changes.push({ path: data.path, action: before ? "update" : "create", before, after: data.content });
    await context.supabase
      .from("agent_operations")
      .update({ branch, changes: changes as never })
      .eq("id", op.id);

    return { ok: true, path: data.path, branch };
  });
