import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Crown, Send, Calculator, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { FREE_PLAN_FEATURES, PRO_PLAN_FEATURES, calculateProPrice, createSubscriptionRequest, generateWhatsAppUrl } from "../lib/subscriptions";
import { GRADES } from "../lib/curriculum";
import { useAuthUser } from "../lib/use-auth";

export const Route = createFileRoute("/plans")({
  component: PlansPage,
  head: () => ({
    meta: [
      { title: "الخطط والاشتراكات — المنارة المتجددة" },
      { name: "description", content: "اختر خطتك التعليمية في المنارة المتجددة وتمتع بميزات متطورة للتميز الدراسي مع خطة Pro المدفوعة أو الخطط المجانية." }
    ]
  })
});

function PlansPage() {
  const { user } = useAuthUser();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [gradeId, setGradeId] = useState<number>(10);
  const [months, setMonths] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  const totalPrice = calculateProPrice(months);

  const handleProRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("يرجى إدخال الاسم الكامل");
      return;
    }

    try {
      setSubmitting(true);
      // حفظ الطلب كـ Pending في قاعدة البيانات
      await createSubscriptionRequest({
        full_name: fullName,
        grade_id: gradeId,
        months,
        total_price: totalPrice,
        user_id: user?.id || null,
        email: user?.email || null,
      });

      toast.success("تم حفظ طلب الاشتراك بنجاح! جارٍ فتح الواتساب...");

      // تجهيز رابط الواتساب وفتحه
      const gradeName = GRADES.find((g) => g.id === gradeId)?.name || `الصف ${gradeId}`;
      const whatsappUrl = generateWhatsAppUrl({
        fullName,
        gradeName,
        months,
        totalPrice,
      });

      window.open(whatsappUrl, "_blank");
    } catch (err: any) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ الطلب، يجدر المحاولة مجدداً");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-5 md:py-16">
      <div className="text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-extrabold text-gold">
          <Sparkles className="h-4 w-4" /> استثمر في مستقبلك الأكاديمي
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">
          خطط <span className="text-gold">المنارة المتجددة</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          اختر الخطة المناسبة لاحتياجاتك الدراسية وانطلق بقوة نحو التفوق بأحدث أدوات الذكاء الاصطناعي والشروحات المتكاملة.
        </p>
      </div>

      {/* بطاقات الخطط */}
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* الخطة المجانية */}
        <div className="glass relative flex flex-col justify-between rounded-3xl p-6 md:p-8 border border-border/60 transition-smooth hover:border-gold/50">
          <div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-1.5 text-xs font-bold text-secondary-foreground">
                <Zap className="h-4 w-4 text-primary" /> الخطة المجانية
              </div>
              <span className="text-xl font-black">0 $</span>
            </div>

            <h3 className="mt-4 text-2xl font-black">المجانية الأساسية</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              لكل طالب يبحث عن مصادر تعليمية أساسية مجانية ودعم مستمر.
            </p>

            <div className="mt-6 space-y-3">
              {FREE_PLAN_FEATURES.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-foreground/90">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <a
              href="/grades"
              className="block w-full rounded-xl border border-border bg-background py-3 text-center text-sm font-extrabold transition-smooth hover:border-gold hover:text-gold"
            >
              متابعة بالخطة المجانية
            </a>
          </div>
        </div>

        {/* الخطة المدفوعة Pro */}
        <div className="glass relative flex flex-col justify-between rounded-3xl p-6 md:p-8 border-2 border-gold bg-gradient-to-b from-gold/5 via-transparent to-transparent shadow-luxury">
          <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-gold px-4 py-1 text-xs font-extrabold shadow-gold" style={{ color: "var(--royal-deep)" }}>
            الأكثر طلباً وتوصيةً 👑
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-royal px-3.5 py-1.5 text-xs font-bold text-gold">
                <Crown className="h-4 w-4 text-gold" /> خطة Pro الاحترافية
              </div>
              <div className="text-left">
                <span className="text-2xl font-black text-gold">1$</span>
                <span className="text-xs text-muted-foreground"> / 3 شيكل شهرياً</span>
              </div>
            </div>

            <h3 className="mt-4 text-2xl font-black">المنارة Pro</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              تجربة تعليمية متكاملة بلا حدود مع ميزات ذكاء اصطناعي وأولوية قصوى.
            </p>

            <div className="mt-6 space-y-3">
              {PRO_PLAN_FEATURES.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 rounded-full bg-gold/20 p-1 text-gold">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-foreground">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* نموذج طلب الاشتراك عبر الواتساب */}
          <div className="mt-8 rounded-2xl bg-royal-deep/5 p-4 border border-gold/30">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-gold">
              <Calculator className="h-4 w-4" /> حاسبة وطلب الاشتراك السريع
            </div>

            <form onSubmit={handleProRequest} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold">الصف الدراسي</label>
                  <select
                    value={gradeId}
                    onChange={(e) => setGradeId(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:border-gold focus:outline-none"
                  >
                    {GRADES.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold">مدة الاشتراك</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:border-gold focus:outline-none"
                  >
                    <option value={1}>شهر واحد (3 شيكل)</option>
                    <option value={3}>3 أشهر (9 شيكل)</option>
                    <option value={6}>6 أشهر (18 شيكل)</option>
                    <option value={12}>سنة كاملة (36 شيكل)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gold/10 px-3 py-2 text-sm font-black text-gold">
                <span>التكلفة الإجمالية:</span>
                <span>{totalPrice} شيكل ($ {Number((totalPrice / 3).toFixed(2))})</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-sm font-extrabold shadow-gold transition-transform hover:scale-[1.02] disabled:opacity-50"
                style={{ color: "var(--royal-deep)" }}
              >
                <Send className="h-4 w-4" /> {submitting ? "جاري الحفظ..." : "متابعة واشتراك عبر الواتساب"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <ShieldCheck className="h-4 w-4 text-gold" /> جميع المدفوعات تتم بكل أمان وموثوقية عبر التواصل المباشر وتأكيد المشرفين.
      </div>
    </div>
  );
}