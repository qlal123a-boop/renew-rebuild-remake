import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, signOut, SUPER_ADMIN_EMAIL } from "@/lib/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — المنارة" },
      { name: "description", content: "تسجيل دخول الإدارة والمشرفين." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function LoginPage() {
  const { user, isSuperAdmin } = useAuthUser();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-5">
        <div className="w-full rounded-3xl border border-gold/40 bg-card p-8 shadow-luxury text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-gold" style={{ color: "var(--royal-deep)" }}>
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">مرحبًا، {user.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin ? "أنت المسؤول الأعلى — لديك صلاحية كاملة." : "تم تسجيل الدخول بنجاح."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => navigate({ to: "/admin-panel" })}
                className="rounded-xl bg-gradient-royal py-3 text-sm font-bold text-gold"
              >
                الذهاب إلى لوحة التحكم
              </button>
            )}
            <Link to="/" className="rounded-xl border border-border py-3 text-sm font-bold hover:border-gold">العودة للرئيسية</Link>
            <button onClick={async () => { await signOut(); toast.success("تم تسجيل الخروج"); }} className="rounded-xl border border-border py-3 text-sm font-bold hover:border-destructive hover:text-destructive">
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  const arabize = (m: string): string => {
    const s = m.toLowerCase();
    if (s.includes("invalid login")) return "البريد أو كلمة المرور غير صحيحة. تأكّد منها أو أنشئ حسابًا جديدًا.";
    if (s.includes("email not confirmed")) return "لم تؤكّد بريدك بعد. افتح صندوق الوارد واضغط رابط التفعيل ثم سجّل الدخول.";
    if (s.includes("user already registered")) return "هذا البريد مسجَّل مسبقًا. سجّل الدخول مباشرة.";
    if (s.includes("password should be")) return "كلمة المرور قصيرة — استخدم 8 أحرف فأكثر.";
    if (s.includes("rate limit")) return "محاولات كثيرة — انتظر دقيقة ثم حاول مجددًا.";
    if (s.includes("invalid email")) return "صيغة البريد الإلكتروني غير صحيحة.";
    if (s.includes("network")) return "تعذّر الاتصال بالخادم — تحقّق من الإنترنت.";
    return "حدث خطأ. حاول مرة أخرى.";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(cleanEmail)) return toast.error("صيغة البريد الإلكتروني غير صحيحة");
    if (password.length < 6) return toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (mode === "signup" && password.length < 8) return toast.error("لإنشاء حساب: كلمة المرور 8 أحرف فأكثر");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح 🎉");
        if (cleanEmail === SUPER_ADMIN_EMAIL) navigate({ to: "/admin-panel" });
        else navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب — أرسلنا رابط تفعيل إلى بريدك. افتح بريدك الإلكتروني واضغط الرابط ثم عُد لتسجيل الدخول.", { duration: 9000 });
        setMode("signin");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(arabize(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-5 py-10">
      <form onSubmit={submit} className="w-full rounded-3xl border border-gold/40 bg-card p-8 shadow-luxury">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-royal text-gold">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold">
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "ادخل ببريدك الإلكتروني وكلمة المرور" : "للمسؤول الأعلى أو لإنشاء حساب طالب"}
        </p>

        <div className="mt-5 inline-flex w-full rounded-xl border border-border bg-secondary p-1">
          <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded-lg py-2 text-xs font-bold ${mode === "signin" ? "bg-gradient-royal text-gold" : "text-muted-foreground"}`}>دخول</button>
          <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-lg py-2 text-xs font-bold ${mode === "signup" ? "bg-gradient-royal text-gold" : "text-muted-foreground"}`}>إنشاء حساب</button>
        </div>

        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" autoComplete="email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" autoComplete={mode === "signin" ? "current-password" : "new-password"} />

        <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-sm font-bold shadow-gold transition-smooth hover:scale-[1.02] disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
          {mode === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {busy ? "..." : mode === "signin" ? "دخول" : "إنشاء"}
        </button>

        {mode === "signup" && (
          <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <div className="mb-1 font-extrabold text-gold">خطوات إنشاء الحساب:</div>
            <ol className="list-decimal space-y-0.5 pe-4">
              <li>اكتب بريدك الإلكتروني وكلمة مرور (8 أحرف فأكثر).</li>
              <li>اضغط «إنشاء».</li>
              <li>افتح بريدك واضغط على رابط التفعيل (قد يصل خلال ثوانٍ).</li>
              <li>ارجع إلى هنا وسجّل الدخول لتستخدم جميع الأقسام.</li>
            </ol>
          </div>
        )}

        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          تريد الانضمام كمشرف؟ <Link to="/moderator-request" className="font-bold text-primary underline">قدّم طلبك هنا</Link>
        </div>
      </form>
    </div>
  );
}
