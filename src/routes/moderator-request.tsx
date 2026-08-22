import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldQuestion, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/moderator-request")({
  component: ModRequestPage,
  head: () => ({ meta: [{ title: "انضم إلى الفريق — المنارة" }] }),
});

function ModRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", goal: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.goal.trim()) {
      toast.error("يرجى تعبئة جميع الحقول");
      return;
    }
    if (form.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف فأكثر");
      return;
    }
    setBusy(true);
    try {
      // 1. Sign up the user (auto-confirm is enabled)
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (signErr) throw signErr;

      // 2. Ensure session for RLS
      let userId = signUp.user?.id;
      if (!signUp.session) {
        const { data: signIn, error: siErr } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (siErr) throw siErr;
        userId = signIn.user?.id;
      }
      if (!userId) throw new Error("تعذّر إنشاء الحساب");

      // 3. Insert moderator request
      const { error: insErr } = await supabase.from("moderator_requests").insert({
        full_name: form.name,
        email: form.email,
        goal: form.goal,
        status: "pending",
        user_id: userId,
      });
      if (insErr) throw insErr;

      toast.success("تم إرسال طلبك. سيراجعه المسؤول.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-royal shadow-luxury">
          <ShieldQuestion className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">انضم إلى فريق المنارة</h1>
          <p className="text-sm text-muted-foreground">سجّل بياناتك ليطّلع المسؤول على طلبك.</p>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-gold/30 bg-card p-5 shadow-card">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم الكامل" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="البريد الإلكتروني" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" autoComplete="email" />
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="كلمة المرور (6 أحرف فأكثر)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" autoComplete="new-password" />
        <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={4} placeholder="هدفك من الانضمام: اكتب لماذا تريد أن تكون مشرفًا" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-bold shadow-gold disabled:opacity-60" style={{ color: "var(--royal-deep)" }}>
          <Send className="h-4 w-4" /> {busy ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </button>
        <p className="text-[11px] text-muted-foreground">
          لديك حساب بالفعل؟ <Link to="/login" className="text-primary underline">سجّل الدخول</Link>
        </p>
      </form>
    </div>
  );
}
