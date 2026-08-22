import { Link, useLocation } from "@tanstack/react-router";
import { Lock, LogIn } from "lucide-react";
import { useAuthUser } from "@/lib/use-auth";

export function RequireAuth({ children, title = "هذه الأداة للطلاب المسجّلين" }: { children: React.ReactNode; title?: string }) {
  const { user, loading } = useAuthUser();
  const location = useLocation();

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">جارٍ التحقق من الجلسة...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-5">
        <div className="w-full rounded-3xl border border-gold/40 bg-card p-8 text-center shadow-luxury">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-royal text-gold">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            سجّل دخولك أو أنشئ حسابًا مجانيًا للوصول إلى أدوات المنارة التعليمية.
          </p>
          <Link
            to="/login"
            search={{ redirect: location.pathname } as never}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-sm font-bold shadow-gold transition-smooth hover:scale-[1.02]"
            style={{ color: "var(--royal-deep)" }}
          >
            <LogIn className="h-4 w-4" /> الذهاب لتسجيل الدخول
          </Link>
          <Link to="/" className="mt-3 inline-block text-xs font-bold text-muted-foreground hover:text-primary">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
